
class PvRouterCardEditor extends HTMLElement {
  set hass(h) {
    this._hass = h;
    if (this._built && !this._datalistFilled) this._updateDatalist();
  }

  setConfig(config) {
    this._config = config ? JSON.parse(JSON.stringify(config)) : {};
    if (!this._built) {
      this._build();
      this._built = true;
    }
  }

  _fire() {
    this.dispatchEvent(new CustomEvent("config-changed", {
      detail: { config: this._config }, bubbles: true, composed: true
    }));
  }

  _updateDatalist() {
    const dl = this.querySelector("#pvr-sensors");
    if (!dl || !this._hass) return;
    const sensors = Object.keys(this._hass.states).filter(k => k.startsWith("sensor.")).sort();
    dl.innerHTML = sensors.map(s => `<option value="${s}">`).join("");
    this._datalistFilled = true;
  }

  _build() {
    const c = this._config;
    const thr = c.temp_thresholds || {};

    this.innerHTML = `
      <style>
        .pvr-e { font-size:14px; }
        .pvr-e h4 { font-size:.8em; text-transform:uppercase; letter-spacing:.08em; color:#888; margin:14px 0 6px; border-bottom:1px solid #333; padding-bottom:4px; }
        .pvr-e .pvr-field { margin-bottom:8px; }
        .pvr-e .pvr-field label { display:block; color:#aaa; font-size:12px; margin-bottom:3px; }
        .pvr-e input[type=text], .pvr-e input[type=number] { width:100%; box-sizing:border-box; background:#2a2a2a; color:#fff; border:1px solid #555; border-radius:4px; padding:5px 8px; font-size:13px; }
        .pvr-e .row2 { display:grid; grid-template-columns:1fr 1fr; gap:8px; }
        .pvr-e .out-block { border:1px solid #444; border-radius:6px; padding:10px; margin-bottom:8px; }
        .pvr-e .out-head { display:flex; align-items:center; gap:8px; margin-bottom:8px; }
        .pvr-e .out-grid { display:grid; grid-template-columns:1fr 1fr; gap:6px; }
        .pvr-e .btn-del { background:#c62828; color:#fff; border:none; border-radius:4px; padding:2px 8px; cursor:pointer; margin-left:auto; font-size:13px; }
        .pvr-e .btn-add { background:#0288d1; color:#fff; border:none; border-radius:6px; padding:7px 14px; cursor:pointer; margin-top:6px; width:100%; font-size:13px; }
      </style>
      <datalist id='pvr-sensors'></datalist>
      <div class='pvr-e'>
        <h4>Général</h4>
        <div class='pvr-field'><label>Préfixe entités</label>
        <input id='pvr-prefix' type='text' value='${c.entity_prefix || "pv_router"}'></div>
        <h4>Paliers température</h4>
        <div class='row2'>
          <div class='pvr-field'><label>🔵 Froid &lt; (°C)</label><input id='pvr-warm' type='number' value='${thr.warm ?? 30}'></div>
          <div class='pvr-field'><label>🟠 Chaud &lt; (°C)</label><input id='pvr-hot' type='number' value='${thr.hot ?? 50}'></div>
        </div>
        <h4>Sorties</h4>
        <div id='pvr-outs'></div>
        <button class='btn-add' id='pvr-add'>+ Ajouter une sortie</button>
      </div>
    `;

    this.querySelector("#pvr-prefix").addEventListener("change", e => { this._config.entity_prefix = e.target.value.trim(); this._fire(); });
    this.querySelector("#pvr-warm").addEventListener("change", e => { this._config.temp_thresholds = this._config.temp_thresholds || {}; this._config.temp_thresholds.warm = Number(e.target.value); this._fire(); });
    this.querySelector("#pvr-hot").addEventListener("change", e => { this._config.temp_thresholds = this._config.temp_thresholds || {}; this._config.temp_thresholds.hot = Number(e.target.value); this._fire(); });
    this.querySelector("#pvr-add").addEventListener("click", () => {
      this._config.outputs = this._config.outputs || [];
      this._config.outputs.push({ id: String(this._config.outputs.length + 1), name: "Sortie " + (this._config.outputs.length + 1), icon: "ballon.png", enabled: false });
      this._fire(); this._renderOuts();
    });

    this._renderOuts();
    this._updateDatalist();
  }

