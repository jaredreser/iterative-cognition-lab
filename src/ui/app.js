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
      .map(([name, strength]) => `<div class="item">${name}<small>${nodes[name].modality} ${Math.round(strength * 100)}%</small></div>`)
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
    renderTrace();
    renderThreads();
    renderHistory();
  }

  function renderTrace() {
    $("threadTrace").innerHTML = engine.threadTrace
      .map((point) => `<div class="trace-point"><b>t${point.t}</b><span>${point.tag}</span><small>${point.foa.join(", ")}</small></div>`)
      .join("");
  }

  function renderThreads() {
    const target = $("savedThreads");
    target.innerHTML = engine.savedThreads.length
      ? engine.savedThreads
          .map((thread) => {
            const endpoint = thread.trace.at(-1)?.foa?.join(", ") || Object.keys(thread.foa).join(", ");
            return `<div class="thread-card"><b>${thread.label}</b><span>saved at t${thread.t}</span><small>${endpoint}</small></div>`;
          })
          .join("")
      : `<div class="empty">No saved threads yet.</div>`;
  }

  function renderHistory() {
    $("history").innerHTML = engine.history
      .map((row) => {
        const modeClass = row.mode === "jump" ? "pill jump" : "pill";
        return `<tr class="${row.mode === "jump" ? "jump" : ""}">
          <td>${row.t}</td><td>${row.foa.join(", ") || "-"}</td><td>${row.stm.join(", ") || "-"}</td>
          <td>${row.ssc.join(", ") || "-"}</td><td>${row.newlyActive.join(", ") || "-"}</td><td>${row.evicted.join(", ") || "-"}</td>
          <td>${Math.round(row.updateRate * 100)}%</td><td><span class="${modeClass}">${row.tag || row.mode}</span></td>
        </tr>`;
      })
      .join("");
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
