/**
 * PvRouter NRI Card — v1.1
 *
 * Config YAML complète :
 *
 * type: custom:pvrouter-card
 * entity_prefix: pvrouter
 * home_entity: sensor.home_conso_live
 * temp_thresholds:          # optionnel — valeurs par défaut ci-dessous
 *   warm: 30                # < warm → bleu
 *   hot:  50                # warm-hot → orange, > hot → rouge
 * outputs:
 *   - id: "1"
 *     name: "Ballon"
 *     icon: "ballon.png"
 *     enabled: true
 *     temp_entity: sensor.temp_ballon   # optionnel
 *   - id: "2"
 *     name: "Sortie 2"
 *     icon: "charge.png"
 *     enabled: false
 */

// ─────────────────────────────────────────────────────────────────
//  ÉDITEUR DE CARTE (UI Lovelace)
// ─────────────────────────────────────────────────────────────────
class PvRouterCardEditor extends HTMLElement {

  constructor() {
    super();
    this.attachShadow({ mode: "open" });
    this._config = {};
    this._hass   = null;
  }

  set hass(hass) { this._hass = hass; }

  setConfig(config) {
    this._config = JSON.parse(JSON.stringify(config));
    this._render();
  }

  _fire(config) {
    this.dispatchEvent(new CustomEvent("config-changed",
      { detail: { config }, bubbles: true, composed: true }));
  }

  _set(path, value) {
    const cfg = JSON.parse(JSON.stringify(this._config));
    const parts = path.split(".");
    let obj = cfg;
    for (let i = 0; i < parts.length - 1; i++) {
      if (obj[parts[i]] == null) obj[parts[i]] = {};
      obj = obj[parts[i]];
    }
    obj[parts[parts.length - 1]] = value;
    this._config = cfg;
    this._fire(cfg);
    this._render();
  }

  _setOutput(idx, key, value) {
    const cfg = JSON.parse(JSON.stringify(this._config));
    cfg.outputs = cfg.outputs || [];
    if (!cfg.outputs[idx]) cfg.outputs[idx] = {};
    cfg.outputs[idx][key] = value;
    this._config = cfg;
    this._fire(cfg);
    this._render();
  }

  _addOutput() {
    const cfg = JSON.parse(JSON.stringify(this._config));
    cfg.outputs = cfg.outputs || [];
    cfg.outputs.push({ id: String(cfg.outputs.length + 1), name: "Sortie", icon: "ballon.png", enabled: false });
    this._config = cfg;
    this._fire(cfg);
    this._render();
  }

  _removeOutput(idx) {
    const cfg = JSON.parse(JSON.stringify(this._config));
    cfg.outputs.splice(idx, 1);
    this._config = cfg;
    this._fire(cfg);
    this._render();
  }