  _renderOuts() {
    const outs = Array.isArray(this._config.outputs) ? this._config.outputs : [];
    const container = this.querySelector("#pvr-outs");
    container.innerHTML = outs.map((o, i) => `
      <div class='out-block' data-i='${i}'>
        <div class='out-head'>
          <b style='flex:1;font-size:13px'>Sortie ${i + 1}</b>
          <label style='display:flex;align-items:center;gap:4px;color:#aaa;font-size:12px;cursor:pointer'>
            <input type='checkbox' data-i='${i}' data-k='enabled' ${o.enabled !== false ? "checked" : ""}> Activée
          </label>
          <button class='btn-del' data-i='${i}'>✕</button>
        </div>
        <div class='out-grid'>
          <div class='pvr-field'><label>ID</label><input type='text' data-i='${i}' data-k='id' value='${o.id || ""}'></div>
          <div class='pvr-field'><label>Nom</label><input type='text' data-i='${i}' data-k='name' value='${o.name || ""}'></div>
          <div class='pvr-field'><label>Icône</label><input type='text' data-i='${i}' data-k='icon' value='${o.icon || ""}'></div>
          <div class='pvr-field'><label>Capteur temp.</label><input type='text' list='pvr-sensors' data-i='${i}' data-k='temp_entity' value='${o.temp_entity || ""}' placeholder='sensor.…'></div>
        </div>
      </div>
    `).join("");

    container.querySelectorAll("input[data-k]").forEach(inp => {
      inp.addEventListener("change", e => {
        const i = Number(e.target.dataset.i);
        const k = e.target.dataset.k;
        this._config.outputs[i][k] = e.target.type === "checkbox" ? e.target.checked : e.target.value;
        this._fire();
      });
    });

    container.querySelectorAll(".btn-del").forEach(btn => {
      btn.addEventListener("click", () => {
        this._config.outputs.splice(Number(btn.dataset.i), 1);
        this._fire(); this._renderOuts();
      });
    });
  }
}
if (!customElements.get("pvrouter-card-editor")) customElements.define("pvrouter-card-editor", PvRouterCardEditor);


class PvRouterCard extends HTMLElement {

  static getConfigElement() { return document.createElement("pvrouter-card-editor"); }
  static getStubConfig() {
    return {
      entity_prefix: "pvrouter", // Modifie ici si ton préfixe global est pv_router
      temp_thresholds: { warm: 30, hot: 50 },
      outputs: [
        { id: "1", name: "Ballon 1", icon: "ballon.png", enabled: true },
        { id: "1.1", name: "Ballon 2", icon: "ballon.png", enabled: false },
        { id: "2", name: "Sortie 2", icon: "charge.png", enabled: false }
      ]
    };
  }

  setConfig(config) {
    if (!config) throw new Error("Configuration invalide.");
    this.config = config;
    this.content = null;
  }

  getCardSize() { return 5; }

  set hass(hass) {
    // Le try/catch sauve la carte du carré rouge HA en cas d'erreur JS.
    try {
      this._hass = hass;
      if (!this.content) this._initDOM();
      this._updateValues();
    } catch (err) {
      this.innerHTML = `
        <ha-card style="padding:16px; border:2px solid #c62828; background:#ffebee; color:#c62828; font-family:monospace;">
          <b>Erreur JS PvRouter :</b><br><br>${err.message}<br><pre style="font-size:10px;">${err.stack}</pre>
        </ha-card>`;
    }
  }

