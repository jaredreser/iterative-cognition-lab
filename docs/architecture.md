# Architecture Notes

The project now separates the model into three layers:

1. `src/core/architecture.js`
   The reusable cognitive engine. It owns the FoA, STM, update policy, spreading activation, continuity metrics, thread trace, Hebbian learning, and saved thread memory.

2. `src/demos/scenarios.js`
   Demonstration worlds. A scenario defines nodes, weighted associations, seed contents, and event buttons.

3. `src/ui/app.js`
   Browser rendering and interaction. The UI reads the engine state but does not decide the model dynamics.

## First Cognitive Architecture Milestone

The current loop is:

```text
seed FoA -> cospread FoA/STM -> select update -> demote evictions -> learn from coactivity -> preserve thread -> repeat
```

The first richer demo is `Subproblem Merge`, which approximates the paper's claim that the FoA can work one line of reasoning, suspend partial progress in STM, switch to a related subproblem, and then merge selected subsolutions into a new state.

## Added Cognitive Primitives

### Hebbian Learning

After every step, the engine strengthens pairwise weights between items coactive in the FoA. Jump states learn more weakly than ordinary iterative states.

### Thread Memory

The UI can save the current thread trace. A saved thread stores:

- current FoA
- current STM
- recent trace of FoA states

The app can then resume the endpoint or fork from the midpoint of the latest saved thread.

## Next Mechanics To Add

- Show learned edge weights in the UI.
- Add named thread selection instead of latest-only resume.
- Add explicit module contributors: semantic, episodic, procedural, sensory, motor.
- Add a tiny language interface that translates text prompts into node activations.
