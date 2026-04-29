# Iterative Cognition Lab

An experimental cognitive architecture playground based on Jared Reser's iterative updating model of working memory, thought, and machine consciousness.

This repository starts with a small simulator and interactive browser demo. The long-term goal is to grow it into an inspectable cognitive architecture built around focus of attention, short-term memory, multiassociative search, iterative updating, attention jumps, thread resumption, branching, and subsolution merging.

## Current Prototype

The prototype treats thought as a discrete-time iterative updating process over a weighted associative graph:

- `Node`: a cortical assembly or ensemble with modality, persistence, and salience.
- `foa`: the small focus of attention maintained by sustained-firing-like persistence.
- `stm`: the larger short-term store maintained by slower synaptic-potentiation-like persistence.
- `SSC`: FoA items conserved from the previous state.
- `iterative_update`: partial FoA replacement with preserved overlap.
- `update_rate`: the proportion of FoA items replaced at a step.
- `attention_jump`: full FoA replacement after high-salience input.

## Run The Python Simulator

```powershell
python .\icssc_sim.py
```

If Python is not on your PATH, run it with your local Python executable.

## Run The Browser Demo

Open `iterative_updating_app.html` in a browser, or from PowerShell:

```powershell
start .\iterative_updating_app.html
```

## Roadmap

1. Make the core architecture modular and testable.
2. Add Hebbian-style learning from coactivity and state transitions.
3. Add saved iterative threads that can be resumed, forked, and merged.
4. Add visual demos for planning, distraction, subproblem solving, and creative recombination.
5. Connect the architecture to language-model or embedding APIs only when the local mechanisms are clear enough to deserve them.