  _render() {
    const c    = this._config;
    const outs = c.outputs || [];
    const thr  = c.temp_thresholds || {};

    // Liste des entités capteurs pour suggestions
    const sensorList = this._hass
      ? Object.keys(this._hass.states)
          .filter(k => k.startsWith("sensor."))
          .sort()
          .map(k => `<option value="${k}"></option>`)
          .join("")
      : "";

    const outputRows = outs.map((o, i) => `
      <div class="out-row">
        <div class="out-head">
          <span class="out-num">Sortie ${i + 1}</span>
          <label class="toggle-lbl">
            <input type="checkbox" data-out="${i}" data-key="enabled" ${o.enabled !== false ? "checked" : ""}>
            Activée
          </label>
          <button class="btn-del" data-del="${i}">✕</button>
        </div>
        <div class="field-grid">
          <label>ID</label>
          <input type="text" data-out="${i}" data-key="id" value="${o.id || ""}">
          <label>Nom</label>
          <input type="text" data-out="${i}" data-key="name" value="${o.name || ""}">
          <label>Icône</label>
          <input type="text" data-out="${i}" data-key="icon" value="${o.icon || ""}">
          <label>Capteur temp.</label>
          <div class="inp-wrap">
            <input list="sensors-list" type="text" data-out="${i}" data-key="temp_entity" value="${o.temp_entity || ""}">
          </div>
        </div>
      </div>`).join("");

    this.shadowRoot.innerHTML = `
      <style>
        :host { display:block; font-size:14px; }
        h3    { margin:16px 0 6px; font-size:.9em; text-transform:uppercase;
                color:var(--secondary-text-color); letter-spacing:.06em; }
        .section { background:var(--card-background-color,#1c1c1e);
                   border:1px solid var(--divider-color,#333);
                   border-radius:8px; padding:12px; margin-bottom:12px; }
        .field-grid { display:grid; grid-template-columns:110px 1fr; gap:6px 8px; align-items:center; }
        label { color:var(--secondary-text-color); }
        input[type=text], input[type=number] {
          width:100%; box-sizing:border-box;
          background:var(--input-fill-color,#2a2a2a);
          color:var(--primary-text-color,#fff);
          border:1px solid var(--divider-color,#444);
          border-radius:4px; padding:5px 8px; font-size:13px; }
        input[type=number] { width:80px; }
        .thr-row { display:flex; align-items:center; gap:12px; flex-wrap:wrap; }
        .thr-row label { display:flex; align-items:center; gap:6px; }
        .color-dot { width:12px; height:12px; border-radius:50%; display:inline-block; }
        .out-row  { border:1px solid var(--divider-color,#333); border-radius:6px;
                    padding:10px; margin-bottom:8px; }
        .out-head { display:flex; align-items:center; gap:8px; margin-bottom:8px; }
        .out-num  { font-weight:bold; flex:1; }
        .toggle-lbl { display:flex; align-items:center; gap:4px; cursor:pointer; }
        .btn-del  { background:#c62828; color:#fff; border:none; border-radius:4px;
                    padding:2px 7px; cursor:pointer; font-size:.85em; }
        .btn-add  { background:var(--primary-color,#03a9f4); color:#fff; border:none;
                    border-radius:6px; padding:7px 14px; cursor:pointer; margin-top:4px;
                    font-size:.85em; }
        .inp-wrap { position:relative; }
        .preview  { display:flex; gap:6px; margin-top:6px; align-items:center;
                    font-size:.8em; }
        .swatch   { width:14px; height:14px; border-radius:3px; }
      </style>

      <datalist id="sensors-list">${sensorList}</datalist>

      <!-- Général -->
      <h3>Général</h3>
      <div class="section">
        <div class="field-grid">
          <label>Préfixe entités</label>
          <input type="text" id="entity_prefix" value="${c.entity_prefix || "pvrouter"}">
          <label>Entité Maison</label>
          <div class="inp-wrap">
            <input list="sensors-list" type="text" id="home_entity" value="${c.home_entity || ""}">
          </div>
        </div>
      </div>

      <!-- Paliers de température -->
      <h3>Couleurs température</h3>
      <div class="section">
        <div class="thr-row">
          <label>
            <span class="color-dot" style="background:#03a9f4"></span>
            Froid &lt;
            <input type="number" id="thr_warm" value="${thr.warm ?? 30}" min="0" max="100">
            °C
          </label>
          <label>
            <span class="color-dot" style="background:#e67e22"></span>
            Chaud &lt;
            <input type="number" id="thr_hot" value="${thr.hot ?? 50}" min="0" max="100">
            °C
          </label>
          <label>
            <span class="color-dot" style="background:#e74c3c"></span>
            &gt; seuil chaud → rouge
          </label>
        </div>
        <div class="preview">
          Aperçu :
          <span class="swatch" style="background:#03a9f4"></span><span>≤ ${thr.warm ?? 30}°C</span>
          <span class="swatch" style="background:#e67e22"></span><span>${thr.warm ?? 30}–${thr.hot ?? 50}°C</span>
          <span class="swatch" style="background:#e74c3c"></span><span>&gt; ${thr.hot ?? 50}°C</span>
        </div>
      </div>

      <!-- Sorties -->
      <h3>Sorties</h3>
      <div class="section">
        ${outputRows}
        <button class="btn-add" id="btn-add">+ Ajouter une sortie</button>
      </div>
    `;

    // ── Listeners ──────────────────────────────────────────────
    this.shadowRoot.getElementById("entity_prefix")
      .addEventListener("change", e => this._set("entity_prefix", e.target.value.trim()));

    this.shadowRoot.getElementById("home_entity")
      .addEventListener("change", e => this._set("home_entity", e.target.value.trim()));

    this.shadowRoot.getElementById("thr_warm")
      .addEventListener("change", e => this._set("temp_thresholds.warm", Number(e.target.value)));

    this.shadowRoot.getElementById("thr_hot")
      .addEventListener("change", e => this._set("temp_thresholds.hot", Number(e.target.value)));

    this.shadowRoot.getElementById("btn-add")
      .addEventListener("click", () => this._addOutput());

    this.shadowRoot.querySelectorAll("[data-del]").forEach(btn => {
      btn.addEventListener("click", () => this._removeOutput(Number(btn.dataset.del)));
    });

    this.shadowRoot.querySelectorAll("[data-out][data-key]").forEach(el => {
      const i   = Number(el.dataset.out);
      const key = el.dataset.key;
      const ev  = el.type === "checkbox" ? "change" : "change";
      el.addEventListener(ev, e => {
        const val = el.type === "checkbox" ? el.checked : e.target.value;
        this._setOutput(i, key, val);
      });
    });
  }
}

