(function () {
  const $ = (id) => document.getElementById(id);
  const sliders = ["foaCapacity", "stmCapacity", "foaDecay", "stmDecay", "dopamine", "slots", "noise"];
  let engine;
  let timer = null;

  function readConfig() {
    return {
      foaCapacity: +$("foaCapacity").value,
      stmCapacity: +$("stmCapacity").value,
      foaDecay: +$("foaDecay").value,
      stmDecay: +$("stmDecay").value,
      dopamine: +$("dopamine").value,
      updateSlots: Math.min(+$("slots").value, +$("foaCapacity").value),
      noise: +$("noise").value,
    };
  }

  function startScenario(name) {
    const scenario = window.IterativeDemos.scenarios[name];
    engine = new window.IterativeCognition.IterativeCognitionEngine(scenario, readConfig());
    $("scenarioText").textContent = scenario.description;
    renderEvents(scenario.events);
    stop();
    render();
  }

  function renderEvents(events) {
    $("eventButtons").innerHTML = "";
    for (const item of events) {
      const button = document.createElement("button");
      button.textContent = item.label;
      button.addEventListener("click", () => {
        engine.setConfig(readConfig());
        engine.step(item.event);
        render();
      });
      $("eventButtons").appendChild(button);
    }
  }

  function step() {
    engine.setConfig(readConfig());
    engine.step();
    render();
  }

  function saveThread() {
    engine.saveThread();
    render();
  }

  function resumeLatest(mode) {
    const latest = engine.savedThreads[0];
    if (!latest) return;
    engine.resumeThread(latest.id, mode);
    render();
  }

  function run() {
    if (timer) return stop();
    $("run").textContent = "Pause";
    timer = setInterval(step, 850);
  }

  function stop() {
    clearInterval(timer);
    timer = null;
    $("run").textContent = "Run";
  }

  function renderItems(id, store, nodes) {
    $(id).innerHTML = Object.entries(store)
      .map(([name, strength]) => {
        const node = nodes[name];
        return `<div class="item">${name}<small>${node.modality} ${Math.round(strength * 100)}%</small></div>`;
      })
      .join("");
  }

  function render() {
    const config = readConfig();
    for (const id of sliders) {
      const value = ["foaDecay", "stmDecay", "dopamine", "noise"].includes(id) ? config[id].toFixed(2) : config[id];
      $(id + "V").textContent = value;
    }

    renderItems("foa", engine.foa, engine.nodes);
    renderItems("stm", engine.stm, engine.nodes);
    const latest = engine.history[0];
    $("time").textContent = engine.t;
    $("rate").textContent = latest ? Math.round(latest.updateRate * 100) + "%" : "0%";
    $("cont").textContent = latest ? Math.round(latest.continuity * 100) + "%" : "100%";
    $("mode").textContent = latest ? latest.mode : "Seed";
    renderMindMap();
    renderTrace();
    renderThreads();
    renderAssociations();
    renderHistory();
  }

  function renderMindMap() {
    const target = $("mindMap");
    if (!target) return;

    const width = 900;
    const height = 420;
    const centerX = width / 2;
    const centerY = height / 2;
    const nodeNames = Object.keys(engine.nodes);
    const foa = new Set(Object.keys(engine.foa));
    const stm = new Set(Object.keys(engine.stm));
    const candidates = new Map(engine.lastCandidates.map((item) => [item.name, item.score]));
    const learned = new Set(engine.lastStrengthened.flatMap((edge) => [edge.a, edge.b]));
    const positions = layoutNodes(nodeNames, width, height);
    const edgeRows = engine.getTopEdges(22);

    const edgeMarkup = edgeRows
      .map((edge) => {
        const a = positions[edge.a];
        const b = positions[edge.b];
        if (!a || !b) return "";
        const isLearning = engine.lastStrengthened.some((item) => {
          return (item.a === edge.a && item.b === edge.b) || (item.a === edge.b && item.b === edge.a);
        });
        const widthValue = 1.2 + edge.weight * 7;
        const opacity = edge.active ? 0.76 : edge.primed ? 0.5 : 0.24;
        return `<line class="map-edge ${isLearning ? "learning-edge" : ""}" x1="${a.x}" y1="${a.y}" x2="${b.x}" y2="${b.y}" stroke-width="${widthValue.toFixed(2)}" opacity="${opacity.toFixed(2)}"></line>`;
      })
      .join("");

    const nodeMarkup = nodeNames
      .map((name) => {
        const node = engine.nodes[name];
        const point = positions[name];
        const strength = engine.foa[name] ?? engine.stm[name] ?? candidates.get(name) ?? 0.18;
        const radius = 18 + Math.min(strength, 1) * 16 + node.salience * 5;
        const stateClass = foa.has(name)
          ? "focus-node"
          : stm.has(name)
          ? "memory-node"
          : candidates.has(name)
          ? "candidate-node"
          : "quiet-node";
        const learnedClass = learned.has(name) ? " learned-node" : "";
        const label = name.replaceAll("_", " ");
        const fontSize = label.length > 12 ? 11 : 14;
        return `<g class="map-node ${stateClass}${learnedClass}" transform="translate(${point.x} ${point.y})">
          <circle r="${radius.toFixed(1)}"></circle>
          <text text-anchor="middle" dy="4" font-size="${fontSize}">${label}</text>
          <title>${name}: ${node.modality}, persistence ${node.persistence}, salience ${node.salience}</title>
        </g>`;
      })
      .join("");

    target.innerHTML = `<svg viewBox="0 0 ${width} ${height}" role="img">
      <defs>
        <radialGradient id="focusGlow">
          <stop offset="0%" stop-color="#ffffff"></stop>
          <stop offset="72%" stop-color="#d9e8ff"></stop>
          <stop offset="100%" stop-color="#7aa7f7"></stop>
        </radialGradient>
        <radialGradient id="memoryGlow">
          <stop offset="0%" stop-color="#ffffff"></stop>
          <stop offset="100%" stop-color="#dac9ff"></stop>
        </radialGradient>
        <radialGradient id="candidateGlow">
          <stop offset="0%" stop-color="#fff9ed"></stop>
          <stop offset="100%" stop-color="#ffc773"></stop>
        </radialGradient>
      </defs>
      <circle class="map-orbit orbit-outer" cx="${centerX}" cy="${centerY}" r="178"></circle>
      <circle class="map-orbit orbit-inner" cx="${centerX}" cy="${centerY}" r="102"></circle>
      ${edgeMarkup}
      ${nodeMarkup}
    </svg>`;
  }

  function layoutNodes(names, width, height) {
    const centerX = width / 2;
    const centerY = height / 2;
    const radiusX = width * 0.39;
    const radiusY = height * 0.36;
    const sorted = [...names].sort();
    return Object.fromEntries(
      sorted.map((name, index) => {
        const angle = -Math.PI / 2 + (index / sorted.length) * Math.PI * 2;
        const ripple = index % 2 === 0 ? 0.9 : 1.08;
        return [
          name,
          {
            x: centerX + Math.cos(angle) * radiusX * ripple,
            y: centerY + Math.sin(angle) * radiusY * ripple,
          },
        ];
      })
    );
  }

  function renderTrace() {
    $("threadTrace").innerHTML = engine.threadTrace
      .map((point) => {
        return `<div class="trace-point"><b>t${point.t}</b><span>${point.tag}</span><small>${point.foa.join(", ")}</small></div>`;
      })
      .join("");
  }

  function renderHistory() {
    $("history").innerHTML = engine.history
      .map((row) => {
        const modeClass = row.mode === "jump" ? "pill jump" : "pill";
        return `<tr class="${row.mode === "jump" ? "jump" : ""}">
          <td>${row.t}</td>
          <td>${row.foa.join(", ") || "-"}</td>
          <td>${row.stm.join(", ") || "-"}</td>
          <td>${row.ssc.join(", ") || "-"}</td>
          <td>${row.newlyActive.join(", ") || "-"}</td>
          <td>${row.evicted.join(", ") || "-"}</td>
          <td>${Math.round(row.updateRate * 100)}%</td>
          <td><span class="${modeClass}">${row.tag || row.mode}</span></td>
        </tr>`;
      })
      .join("");
  }

  function renderThreads() {
    const target = $("savedThreads");
    if (!target) return;
    target.innerHTML = engine.savedThreads.length
      ? engine.savedThreads
          .map((thread) => {
            const endpoint = thread.trace.at(-1)?.foa?.join(", ") || Object.keys(thread.foa).join(", ");
            return `<div class="thread-card"><b>${thread.label}</b><span>saved at t${thread.t}</span><small>${endpoint}</small></div>`;
          })
          .join("")
      : `<div class="empty">No saved threads yet.</div>`;
  }

  function renderAssociations() {
    $("topEdges").innerHTML = engine
      .getTopEdges(10)
      .map((edge) => renderEdge(edge, edge.active ? "active-edge" : edge.primed ? "primed-edge" : ""))
      .join("");

    $("learnedEdges").innerHTML = engine.lastStrengthened.length
      ? engine.lastStrengthened.slice(0, 8).map((edge) => renderLearnedEdge(edge)).join("")
      : `<div class="empty">No learning update yet.</div>`;

    $("candidateNodes").innerHTML = engine.lastCandidates.length
      ? engine.lastCandidates.map((candidate) => renderCandidate(candidate)).join("")
      : `<div class="empty">Step once to generate candidates.</div>`;
  }

  function renderEdge(edge, className = "") {
    return `<div class="edge-row ${className}">
      <span>${edge.a} <b>&lt;-&gt;</b> ${edge.b}</span>
      <meter min="0" max="0.9" value="${edge.weight}"></meter>
      <strong>${edge.weight.toFixed(3)}</strong>
    </div>`;
  }

  function renderLearnedEdge(edge) {
    return `<div class="edge-row learned-edge">
      <span>${edge.a} <b>&lt;-&gt;</b> ${edge.b}</span>
      <meter min="0" max="0.04" value="${edge.delta}"></meter>
      <strong>+${edge.delta.toFixed(3)}</strong>
    </div>`;
  }

  function renderCandidate(candidate) {
    return `<div class="edge-row candidate-row">
      <span>${candidate.name}</span>
      <meter min="0" max="1" value="${candidate.score}"></meter>
      <strong>${candidate.score.toFixed(3)}</strong>
    </div>`;
  }

  function init() {
    const select = $("scenario");
    for (const [key, scenario] of Object.entries(window.IterativeDemos.scenarios)) {
      const option = document.createElement("option");
      option.value = key;
      option.textContent = scenario.title;
      select.appendChild(option);
    }
    select.addEventListener("change", () => startScenario(select.value));
    $("step").addEventListener("click", step);
    $("run").addEventListener("click", run);
    $("reset").addEventListener("click", () => startScenario(select.value));
    $("saveThread").addEventListener("click", saveThread);
    $("resumeEndpoint").addEventListener("click", () => resumeLatest("endpoint"));
    $("forkMidpoint").addEventListener("click", () => resumeLatest("midpoint"));
    for (const id of sliders) $(id).addEventListener("input", render);
    startScenario(select.value);
  }

  init();
})();
