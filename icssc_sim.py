from __future__ import annotations

from dataclasses import dataclass, field
import random
from typing import Iterable


@dataclass(frozen=True)
class Node:
    name: str
    modality: str = "abstract"
    persistence: float = 0.5
    salience: float = 0.5


@dataclass
class ThoughtState:
    t: int
    foa: tuple[str, ...]
    stm: tuple[str, ...]
    newly_active: tuple[str, ...]
    evicted_to_stm: tuple[str, ...]
    deactivated: tuple[str, ...]
    ssc: tuple[str, ...]
    continuity: float
    update_rate: float
    iterative_update: bool
    attention_jump: bool


@dataclass
class IterativeUpdatingSimulation:
    """Toy model of FoA/STM iterative updating from Reser's updated paper."""

    foa_capacity: int = 4
    stm_capacity: int = 9
    activation_threshold: float = 0.32
    foa_decay: float = 0.24
    stm_decay: float = 0.08
    dopamine_gate: float = 0.55
    noise: float = 0.03
    rng: random.Random = field(default_factory=random.Random)

    def __post_init__(self) -> None:
        self.nodes: dict[str, Node] = {}
        self.weights: dict[str, dict[str, float]] = {}
        self.foa: dict[str, float] = {}
        self.stm: dict[str, float] = {}
        self.t = 0

    def add_node(
        self,
        name: str,
        modality: str = "abstract",
        persistence: float = 0.5,
        salience: float = 0.5,
    ) -> None:
        self.nodes[name] = Node(name, modality, persistence, salience)
        self.weights.setdefault(name, {})

    def connect(self, a: str, b: str, weight: float) -> None:
        self._require(a, b)
        self.weights.setdefault(a, {})[b] = weight
        self.weights.setdefault(b, {})[a] = weight

    def seed(self, names: Iterable[str], strength: float = 1.0) -> None:
        for name in names:
            self._require(name)
            self.foa[name] = max(self.foa.get(name, 0.0), strength)

    def step(
        self,
        sensory_input: dict[str, float] | None = None,
        update_slots: int | None = None,
    ) -> ThoughtState:
        sensory_input = sensory_input or {}
        previous_foa = set(self.foa)
        previous_stm = set(self.stm)
        slots = self._choose_update_slots(sensory_input, update_slots)
        jump_requested = slots >= self.foa_capacity

        search = self._spread_activation(sensory_input)
        if jump_requested:
            for name in previous_foa - set(sensory_input):
                search.pop(name, None)
        keepers = self._select_keepers(slots)
        ranked_updates = [
            name
            for name, _ in sorted(search.items(), key=lambda item: item[1], reverse=True)
            if name not in keepers
        ]

        next_foa: dict[str, float] = dict(keepers)
        for name in ranked_updates:
            if len(next_foa) >= self.foa_capacity:
                break
            next_foa[name] = min(search[name], 1.0)

        evicted = previous_foa - set(next_foa)
        self._update_stm(evicted, next_foa)
        self.foa = next_foa

        current_foa = set(self.foa)
        ssc = tuple(sorted(previous_foa & current_foa))
        newly_active = tuple(sorted(current_foa - previous_foa))
        deactivated = tuple(sorted((previous_foa | previous_stm) - (current_foa | set(self.stm))))
        update_rate = len(previous_foa - current_foa) / max(1, len(previous_foa))
        continuity = len(ssc) / max(1, len(previous_foa | current_foa))
        attention_jump = update_rate >= 1.0
        iterative_update = len(ssc) >= 2 and bool(newly_active) and not attention_jump

        state = ThoughtState(
            t=self.t,
            foa=tuple(self.foa),
            stm=tuple(self.stm),
            newly_active=newly_active,
            evicted_to_stm=tuple(sorted(evicted & set(self.stm))),
            deactivated=deactivated,
            ssc=ssc,
            continuity=continuity,
            update_rate=update_rate,
            iterative_update=iterative_update,
            attention_jump=attention_jump,
        )
        self.t += 1
        return state

    def _spread_activation(self, sensory_input: dict[str, float]) -> dict[str, float]:
        candidates: dict[str, float] = {}
        sources = [(self.foa, 1.0), (self.stm, 0.38)]

        for store, store_weight in sources:
            for name, strength in store.items():
                node = self.nodes[name]
                sustained = strength * (1.0 - self.foa_decay) * node.persistence * store_weight
                candidates[name] = candidates.get(name, 0.0) + sustained
                for target, weight in self.weights.get(name, {}).items():
                    candidates[target] = candidates.get(target, 0.0) + strength * weight * store_weight

        for name, strength in sensory_input.items():
            self._require(name)
            node = self.nodes[name]
            candidates[name] = candidates.get(name, 0.0) + strength * (1.0 + node.salience * self.dopamine_gate)
            for target, weight in self.weights.get(name, {}).items():
                if weight > 0:
                    candidates[target] = candidates.get(target, 0.0) + strength * weight * 0.8

        for name in list(candidates):
            candidates[name] += self.rng.uniform(-self.noise, self.noise)
            if candidates[name] < self.activation_threshold:
                del candidates[name]
        return candidates

    def _choose_update_slots(self, sensory_input: dict[str, float], update_slots: int | None) -> int:
        if update_slots is not None:
            return max(0, min(self.foa_capacity, update_slots))
        if any(value > 0.8 and self.nodes[name].salience > 0.85 for name, value in sensory_input.items()):
            return self.foa_capacity
        return 1

    def _select_keepers(self, update_slots: int) -> dict[str, float]:
        keep_count = max(0, self.foa_capacity - update_slots)
        ranked = sorted(
            self.foa.items(),
            key=lambda item: (
                item[1] * self.nodes[item[0]].persistence,
                self.nodes[item[0]].salience,
            ),
            reverse=True,
        )
        return {name: strength for name, strength in ranked[:keep_count]}

    def _update_stm(self, evicted: set[str], next_foa: dict[str, float]) -> None:
        for name in list(self.stm):
            node = self.nodes[name]
            self.stm[name] *= 1.0 - self.stm_decay * (1.1 - node.persistence)
            if self.stm[name] < 0.12:
                del self.stm[name]

        for name in evicted:
            self.stm[name] = max(self.stm.get(name, 0.0), 0.72)
        for name, strength in next_foa.items():
            self.stm[name] = max(self.stm.get(name, 0.0), strength * 0.42)

        ranked = sorted(self.stm.items(), key=lambda item: item[1], reverse=True)
        self.stm = dict(ranked[: self.stm_capacity])

    def _require(self, *names: str) -> None:
        missing = [name for name in names if name not in self.nodes]
        if missing:
            raise KeyError(f"Unknown node(s): {', '.join(missing)}")


