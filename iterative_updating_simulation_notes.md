# Iterative Updating Computational Interpretation

Primary source: `Iterative Updating.pdf`

Earlier source: `icSSC Paper.pdf`

## What Changed From The Earlier icSSC Prototype

The updated model keeps SSC/icSSC, but makes them subordinate to a broader iterative updating architecture.

The most important new implementation requirements are:

- Working memory has at least two computational stores.
- The focus of attention (FoA) is small, highly active, and sustained for seconds.
- The short-term store (STM) is larger, less focal, and maintained through slower synaptic potentiation-like persistence.
- Items evicted from the FoA can remain in STM and later reenter the FoA.
- The rate of updating can vary from partial replacement to a complete attention jump.
- Search is multiassociative: all coactive contents combine activation to select the next update.

## Core Mapping

| Paper term | Simulation term |
| --- | --- |
| item / representation / ensemble | `Node` |
| focus of attention (FoA) | `simulation.foa` |
| short-term store | `simulation.stm` |
| sustained firing | FoA persistence |
| synaptic potentiation | slower STM persistence |
| coactive | items in the same store at one time step |
| cospreading | FoA and STM items jointly spreading activation |
| multiassociative search | weighted search from all active stores |
| state-spanning coactivity (SSC) | FoA items shared by consecutive states |
| iterative updating | partial FoA replacement with preserved overlap |
| rate of updating | proportion of previous FoA items replaced |
| attention jump | 100% FoA replacement after high-salience input |

## Current Update Rule

Each step:

1. FoA and STM items spread activation through weighted graph links.
2. STM contributes less than FoA but decays more slowly.
3. Sensory inputs inject activation and can recruit immediate associations.
4. A variable number of FoA slots are opened.
5. The most persistent/relevant FoA items are retained.
6. Top-ranked search results fill opened FoA slots.
7. Evicted FoA items are demoted into STM.
8. STM decays slowly and is capacity-limited.
9. The transition is scored for SSC, continuity, update rate, iterative updating, and attention jumps.

## Near-Term Design Questions

- Should the FoA capacity stay near Cowan's four items, or should it vary dynamically?
- Should STM contain previous individual items only, or also snapshots of whole iterative threads?
- Should dopamine reduce update rate by sustaining prioritized items, increase input salience, or both?
- Should learned weights be updated Hebbian-style when items remain coactive?
- Should modules be explicit stores for visual, verbal, motor, episodic, and procedural content?