customElements.define("pvrouter-card-editor", PvRouterCardEditor);


// ─────────────────────────────────────────────────────────────────
//  CARTE PRINCIPALE
// ─────────────────────────────────────────────────────────────────
class PvRouterCard extends HTMLElement {

  static getConfigElement() {
    return document.createElement("pvrouter-card-editor");
  }

  static getStubConfig() {
    return {
      entity_prefix: "pvrouter",
      temp_thresholds: { warm: 30, hot: 50 },
      outputs: [
        { id: "1",   name: "Ballon 1", icon: "ballon.png", enabled: true  },
        { id: "1.1", name: "Ballon 2", icon: "ballon.png", enabled: false },
        { id: "2",   name: "Sortie 2", icon: "charge.png", enabled: false },
      ]
    };
  }

  setConfig(config) { this.config = config; }
  getCardSize()     { return 5; }

  set hass(hass) {
    const p    = this.config?.entity_prefix || "pvrouter";
    const outs = this.config?.outputs || [{ id:"1", name:"Sortie 1", icon:"ballon.png", enabled:true }];
    const homeEntity = this.config?.home_entity || "sensor.home_conso_live";
    const thr  = this.config?.temp_thresholds || {};
    const thrWarm = thr.warm ?? 30;
    const thrHot  = thr.hot  ?? 50;
    const base = "/pvrouter-nri";

    // ── Helpers données ─────────────────────────────────────────
    const getF = (key) => {
      const s = hass.states[`sensor.${p}_${key}`];
      if (!s || ["unavailable","unknown","none"].includes(s.state)) return null;
      const v = parseFloat(s.state); return isNaN(v) ? null : v;
    };
    const getS = (key) => {
      const s = hass.states[`sensor.${p}_${key}`]; return s ? s.state : null;
    };

    const fmt = (v) => {
      if (v === null) return "—";
      if (Math.abs(v) >= 1000) return (v / 1000).toFixed(2) + " kW";
      return Math.round(v) + " W";
    };

    // ── Couleur température selon paliers configurables ──────────
    const tempColor = (t) =>
      t < thrWarm ? "#03a9f4" :
      t <= thrHot  ? "#e67e22" :
                     "#e74c3c";

    // ── Données ──────────────────────────────────────────────────
    const prod  = getF("production");
    const eff   = getF("efficiency");
    const pin   = getF("pin");
    const p1    = getF("p1");
    const p2    = getF("p2");
    const bal   = getS("ballon_actif");
    const s1on  = getS("status_out_1") === "True";
    const s2on  = getS("status_out_2") === "True";
    const s1sat = getS("load_1_satured") === "True";
    const s2sat = getS("load_2_satured") === "True";
    const load  = getF("load_10");
    const load0 = getF("load_11");

    const poutVal    = getF("pout");
    const homeW      = (poutVal !== null && pin !== null && prod !== null)
      ? Math.round(prod + pin - poutVal) : null;

    const dual      = load !== null && load > 0 && load0 !== null && load0 > 0;
    const ballonInt = bal !== null ? parseInt(bal) : 0;
    const pout      = poutVal ?? 0;

    let pwr_1_0 = 0, pwr_1_1 = 0, pwr_2 = 0;
    if (s1on && !s1sat) {
      if (!dual || ballonInt === 0) pwr_1_0 = p1 ?? 0;
      else                          pwr_1_1 = p1 ?? 0;
    }
    pwr_2 = (s2on && !s2sat) ? (p2 ?? 0) : 0;
    pwr_1_0 = Math.max(0, pwr_1_0);
    pwr_1_1 = Math.max(0, pwr_1_1);
    pwr_2   = Math.max(0, pwr_2);

    const pwrFor = (id) => id==="1" ? pwr_1_0 : id==="1.1" ? pwr_1_1 : id==="2" ? pwr_2 : 0;
    const onFor  = (id) => {
      if (id === "1")   return s1on && (!dual || ballonInt === 0) && pwr_1_0 > 0;
      if (id === "1.1") return s1on && dual && ballonInt === 1    && pwr_1_1 > 0;
      if (id === "2")   return s2on && pwr_2 > 0;
      return false;
    };

    const importing  = pin !== null && pin > 5;
    const exporting  = pin !== null && pin < -5;
    const gridColor  = importing ? "#e74c3c" : exporting ? "#2ecc71" : "#888";
    const homeActive = homeW !== null && homeW > 5;

    // ── Flèches animées ──────────────────────────────────────────
    const arrsL = (v, color) => {
      if (v === null || Math.abs(v) <= 5) return `<span class="ph"></span>`;
      return `<span class="arr al" style="--c:${color}">&#9664;</span><span class="arr al" style="--c:${color}">&#9664;</span>`;
    };
    const arrsR = (v, color) => {
      if (v === null || Math.abs(v) <= 5) return `<span class="ph"></span>`;
      return `<span class="arr ar" style="--c:${color}">&#9654;</span><span class="arr ar" style="--c:${color}">&#9654;</span>`;
    };
    const arrsD = (v) => {
      if (v === null || v <= 5) return `<span class="ph-v"></span>`;
      return `<span class="arr ad">&#9660;</span><span class="arr ad">&#9660;</span>`;
    };

    const gridArrows = importing
      ? arrsL(pin, gridColor)
      : arrsR(Math.abs(pin ?? 0), gridColor);

    // ── Sorties HTML ─────────────────────────────────────────────
    const enabledOuts = outs.filter(o => o.enabled !== false);

    const outsHTML = enabledOuts.map((out) => {
      const pw   = pwrFor(out.id);
      const isOn = onFor(out.id);
      const col  = isOn && pw > 5 ? "#03a9f4" : "#777";

      let tempHTML = "";
      if (out.temp_entity) {
        const ts = hass.states[out.temp_entity];
        if (ts && !["unavailable","unknown","none"].includes(ts.state)) {
          const tv = parseFloat(ts.state);
          if (!isNaN(tv)) {
            tempHTML = `<div class="dev-temp" style="color:${tempColor(tv)}">${tv.toFixed(1)} °C</div>`;
          }
        }
      }

      return `
        <div class="out-row">
          <div class="dev-box" style="border-color:${isOn && pw > 5 ? "#03a9f4" : "#444"}">
            <img src="${base}/${out.icon || "ballon.png"}" class="dev-img">
            <div class="dev-name">${out.name}</div>
            <div class="dev-val" style="color:${col}">${fmt(pw)}</div>
            ${tempHTML}
          </div>
          <div class="arrs-h">${arrsL(pw, "#03a9f4")}</div>
        </div>`;
    }).join("");

    // ── Température interne du routeur ────────────────────────────
    const tInt = getF("temp_interne");
    const tIntHTML = tInt !== null
      ? `<div class="eff-temp" style="color:${tempColor(tInt)}">${tInt.toFixed(1)} °C</div>`
      : "";

    // ── Rendu complet ─────────────────────────────────────────────
    this.innerHTML = `
      <ha-card>
        <div class="pv-title">PvRouter NRI — Live</div>
        <div class="pv-wrap">

          <!-- GAUCHE -->
          <div class="col-left">${outsHTML}</div>

          <!-- CENTRE -->
          <div class="col-center">
            <div class="dev-box solar-box">
              <img src="${base}/solar.png" class="dev-img dev-lg">
              <div class="dev-name">Solaire</div>
              <div class="dev-val" style="color:#f4c403">${fmt(prod)}</div>
            </div>
            <div class="arrs-v">${arrsD(prod)}</div>
            <div class="router-box">
              <img src="${base}/pvrouter.png" class="router-img">
              <div class="eff-val">${eff !== null ? eff.toFixed(1) + "%" : "—"}</div>
              <div class="eff-lbl">Efficacité</div>
              ${tIntHTML}
            </div>
          </div>

          <!-- DROITE -->
          <div class="col-right">
            <div class="right-item">
              <div class="arrs-h">${gridArrows}</div>
              <div class="dev-box" style="border-color:${Math.abs(pin ?? 0) > 5 ? gridColor : "#444"}">
                <img src="${base}/reseau.png" class="dev-img">
                <div class="dev-name">Réseau</div>
                <div class="dev-val" style="color:${gridColor}">${fmt(pin)}</div>
                <div class="dev-sub" style="color:${gridColor}">${importing ? "Import" : exporting ? "Export" : ""}</div>
              </div>
            </div>
            <div class="right-item">
              <div class="arrs-h">${arrsR(homeW, "#f39c12")}</div>
              <div class="dev-box" style="border-color:${homeActive ? "#f39c12" : "#444"}">
                <img src="${base}/house.png" class="dev-img">
                <div class="dev-name">Maison</div>
                <div class="dev-val" style="color:${homeActive ? "#f39c12" : "#777"}">${fmt(homeW)}</div>
              </div>
            </div>
          </div>

        </div>

        <style>
          .pv-title { font-weight:bold; font-size:.95em; padding:12px 16px 4px; }
          .pv-wrap {
            display: grid;
            grid-template-columns: 1fr auto 1fr;
            align-items: center;
            padding: 8px 10px 16px;
            gap: 0 8px;
          }
          .col-left {
            display: flex; flex-direction: column;
            justify-content: space-around; align-items: flex-end; gap: 10px;
          }
          .out-row  { display:flex; flex-direction:row; align-items:center; gap:4px; }
          .col-center {
            display: flex; flex-direction: column;
            align-items: center; justify-content: center;
            gap: 4px; flex-shrink: 0; align-self: stretch;
          }
          .col-right {
            display: flex; flex-direction: column;
            justify-content: space-between; align-items: flex-start; gap: 10px;
          }
          .right-item { display:flex; flex-direction:row; align-items:center; gap:4px; }
          .dev-box {
            display:flex; flex-direction:column; align-items:center;
            border:2px solid #444; border-radius:10px; padding:6px 10px;
            min-width:70px; background:var(--card-background-color,#1c1c1c);
          }
          .solar-box  { border-color:#f4c403 !important; }
          .dev-img    { width:46px; height:46px; object-fit:contain; }
          .dev-lg     { width:54px; height:54px; }
          .dev-name   { font-size:.68em; color:var(--secondary-text-color); margin-top:2px; text-align:center; }
          .dev-val    { font-size:.92em; font-weight:bold; text-align:center; }
          .dev-sub    { font-size:.62em; text-align:center; }
          .dev-temp   { font-size:.75em; margin-top:2px; text-align:center; font-weight:bold; }
          .router-box {
            display:flex; flex-direction:column; align-items:center;
            border:1px solid #555; border-radius:8px; padding:4px 10px;
          }
          .router-img { width:76px; height:54px; object-fit:contain; }
          .eff-val    { font-size:.95em; font-weight:bold; }
          .eff-lbl    { font-size:.62em; color:var(--secondary-text-color); }
          .eff-temp   { font-size:.72em; margin-top:2px; font-weight:bold; }
          .arrs-h { display:flex; flex-direction:row; gap:1px; align-items:center; min-width:28px; justify-content:center; }
          .arrs-v { display:flex; flex-direction:column; gap:1px; align-items:center; min-height:20px; justify-content:center; }
          .ph   { display:inline-block; width:28px; }
          .ph-v { display:block; height:20px; }
          .arr  { font-size:1.1em; line-height:1; display:inline-block; }
          @keyframes fl { 0%,100%{transform:translateX(0);opacity:1} 50%{transform:translateX(-3px);opacity:.5} }
          @keyframes fr { 0%,100%{transform:translateX(0);opacity:1} 50%{transform:translateX( 3px);opacity:.5} }
          @keyframes fd { 0%,100%{transform:translateY(0);opacity:1} 50%{transform:translateY( 3px);opacity:.5} }
          .al { color:var(--c,#03a9f4); animation:fl .8s ease-in-out infinite; }
          .ar { color:var(--c,#03a9f4); animation:fr .8s ease-in-out infinite; }
          .ad { color:#f4c403;          animation:fd .8s ease-in-out infinite; }
        </style>
      </ha-card>`;
  }
}

customElements.define("pvrouter-card", PvRouterCard);
window.customCards = window.customCards || [];
window.customCards.push({
  type: "pvrouter-card",
  name: "PvRouter NRI",
  description: "Flux de puissance PvRouter en temps réel",
  preview: false
});