ICSSCSimulation = IterativeUpdatingSimulation


def build_demo() -> IterativeUpdatingSimulation:
    sim = IterativeUpdatingSimulation(rng=random.Random(7))
    for name, modality, persistence, salience in [
        ("self", "abstract", 0.95, 0.75),
        ("goal", "abstract", 0.9, 0.9),
        ("paper", "visual", 0.6, 0.45),
        ("model", "abstract", 0.75, 0.7),
        ("continuity", "abstract", 0.8, 0.65),
        ("memory", "abstract", 0.75, 0.6),
        ("prediction", "abstract", 0.65, 0.55),
        ("simulation", "abstract", 0.65, 0.8),
        ("code", "motor", 0.55, 0.7),
        ("red_light", "sensory", 0.4, 0.95),
        ("brake", "motor", 0.55, 0.9),
    ]:
        sim.add_node(name, modality, persistence, salience)

    edges = {
        ("self", "goal"): 0.28,
        ("goal", "model"): 0.34,
        ("goal", "simulation"): 0.3,
        ("paper", "model"): 0.35,
        ("paper", "memory"): 0.21,
        ("model", "continuity"): 0.39,
        ("model", "prediction"): 0.26,
        ("continuity", "memory"): 0.32,
        ("continuity", "prediction"): 0.27,
        ("simulation", "code"): 0.37,
        ("simulation", "prediction"): 0.31,
        ("code", "goal"): 0.19,
        ("red_light", "brake"): 0.65,
        ("red_light", "goal"): -0.25,
    }
    for (a, b), weight in edges.items():
        sim.connect(a, b, weight)

    sim.seed(["self", "goal", "paper", "model"], strength=0.72)
    return sim


def main() -> None:
    sim = build_demo()
    inputs = [
        ({}, None),
        ({"continuity": 0.45}, 1),
        ({"memory": 0.35}, 1),
        ({"simulation": 0.48}, 1),
        ({"code": 0.42}, 1),
        ({"red_light": 0.92}, None),
        ({"goal": 0.45, "simulation": 0.35}, 2),
        ({"prediction": 0.36}, 1),
    ]
    print("t | FoA | STM | SSC | new | evicted->STM | update | iterative | jump")
    print("--|-----|-----|-----|-----|--------------|--------|-----------|-----")
    for sensory_input, update_slots in inputs:
        state = sim.step(sensory_input, update_slots=update_slots)
        print(
            f"{state.t} | {', '.join(state.foa)} | "
            f"{', '.join(state.stm) or '-'} | "
            f"{', '.join(state.ssc) or '-'} | "
            f"{', '.join(state.newly_active) or '-'} | "
            f"{', '.join(state.evicted_to_stm) or '-'} | "
            f"{state.update_rate:.0%} | {state.iterative_update} | {state.attention_jump}"
        )


if __name__ == "__main__":
    main()
