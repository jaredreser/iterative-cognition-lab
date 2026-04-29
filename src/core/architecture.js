(function () {
  function makeGraph(nodes, edges) {
    const graph = Object.fromEntries(Object.keys(nodes).map((name) => [name, {}]));
    for (const [a, b, weight] of edges) {
      graph[a][b] = weight;
      graph[b][a] = weight;
    }
    return graph;
  }

  function clamp(value, min, max) {
    return Math.max(min, Math.min(max, value));
  }

  class IterativeCognitionEngine {
    constructor(scenario, config = {}) {
      this.scenario = scenario;
      this.nodes = scenario.nodes;
      this.graph = makeGraph(scenario.nodes, scenario.edges);
      this.config = {
        foaCapacity: 4,
        stmCapacity: 10,
        activationThreshold: 0.32,
        foaDecay: 0.24,
        stmDecay: 0.08,
        dopamine: 0.55,
        updateSlots: 1,
        noise: 0.03,
        ...config,
      };
      this.reset();
    }

    reset() {
      this.t = 0;
      this.foa = {};
      this.stm = {};
      this.history = [];
      this.threadTrace = [];
      this.savedThreads = [];
      for (const [name, strength] of Object.entries(this.scenario.seed)) this.foa[name] = strength;
      this._snapshotThread("seed");
    }

    setConfig(config) {
      this.config = { ...this.config, ...config };
    }

    step(event = null) {
      const input = event?.input || {};
      const forcedSlots = event?.updateSlots;
      const tag = event?.tag || null;
      const previousFoa = new Set(Object.keys(this.foa));
      const previousStm = new Set(Object.keys(this.stm));
      const slots = this._chooseUpdateSlots(input, forcedSlots);
      const jumpRequested = slots >= this.config.foaCapacity;
      const search = this._spreadActivation(input, jumpRequested, previousFoa);
      const nextFoa = Object.fromEntries(this._selectKeepers(slots));

      for (const [name, score] of Object.entries(search).sort((a, b) => b[1] - a[1])) {
        if (Object.keys(nextFoa).length >= this.config.foaCapacity) break;
        if (!(name in nextFoa)) nextFoa[name] = Math.min(score, 1);
      }

      const currentFoa = new Set(Object.keys(nextFoa));
      const evicted = [...previousFoa].filter((name) => !currentFoa.has(name));
      this._updateStm(evicted, nextFoa);
      this.foa = nextFoa;

      const stmSet = new Set(Object.keys(this.stm));
      const ssc = [...previousFoa].filter((name) => currentFoa.has(name)).sort();
      const newlyActive = [...currentFoa].filter((name) => !previousFoa.has(name)).sort();
      const activeUnion = new Set([...previousFoa, ...previousStm]);
      const presentUnion = new Set([...currentFoa, ...stmSet]);
      const deactivated = [...activeUnion].filter((name) => !presentUnion.has(name)).sort();
      const updateRate = evicted.length / Math.max(1, previousFoa.size);
      const continuity = ssc.length / Math.max(1, new Set([...previousFoa, ...currentFoa]).size);
      const mode = updateRate >= 1 ? "jump" : ssc.length >= 2 && newlyActive.length ? "iterative" : "stable";
      const row = { t: this.t, foa: Object.keys(this.foa), stm: Object.keys(this.stm), ssc, newlyActive, evicted, deactivated, updateRate, continuity, mode, tag };

      this.history.unshift(row);
      this._learnFromCoactivity(row.foa, row.tag || row.mode);
      this._snapshotThread(tag || mode);
      this.t += 1;
      return row;
    }

    saveThread(label = null) {
      const thread = {
        id: `thread-${Date.now()}-${this.savedThreads.length}`,
        label: label || `Thread ${this.savedThreads.length + 1}`,
        t: this.t,
        foa: { ...this.foa },
        stm: { ...this.stm },
        trace: this.threadTrace.map((point) => ({ ...point, foa: [...point.foa] })),
      };
      this.savedThreads.unshift(thread);
      if (this.savedThreads.length > 8) this.savedThreads.pop();
      return thread;
    }

    resumeThread(id, mode = "endpoint") {
      const thread = this.savedThreads.find((item) => item.id === id);
      if (!thread) return null;
      const source = mode === "midpoint" ? thread.trace[Math.floor(thread.trace.length / 2)] : thread.trace.at(-1);
      const names = source?.foa?.length ? source.foa : Object.keys(thread.foa);
      this.foa = {};
      for (const name of names.slice(0, this.config.foaCapacity)) this.foa[name] = Math.max(thread.foa[name] || this.stm[name] || 0.65, 0.65);
      this.stm = { ...this.stm, ...thread.stm };
      this._snapshotThread(mode === "midpoint" ? "fork midpoint" : "resume endpoint");
      return thread;
    }

    _spreadActivation(input, jumpRequested, previousFoa) {
      const candidates = {};
      const add = (name, value) => {
        if (!this.nodes[name]) return;
        candidates[name] = (candidates[name] || 0) + value;
      };

      for (const [store, storeWeight] of [[this.foa, 1], [this.stm, 0.38]]) {
        for (const [name, strength] of Object.entries(store)) {
          const node = this.nodes[name];
          add(name, strength * (1 - this.config.foaDecay) * node.persistence * storeWeight);
          for (const [target, weight] of Object.entries(this.graph[name] || {})) add(target, strength * weight * storeWeight);
        }
      }

      for (const [name, strength] of Object.entries(input)) {
        const node = this.nodes[name];
        add(name, strength * (1 + node.salience * this.config.dopamine));
        for (const [target, weight] of Object.entries(this.graph[name] || {})) if (weight > 0) add(target, strength * weight * 0.8);
      }

      if (jumpRequested) for (const name of previousFoa) if (!(name in input)) delete candidates[name];
      for (const name of Object.keys(candidates)) {
        candidates[name] += (Math.random() * 2 - 1) * this.config.noise;
        if (candidates[name] < this.config.activationThreshold) delete candidates[name];
      }
      return candidates;
    }

    _chooseUpdateSlots(input, forcedSlots) {
      if (forcedSlots != null) return clamp(forcedSlots, 0, this.config.foaCapacity);
      const highSalience = Object.entries(input).some(([name, value]) => value > 0.8 && this.nodes[name]?.salience > 0.85);
      return highSalience ? this.config.foaCapacity : clamp(this.config.updateSlots, 1, this.config.foaCapacity);
    }

    _selectKeepers(updateSlots) {
      const keepCount = Math.max(0, this.config.foaCapacity - updateSlots);
      return Object.entries(this.foa)
        .sort((a, b) => {
          const aNode = this.nodes[a[0]];
          const bNode = this.nodes[b[0]];
          return b[1] * bNode.persistence + bNode.salience * 0.02 - (a[1] * aNode.persistence + aNode.salience * 0.02);
        })
        .slice(0, keepCount);
    }

    _updateStm(evicted, nextFoa) {
      for (const name of Object.keys(this.stm)) {
        const node = this.nodes[name];
        this.stm[name] *= 1 - this.config.stmDecay * (1.1 - node.persistence);
        if (this.stm[name] < 0.12) delete this.stm[name];
      }
      for (const name of evicted) this.stm[name] = Math.max(this.stm[name] || 0, 0.72);
      for (const [name, strength] of Object.entries(nextFoa)) this.stm[name] = Math.max(this.stm[name] || 0, strength * 0.42);
      this.stm = Object.fromEntries(Object.entries(this.stm).sort((a, b) => b[1] - a[1]).slice(0, this.config.stmCapacity));
    }

    _learnFromCoactivity(names, tag) {
      const learningRate = tag === "jump" ? 0.004 : 0.018;
      for (let i = 0; i < names.length; i += 1) for (let j = i + 1; j < names.length; j += 1) this._strengthen(names[i], names[j], learningRate);
    }

    _strengthen(a, b, amount) {
      if (!this.graph[a] || !this.graph[b]) return;
      const current = this.graph[a][b] || 0;
      const next = Math.min(0.9, current + amount * (1 - current));
      this.graph[a][b] = next;
      this.graph[b][a] = next;
    }

    _snapshotThread(tag) {
      this.threadTrace.push({ t: this.t, tag, foa: Object.keys(this.foa) });
      if (this.threadTrace.length > 18) this.threadTrace.shift();
    }
  }

  window.IterativeCognition = { IterativeCognitionEngine };
})();
