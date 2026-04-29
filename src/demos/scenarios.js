(function () {
  const baseNodes = {
    self: { modality: "abstract", persistence: 0.95, salience: 0.75 },
    goal: { modality: "abstract", persistence: 0.9, salience: 0.9 },
    model: { modality: "abstract", persistence: 0.75, salience: 0.7 },
    continuity: { modality: "abstract", persistence: 0.8, salience: 0.65 },
    memory: { modality: "abstract", persistence: 0.75, salience: 0.6 },
    prediction: { modality: "abstract", persistence: 0.65, salience: 0.55 },
    simulation: { modality: "abstract", persistence: 0.65, salience: 0.8 },
    code: { modality: "motor", persistence: 0.55, salience: 0.7 },
  };

  const baseEdges = [
    ["self", "goal", 0.28],
    ["goal", "model", 0.34],
    ["goal", "simulation", 0.3],
    ["model", "continuity", 0.39],
    ["model", "prediction", 0.26],
    ["continuity", "memory", 0.32],
    ["continuity", "prediction", 0.27],
    ["simulation", "code", 0.37],
    ["simulation", "prediction", 0.31],
    ["code", "goal", 0.19],
  ];

  const scenarios = {
    architecture: {
      title: "Architecture Scaffold",
      description: "A general abstract thought stream about turning the model into code.",
      seed: { self: 0.72, goal: 0.72, model: 0.72, continuity: 0.72 },
      nodes: { ...baseNodes },
      edges: [...baseEdges],
      events: [
        { label: "Memory", event: { input: { memory: 0.48 }, updateSlots: 1, tag: "recall" } },
        { label: "Simulation", event: { input: { simulation: 0.5 }, updateSlots: 1, tag: "simulate" } },
        { label: "Code", event: { input: { code: 0.46 }, updateSlots: 1, tag: "implement" } },
      ],
    },
    redLight: {
      title: "Attention Jump",
      description: "A salient red light forces a 100% FoA update, while the old thread remains partly recoverable in STM.",
      seed: { self: 0.72, goal: 0.72, model: 0.72, prediction: 0.72 },
      nodes: {
        ...baseNodes,
        red_light: { modality: "sensory", persistence: 0.4, salience: 0.95 },
        brake: { modality: "motor", persistence: 0.55, salience: 0.9 },
        intersection: { modality: "visual", persistence: 0.5, salience: 0.75 },
      },
      edges: [
        ...baseEdges,
        ["red_light", "brake", 0.65],
        ["red_light", "intersection", 0.48],
        ["intersection", "prediction", 0.3],
        ["red_light", "goal", -0.25],
      ],
      events: [
        { label: "Red Light", event: { input: { red_light: 0.92 }, tag: "salient input" } },
        { label: "Intersection", event: { input: { intersection: 0.5 }, updateSlots: 1, tag: "context" } },
        { label: "Resume Goal", event: { input: { goal: 0.45 }, updateSlots: 1, tag: "resume" } },
      ],
    },
    subproblemMerge: {
      title: "Subproblem Merge",
      description: "The FoA works on a subproblem, stores an interim result, shifts to another subproblem, then merges both partial solutions.",
      seed: { problem: 0.78, objective: 0.75, constraint: 0.7, plan: 0.68 },
      nodes: {
        problem: { modality: "abstract", persistence: 0.85, salience: 0.8 },
        objective: { modality: "abstract", persistence: 0.88, salience: 0.85 },
        constraint: { modality: "abstract", persistence: 0.72, salience: 0.72 },
        plan: { modality: "procedural", persistence: 0.7, salience: 0.75 },
        subgoal_a: { modality: "abstract", persistence: 0.68, salience: 0.74 },
        subsolution_a: { modality: "abstract", persistence: 0.78, salience: 0.82 },
        subgoal_b: { modality: "abstract", persistence: 0.68, salience: 0.74 },
        subsolution_b: { modality: "abstract", persistence: 0.78, salience: 0.82 },
        merge: { modality: "abstract", persistence: 0.82, salience: 0.9 },
        answer: { modality: "abstract", persistence: 0.75, salience: 0.92 },
      },
      edges: [
        ["problem", "objective", 0.4],
        ["objective", "constraint", 0.32],
        ["constraint", "plan", 0.3],
        ["plan", "subgoal_a", 0.42],
        ["subgoal_a", "subsolution_a", 0.58],
        ["problem", "subgoal_b", 0.3],
        ["constraint", "subgoal_b", 0.36],
        ["subgoal_b", "subsolution_b", 0.58],
        ["subsolution_a", "merge", 0.55],
        ["subsolution_b", "merge", 0.55],
        ["merge", "answer", 0.62],
        ["answer", "objective", 0.28],
      ],
      events: [
        { label: "Subgoal A", event: { input: { subgoal_a: 0.5 }, updateSlots: 1, tag: "branch A" } },
        { label: "Store A", event: { input: { subsolution_a: 0.56 }, updateSlots: 1, tag: "subsolution A" } },
        { label: "Subgoal B", event: { input: { subgoal_b: 0.5 }, updateSlots: 2, tag: "branch B" } },
        { label: "Store B", event: { input: { subsolution_b: 0.56 }, updateSlots: 1, tag: "subsolution B" } },
        { label: "Merge", event: { input: { merge: 0.65, subsolution_a: 0.42, subsolution_b: 0.42 }, updateSlots: 2, tag: "merge" } },
        { label: "Answer", event: { input: { answer: 0.6 }, updateSlots: 1, tag: "answer" } },
      ],
    },
  };

  window.IterativeDemos = { scenarios };
})();