  // Initialisation du squelette statique une SEULE fois.
  _initDOM() {
    this.innerHTML = `
      <ha-card>
        <div class="pv-title" style="font-weight:bold; font-size:.95em; padding:12px 16px 4px;">PvRouter NRI — Live</div>
        <div id="pv-wrap" style="display:grid; grid-template-columns:1fr auto 1fr; align-items:center; padding:8px 10px 16px; gap:0 8px;"></div>
        <div id="boost-bar" data-state="unknown" style="display:flex; align-items:center; gap:10px; flex-wrap:wrap; padding:8px 14px 12px; border-top:1px solid #333; margin-top:4px;"></div>
        <style>
          .col-left { display:flex; flex-direction:column; justify-content:space-around; align-items:flex-end; gap:10px; }
          .out-row { display:flex; flex-direction:row; align-items:center; gap:4px; }
          .col-center { display:flex; flex-direction:column; align-items:center; justify-content:center; gap:4px; flex-shrink:0; align-self:stretch; }
          .col-right { display:flex; flex-direction:column; justify-content:space-between; align-items:flex-start; gap:10px; }
          .right-item { display:flex; flex-direction:row; align-items:center; gap:4px; }
          .dev-box { display:flex; flex-direction:column; align-items:center; border:2px solid #444; border-radius:10px; padding:6px 10px; min-width:70px; background:var(--card-background-color,#1c1c1c); }
          .solar-box { border-color:#f4c403 !important; }
          .dev-img { width:46px; height:46px; object-fit:contain; }
          .dev-lg { width:54px; height:54px; }
          .dev-name { font-size:.68em; color:var(--secondary-text-color); margin-top:2px; text-align:center; }
          .dev-val { font-size:.92em; font-weight:bold; text-align:center; }
          .dev-sub { font-size:.62em; text-align:center; }
          .dev-temp { font-size:.75em; margin-top:2px; text-align:center; }
          .router-box { display:flex; flex-direction:column; align-items:center; border:1px solid #555; border-radius:8px; padding:4px 10px; }
          .router-img { width:76px; height:54px; object-fit:contain; }
          .eff-val { font-size:.95em; font-weight:bold; }
          .eff-lbl { font-size:.62em; color:var(--secondary-text-color); }
          .eff-temp { font-size:.72em; margin-top:2px; }
          .arrs-h { display:flex; flex-direction:row; gap:1px; align-items:center; min-width:28px; justify-content:center; }
          .arrs-v { display:flex; flex-direction:column; gap:1px; align-items:center; min-height:20px; justify-content:center; }
          .ph { display:inline-block; width:28px; }
          .ph-v { display:block; height:20px; }
          .arr { font-size:1.1em; line-height:1; display:inline-block; }
          @keyframes fl { 0%,100%{transform:translateX(0);opacity:1} 50%{transform:translateX(-3px);opacity:.5} }
          @keyframes fr { 0%,100%{transform:translateX(0);opacity:1} 50%{transform:translateX( 3px);opacity:.5} }
          @keyframes fd { 0%,100%{transform:translateY(0);opacity:1} 50%{transform:translateY( 3px);opacity:.5} }
          .al { color:var(--c,#03a9f4); animation:fl .8s ease-in-out infinite; }
          .ar { color:var(--c,#03a9f4); animation:fr .8s ease-in-out infinite; }
          .ad { color:#f4c403; animation:fd .8s ease-in-out infinite; }
        </style>
      </ha-card>
    `;
    this.content  = this.querySelector("ha-card");
    this.wrap     = this.querySelector("#pv-wrap");
    this.boostBar = this.querySelector("#boost-bar");

    // Gestion propre du clic du Boost
    this.boostBar.addEventListener("click", (e) => {
      if (e.target.tagName !== "BUTTON") return;
      const pfx = this.config?.entity_prefix || "pvrouter";
      const isTurnOn = e.target.dataset.action === "on";
      const dur = isTurnOn ? parseInt(this.querySelector("#pvr-boost-dur")?.value || "30") : 0;

      this._hass.callService("mqtt", "publish", {
        topic: `${pfx}/BOOST`,
        payload: String(isNaN(dur) || dur <= 0 ? (isTurnOn ? "1" : "0") : dur)
      });
    });
  }

