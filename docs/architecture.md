# Architecture Notes

The project now separates the model into three layers:

1. `src/core/architecture.js`
   The reusable cognitive engine. It owns the FoA, STM, update policy, spreading activation, continuity metrics, and thread trace.

2. `src/demos/scenarios.js`
   Demonstration worlds. A scenario defines nodes, weighted associations, seed contents, and event buttons.

3. `src/ui/app.js`
   Browser rendering and interaction. The UI reads the engine state but does not decide the model dynamics.

## First Cognitive Architecture Milestone

The immediate target is an inspectable loop:

```text
seed FoA -> cospread FoA/STM -> select update -> demote evictions -> preserve thread -> repeat
```

The first richer demo is `Subproblem Merge`, which approximates the paper's claim that the FoA can work one line of reasoning, suspend partial progress in STM, switch to a related subproblem, and then merge selected subsolutions into a new state.

## Next Mechanics To Add

- Hebbian strengthening between coactive FoA/STM items.
- Saved thread snapshots that can be resumed from the beginning, midpoint, or endpoint.
- Forking of a prior thread into an alternate branch.
- Explicit module contributors: semantic, episodic, procedural, sensory, motor.
- A tiny language interface that translates text prompts into node activations.