  // Mise à jour continue des valeurs
  _updateValues() {
    const states = this._hass.states;
    const p      = this.config?.entity_prefix || "pvrouter";
    const outs   = Array.isArray(this.config?.outputs) ? this.config.outputs : [];
    const thr    = this.config?.temp_thresholds || {};
    const thrW   = thr.warm ?? 30;
    const thrH   = thr.hot  ?? 50;
    const base   = "/pvrouter-nri";

    // Vérification bloquante si l'entité n'existe pas
    if (!states[`sensor.${p}_production`] && !states[`sensor.${p}_data`]) {
      this.wrap.innerHTML = `<div style="grid-column:1/4; color:#e74c3c; font-weight:bold; padding:20px;">
        ⚠️ Entité introuvable : sensor.${p}_production.<br>
        Allez dans l'éditeur de la carte et modifiez "Préfixe entités".
      </div>`;
      return;
    }

    const dataSensor = states[`sensor.${p}_data`];
    const raw = dataSensor?.attributes || {};
    const hasRaw = Object.keys(raw).length > 1;

    const KEY_MAP = {
      production: "PROD", efficiency: "EFF", pin: "PIN", pout: "POUT",
      p1: "P1", p2: "P2", load_1: "LOAD1", load_2: "LOAD2", load_10: "LOAD10", load_11: "LOAD11",
      status_out_1: "STATUS_OUT1", status_out_2: "STATUS_OUT2",
      load_1_satured: "LOAD1_SATURED", load_2_satured: "LOAD2_SATURED",
      ballon_actif: "BALLON", boost: "BOOST", temp_interne: "TEMP_RTC",
    };

    const getF = (key) => {
      if (hasRaw && raw[KEY_MAP[key]]) return parseFloat(raw[KEY_MAP[key]]) || 0;
      const s = states[`sensor.${p}_${key.toLowerCase().replace(/ /g, '_')}`];
      return s && !["unavailable","unknown","none"].includes(s.state) ? parseFloat(s.state) || 0 : 0;
    };

    const getS = (key) => {
      if (hasRaw && raw[KEY_MAP[key]] !== undefined) return String(raw[KEY_MAP[key]]);
      const s = states[`sensor.${p}_${key.toLowerCase().replace(/ /g, '_')}`];
      return s && !["unavailable","unknown","none"].includes(s.state) ? String(s.state) : "off";
    };

    const fmt = (v) => v === null ? "—" : (Math.abs(v) >= 1000 ? (v / 1000).toFixed(2) + " kW" : Math.round(v) + " W");
    const tempColor = (t) => t < thrW ? "#03a9f4" : t <= thrH ? "#e67e22" : "#e74c3c";
    const toBool = (v) => v != null && (String(v).toLowerCase() === "true" || String(v) === "1");

    // Valeurs
    const prod  = getF("production");
    const eff   = getF("efficiency");
    const pin   = getF("pin");
    const poutVal = getF("pout");
    const homeW = Math.round(prod + pin - poutVal);
    const boostOn = toBool(getS("boost"));

    // Logique de distribution de puissance (V1.7)
    const bal = getS("ballon_actif");
    const s1on = toBool(getS("status_out_1"));
    const s2on = toBool(getS("status_out_2"));
    const s1sat = toBool(getS("load_1_satured"));
    const s2sat = toBool(getS("load_2_satured"));
    const dual = getF("load_10") > 0 && getF("load_11") > 0;
    const ballonInt = bal !== null ? parseInt(bal) : 0;
    const load1v = getF("load_1");
    const load2v = getF("load_2");

    let pwr_1_0 = 0, pwr_1_1 = 0, pwr_2 = 0;
    if (!s1sat && s1on) {
      if (poutVal <= load1v) {
        if (!dual || ballonInt === 0) pwr_1_0 = poutVal; else pwr_1_1 = poutVal;
      } else {
        if (!dual || ballonInt === 0) pwr_1_0 = load1v; else pwr_1_1 = load1v;
        if (s2on && !s2sat) pwr_2 = Math.max(0, poutVal - load1v - pin);
      }
    } else {
      if (s2on && !s2sat) pwr_2 = poutVal <= load2v ? poutVal : load2v;
    }

    const pwrFor = (id) => id === "1" ? pwr_1_0 : id === "1.1" ? pwr_1_1 : id === "2" ? pwr_2 : 0;
    const onFor = (id) => {
      if (id === "1") return s1on && (!dual || ballonInt === 0) && pwr_1_0 > 0;
      if (id === "1.1") return s1on && dual && ballonInt === 1 && pwr_1_1 > 0;
      if (id === "2") return s2on && pwr_2 > 0;
      return false;
    };

    // Construction HTML de la grille (Sécurisé car pas d'inputs utilisateur ici)
    const arrsL = (v, c) => Math.abs(v) <= 5 ? `<span class="ph"></span>` : `<span class="arr al" style="--c:${c}">&#9664;</span>`.repeat(2);
    const arrsR = (v, c) => Math.abs(v) <= 5 ? `<span class="ph"></span>` : `<span class="arr ar" style="--c:${c}">&#9654;</span>`.repeat(2);
    const arrsD = (v) => v <= 5 ? `<span class="ph-v"></span>` : `<span class="arr ad">&#9660;</span>`.repeat(2);

    const gridColor = pin > 5 ? "#e74c3c" : pin < -5 ? "#2ecc71" : "#888";

    const outsHTML = outs.filter(o => o.enabled !== false).map((out) => {
      const pw = pwrFor(out.id);
      const isOn = onFor(out.id);
      const col = isOn && pw > 5 ? "#03a9f4" : "#777";
      let tHTML = "";
      if (out.temp_entity && states[out.temp_entity]) {
        const tv = parseFloat(states[out.temp_entity].state);
        if (!isNaN(tv)) tHTML = `<div class="dev-temp" style="color:${tempColor(tv)};font-weight:bold">${tv.toFixed(1)} °C</div>`;
      }
      return `
        <div class="out-row">
          <div class="dev-box" style="border-color:${isOn && pw > 5 ? "#03a9f4" : "#444"}">
            <img src="${base}/${out.icon || "ballon.png"}" class="dev-img">
            <div class="dev-name">${out.name}</div>
            <div class="dev-val" style="color:${col}">${fmt(pw)}</div>
            ${tHTML}
          </div>
          <div class="arrs-h">${arrsL(pw, "#03a9f4")}</div>
        </div>`;
    }).join("");

    const tInt = getF("temp_interne");

    this.wrap.innerHTML = `
      <div class="col-left">${outsHTML}</div>
      <div class="col-center">
        <div class="dev-box solar-box">
          <img src="${base}/solar.png" class="dev-img dev-lg">
          <div class="dev-name">Solaire</div>
          <div class="dev-val" style="color:#f4c403">${fmt(prod)}</div>
        </div>
        <div class="arrs-v">${arrsD(prod)}</div>
        <div class="router-box">
          <img src="${base}/pvrouter.png" class="router-img">
          <div class="eff-val">${eff.toFixed(1)} %</div>
          <div class="eff-lbl">Efficacité</div>
          ${tInt ? `<div class="eff-temp" style="color:${tempColor(tInt)};font-weight:bold">${tInt.toFixed(1)} °C</div>` : ""}
        </div>
      </div>
      <div class="col-right">
        <div class="right-item">
          <div class="arrs-h">${pin > 5 ? arrsL(pin, gridColor) : arrsR(Math.abs(pin), gridColor)}</div>
          <div class="dev-box" style="border-color:${Math.abs(pin) > 5 ? gridColor : "#444"}">
            <img src="${base}/reseau.png" class="dev-img">
            <div class="dev-name">Réseau</div>
            <div class="dev-val" style="color:${gridColor}">${fmt(pin)}</div>
            <div class="dev-sub" style="color:${gridColor}">${pin > 5 ? "Import" : pin < -5 ? "Export" : ""}</div>
          </div>
        </div>
        <div class="right-item">
          <div class="arrs-h">${arrsR(homeW, "#f39c12")}</div>
          <div class="dev-box" style="border-color:${homeW > 5 ? "#f39c12" : "#444"}">
            <img src="${base}/house.png" class="dev-img">
            <div class="dev-name">Maison</div>
            <div class="dev-val" style="color:${homeW > 5 ? "#f39c12" : "#777"}">${fmt(homeW)}</div>
          </div>
        </div>
      </div>
    `;

    // Mise à jour isolée du Boost (Seulement si l'état Change, pour ne pas effacer ce qu'on tape dans l'input)
    const boostStateStr = boostOn ? "on" : "off";
    if (this.boostBar.dataset.state !== boostStateStr) {
      this.boostBar.dataset.state = boostStateStr;
      this.boostBar.innerHTML = `
        <div style="font-size:.82em; font-weight:bold; padding:4px 10px; border-radius:20px; background:${boostOn ? '#FF9800' : '#333'}; color:${boostOn ? '#000' : '#888'};">
          ⚡ Boost ${boostOn ? "ACTIF" : "inactif"}
        </div>
        <div style="display:flex; align-items:center; gap:6px; margin-left:auto;">
          <input type="number" id="pvr-boost-dur" min="1" max="240" value="30" placeholder="min" style="width:56px; text-align:center; padding:4px; font-size:.85em; background:#2a2a2a; color:#fff; border:1px solid #555; border-radius:4px;">
          <span style="font-size:.78em; color:#888;">min</span>
          <button data-action="on" style="padding:4px 12px; border:none; border-radius:4px; font-size:.82em; font-weight:bold; cursor:pointer; background:${boostOn ? '#FF9800' : '#555'}; color:${boostOn ? '#000' : '#ccc'};">ON</button>
          <button data-action="off" style="padding:4px 12px; border:none; border-radius:4px; font-size:.82em; font-weight:bold; cursor:pointer; background:#555; color:#ccc;">OFF</button>
        </div>
      `;
    }
  }
}

// Enregistrement final
if (!customElements.get("pvrouter-card")) {
  customElements.define("pvrouter-card", PvRouterCard);
  window.customCards = window.customCards || [];
  window.customCards.push({
    type: "pvrouter-card",
    name: "PvRouter NRI Live",
    description: "Flux de puissance PvRouter en temps réel",
    preview: false
  });
}
