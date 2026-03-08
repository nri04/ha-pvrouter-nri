/**
 * PvRouter NRI Card — v1.2
 *
 * type: custom:pvrouter-card
 * entity_prefix: pvrouter
 * home_entity: sensor.home_conso_live
 * temp_thresholds:
 *   warm: 30        # < warm → bleu, warm-hot → orange, > hot → rouge
 *   hot:  50
 * outputs:
 *   - id: "1"       name: "Ballon"   icon: "ballon.png"  enabled: true
 *   - id: "2"       name: "Sortie 2" icon: "charge.png"  enabled: false
 *     temp_entity: sensor.ma_sonde
 */

// ─────────────────────────────────────────────────────────────────
//  ÉDITEUR LOVELACE
//  Règle clé : on ne reconstruit JAMAIS un champ qui existe déjà.
//  Les inputs utilisent "change" (blur/Enter) — pas "input" (frappe).
//  Ajout/suppression de sortie = seule opération qui re-render les sorties.
// ─────────────────────────────────────────────────────────────────
class PvRouterCardEditor extends HTMLElement {

  set hass(h) {
    this._hass = h;
    // Peupler la datalist une seule fois (évite de fermer le dropdown)
    if (this._built && !this._datalistFilled) this._updateDatalist();
  }

  setConfig(config) {
    this._config = JSON.parse(JSON.stringify(config));
    if (!this._built) {
      this._build();
      this._built = true;
    }
    // Jamais de rebuild si déjà construit
  }

  _fire() {
    this.dispatchEvent(new CustomEvent("config-changed",
      { detail: { config: this._config }, bubbles: true, composed: true }));
  }

  _updateDatalist() {
    const dl = this.querySelector("#pvr-sensors");
    if (!dl || !this._hass) return;
    const sensors = Object.keys(this._hass.states)
      .filter(k => k.startsWith("sensor.")).sort();
    dl.innerHTML = sensors.map(s => "<option value='" + s + "'>").join("");
    this._datalistFilled = true;
  }

  _build() {
    const c   = this._config;
    const thr = c.temp_thresholds || {};

    this.innerHTML =
      "<style>" +
      "  .pvr-e { font-size:14px; }" +
      "  .pvr-e h4 { font-size:.8em; text-transform:uppercase; letter-spacing:.08em;" +
      "    color:#888; margin:14px 0 6px; border-bottom:1px solid #333; padding-bottom:4px; }" +
      "  .pvr-e .pvr-field { margin-bottom:8px; }" +
      "  .pvr-e .pvr-field label { display:block; color:#aaa; font-size:12px; margin-bottom:3px; }" +
      "  .pvr-e input[type=text], .pvr-e input[type=number], .pvr-e select {" +
      "    width:100%; box-sizing:border-box; background:#2a2a2a; color:#fff;" +
      "    border:1px solid #555; border-radius:4px; padding:5px 8px; font-size:13px; }" +
      "  .pvr-e input[type=number] { width:80px; }" +
      "  .pvr-e .row2 { display:grid; grid-template-columns:1fr 1fr; gap:8px; }" +
      "  .pvr-e .out-block { border:1px solid #444; border-radius:6px; padding:10px; margin-bottom:8px; }" +
      "  .pvr-e .out-head { display:flex; align-items:center; gap:8px; margin-bottom:8px; }" +
      "  .pvr-e .out-grid { display:grid; grid-template-columns:1fr 1fr; gap:6px; }" +
      "  .pvr-e .btn-del { background:#c62828; color:#fff; border:none; border-radius:4px;" +
      "    padding:2px 8px; cursor:pointer; margin-left:auto; font-size:13px; }" +
      "  .pvr-e .btn-add { background:#0288d1; color:#fff; border:none; border-radius:6px;" +
      "    padding:7px 14px; cursor:pointer; margin-top:6px; width:100%; font-size:13px; }" +
      "</style>" +
      "<datalist id='pvr-sensors'></datalist>" +
      "<div class='pvr-e'>" +

      "<h4>Général</h4>" +
      "<div class='pvr-field'><label>Préfixe entités</label>" +
      "<input id='pvr-prefix' type='text' value='" + (c.entity_prefix || "pvrouter") + "'></div>" +

      "<div class='pvr-field'><label>Entité maison</label>" +
      "<input id='pvr-home' type='text' list='pvr-sensors' value='" + (c.home_entity || "") + "' placeholder='sensor.…'></div>" +

      "<h4>Paliers température</h4>" +
      "<div class='row2'>" +
      "<div class='pvr-field'><label>🔵 Froid &lt; (°C)</label>" +
      "<input id='pvr-warm' type='number' min='0' max='100' value='" + (thr.warm ?? 30) + "'></div>" +
      "<div class='pvr-field'><label>🟠 Chaud &lt; (°C)</label>" +
      "<input id='pvr-hot' type='number' min='0' max='100' value='" + (thr.hot ?? 50) + "'></div>" +
      "</div>" +

      "<h4>Sorties</h4>" +
      "<div id='pvr-outs'></div>" +
      "<button class='btn-add' id='pvr-add'>+ Ajouter une sortie</button>" +

      "</div>";

    // ── Listeners champs globaux (attachés une fois) ──────────────
    this.querySelector("#pvr-prefix").addEventListener("change", e => {
      this._config.entity_prefix = e.target.value.trim();
      this._fire();
    });
    this.querySelector("#pvr-home").addEventListener("change", e => {
      this._config.home_entity = e.target.value.trim();
      this._fire();
    });
    this.querySelector("#pvr-warm").addEventListener("change", e => {
      this._config.temp_thresholds = this._config.temp_thresholds || {};
      this._config.temp_thresholds.warm = Number(e.target.value);
      this._fire();
    });
    this.querySelector("#pvr-hot").addEventListener("change", e => {
      this._config.temp_thresholds = this._config.temp_thresholds || {};
      this._config.temp_thresholds.hot = Number(e.target.value);
      this._fire();
    });
    this.querySelector("#pvr-add").addEventListener("click", () => {
      this._config.outputs = this._config.outputs || [];
      this._config.outputs.push({
        id: String(this._config.outputs.length + 1),
        name: "Sortie " + (this._config.outputs.length + 1),
        icon: "ballon.png",
        enabled: false
      });
      this._fire();
      this._renderOuts(); // seule opération qui rebuild les sorties
    });

    this._renderOuts();
    this._updateDatalist();
  }

  // Reconstruit uniquement le bloc sorties (add/delete)
  _renderOuts() {
    const outs = this._config.outputs || [];
    const container = this.querySelector("#pvr-outs");
    container.innerHTML = outs.map((o, i) =>
      "<div class='out-block' data-i='" + i + "'>" +
      "  <div class='out-head'>" +
      "    <b style='flex:1;font-size:13px'>Sortie " + (i + 1) + "</b>" +
      "    <label style='display:flex;align-items:center;gap:4px;color:#aaa;font-size:12px;cursor:pointer'>" +
      "      <input type='checkbox' data-i='" + i + "' data-k='enabled'" + (o.enabled !== false ? " checked" : "") + "> Activée" +
      "    </label>" +
      "    <button class='btn-del' data-i='" + i + "'>✕</button>" +
      "  </div>" +
      "  <div class='out-grid'>" +
      "    <div class='pvr-field'><label>ID</label><input type='text' data-i='" + i + "' data-k='id' value='" + (o.id || "") + "'></div>" +
      "    <div class='pvr-field'><label>Nom</label><input type='text' data-i='" + i + "' data-k='name' value='" + (o.name || "") + "'></div>" +
      "    <div class='pvr-field'><label>Icône</label><input type='text' data-i='" + i + "' data-k='icon' value='" + (o.icon || "") + "'></div>" +
      "    <div class='pvr-field'><label>Capteur temp.</label><input type='text' list='pvr-sensors' data-i='" + i + "' data-k='temp_entity' value='" + (o.temp_entity || "") + "' placeholder='sensor.…'></div>" +
      "  </div>" +
      "</div>"
    ).join("");

    // Listeners sorties — change (pas input) = déclenche à la perte de focus
    container.querySelectorAll("input[data-k]").forEach(inp => {
      inp.addEventListener("change", e => {
        const i = Number(e.target.dataset.i);
        const k = e.target.dataset.k;
        const v = e.target.type === "checkbox" ? e.target.checked : e.target.value;
        this._config.outputs[i][k] = v;
        this._fire();
      });
    });

    container.querySelectorAll(".btn-del").forEach(btn => {
      btn.addEventListener("click", () => {
        this._config.outputs.splice(Number(btn.dataset.i), 1);
        this._fire();
        this._renderOuts(); // rebuild sorties seulement
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
    const outs = this.config?.outputs ||
      [{ id: "1", name: "Sortie 1", icon: "ballon.png", enabled: true }];
    const homeEntity = this.config?.home_entity || "sensor.home_conso_live";
    const thr   = this.config?.temp_thresholds || {};
    const thrW  = thr.warm ?? 30;
    const thrH  = thr.hot  ?? 50;
    const base  = "/pvrouter-nri";

    // ── Helpers ─────────────────────────────────────────────────
    // sensor.{p}_data expose tout le JSON en attributs (source atomique)
    const dataSensor = hass.states[`sensor.${p}_data`];
    const raw = dataSensor?.attributes || {};
    const hasRaw = Object.keys(raw).length > 1; // > 1 car entity_id toujours présent

    // Mapping clé carte → clé JSON firmware (ex: "temp_interne" → "TEMP_RTC")
    const KEY_MAP = {
      production: "PROD", efficiency: "EFF", pin: "PIN", pout: "POUT",
      p1: "P1", p2: "P2", load_1: "LOAD1", load_2: "LOAD2",
      load_10: "LOAD10", load_11: "LOAD11",
      status_out_1: "STATUS_OUT1", status_out_2: "STATUS_OUT2",
      load_1_satured: "LOAD1_SATURED", load_2satured: "LOAD2SATURED",
      ballon_actif: "BALLON", boost: "BOOST", temp_interne: "TEMP_RTC",
    };

    const getF = (key) => {
      if (hasRaw) {
        const jk = KEY_MAP[key] || key.toUpperCase();
        const v = parseFloat(raw[jk]);
        if (!isNaN(v)) return v;
      }
      const s = hass.states[`sensor.${p}_${key}`];
      if (!s || ["unavailable","unknown","none"].includes(s.state)) return null;
      const v = parseFloat(s.state); return isNaN(v) ? null : v;
    };
    const getS = (key) => {
      if (hasRaw) {
        const jk = KEY_MAP[key] || key.toUpperCase();
        if (raw[jk] !== undefined) return String(raw[jk]);
      }
      const s = hass.states[`sensor.${p}_${key}`];
      return s ? s.state : null;
    };
    const fmt = (v) => {
      if (v === null) return "—";
      if (Math.abs(v) >= 1000) return (v / 1000).toFixed(2) + " kW";
      return Math.round(v) + " W";
    };
    const tempColor = (t) =>
      t < thrW  ? "#03a9f4" :
      t <= thrH ? "#e67e22" :
                  "#e74c3c";

    // ── Commandes MQTT — utilise entity_prefix (= coordinator.prefix) ──
    // Fonctionne pour pvrouter005/BOOST comme pour PVR-MAC/BOOST
    const mqttPublish = (suffix, payload) => {
      hass.callService("mqtt", "publish", {
        topic: `${p}/${suffix}`,
        payload: String(payload)
      });
    };

    // ── Données ──────────────────────────────────────────────────
    const prod  = getF("production");
    const eff   = getF("efficiency");
    const pin   = getF("pin");
    const p1    = getF("p1");
    const p2    = getF("p2");
    const bal   = getS("ballon_actif");
    const toBool = (v) => v !== null && (v.toLowerCase() === "true" || v === "1");
    const s1on  = toBool(getS("status_out_1"));
    const s2on  = toBool(getS("status_out_2"));
    const s1sat = toBool(getS("load_1_satured"));
    const s2sat = toBool(getS("load_2_satured"));
    const load  = getF("load_10");
    const load0 = getF("load_11");

    const poutVal   = getF("pout");
    const boostRaw  = getS("boost");  // sensor.pvrouter_boost : "True"/"False"/"1"/"0"
    const boostOn   = toBool(boostRaw);
    const homeW     = (poutVal !== null && pin !== null && prod !== null)
      ? Math.round(prod + pin - poutVal) : null;

    const dual      = load !== null && load > 0 && load0 !== null && load0 > 0;
    const ballonInt = bal !== null ? parseInt(bal) : 0;
    const pout      = poutVal ?? 0;
    const load1v    = (getF("load_1")) ?? 0;
    const load2v    = (getF("load_2")) ?? 0;

    // Logique identique HomeViewModel.kt (les deux modèles)
    let pwr_1_0 = 0, pwr_1_1 = 0, pwr_2 = 0;

    if (!s1sat && s1on) {
      // ── Sortie 1 active ───────────────────────────────────────
      if (pout <= load1v) {
        // Toute la puissance va à la sortie 1
        if (!dual || ballonInt === 0) pwr_1_0 = pout;
        else                          pwr_1_1 = pout;
        // Sortie 2 = 0 dans ce cas
      } else {
        // Sortie 1 prend LOAD1, sortie 2 prend le reste
        if (!dual || ballonInt === 0) pwr_1_0 = load1v;
        else                          pwr_1_1 = load1v;
        if (s2on && !s2sat) {
          // pool = POUT - LOAD1 - PIN  (PIN négatif = injection → augmente pool)
          pwr_2 = Math.max(0, pout - load1v - (pin ?? 0));
        }
      }
    } else {
      // ── Sortie 1 saturée ou éteinte : sortie 2 indépendante ───
      pwr_1_0 = 0;
      pwr_1_1 = 0;
      if (s2on && !s2sat) {
        pwr_2 = pout <= load2v ? pout : load2v;  // min(POUT, LOAD2)
      }
    }

    pwr_1_0 = Math.max(0, pwr_1_0);
    pwr_1_1 = Math.max(0, pwr_1_1);
    pwr_2   = Math.max(0, pwr_2);

    const pwrFor = (id) =>
      id === "1" ? pwr_1_0 : id === "1.1" ? pwr_1_1 : id === "2" ? pwr_2 : 0;
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

    // ── Flèches ──────────────────────────────────────────────────
    const arrsL = (v, c) => v === null || Math.abs(v) <= 5
      ? `<span class="ph"></span>`
      : `<span class="arr al" style="--c:${c}">&#9664;</span>`.repeat(2);
    const arrsR = (v, c) => v === null || Math.abs(v) <= 5
      ? `<span class="ph"></span>`
      : `<span class="arr ar" style="--c:${c}">&#9654;</span>`.repeat(2);
    const arrsD = (v) => v === null || v <= 5
      ? `<span class="ph-v"></span>`
      : `<span class="arr ad">&#9660;</span>`.repeat(2);

    const gridArrows = importing
      ? arrsL(pin, gridColor)
      : arrsR(Math.abs(pin ?? 0), gridColor);

    // ── Sorties ──────────────────────────────────────────────────
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
            tempHTML = `<div class="dev-temp" style="color:${tempColor(tv)};font-weight:bold">
              ${tv.toFixed(1)} °C</div>`;
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

    // ── Temp interne ──────────────────────────────────────────────
    const tInt    = getF("temp_interne");
    const tIntHTML = tInt !== null
      ? `<div class="eff-temp" style="color:${tempColor(tInt)};font-weight:bold">
          ${tInt.toFixed(1)} °C</div>`
      : "";

    // ── Render ────────────────────────────────────────────────────
    this.innerHTML = `
      <ha-card>
        <div class="pv-title">PvRouter NRI — Live</div>
        <div class="pv-wrap">

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
              <div class="eff-val">${eff !== null ? eff.toFixed(1) + "%" : "—"}</div>
              <div class="eff-lbl">Efficacité</div>
              ${tIntHTML}
            </div>
          </div>

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

        <!-- BOOST -->
        ${(() => {
          const bStatusCls = boostOn ? "boost-on" : "boost-off";
          const bControls = `<div class="boost-controls">
              <input type="number" class="boost-dur" id="pvr-boost-dur"
                min="1" max="240" value="30" placeholder="min">
              <span class="boost-unit">min</span>
              <button class="boost-btn boost-btn-on" id="pvr-boost-on">ON</button>
              <button class="boost-btn boost-btn-off" id="pvr-boost-off">OFF</button>
            </div>`;
          return `<div class="boost-bar">
            <div class="boost-status ${bStatusCls}">⚡ Boost ${boostOn ? "ACTIF" : "inactif"}</div>
            ${bControls}
          </div>`;
        })()}

        <style>
          .pv-title { font-weight:bold; font-size:.95em; padding:12px 16px 4px; }
          .pv-wrap  { display:grid; grid-template-columns:1fr auto 1fr;
                      align-items:center; padding:8px 10px 16px; gap:0 8px; }
          .col-left  { display:flex; flex-direction:column; justify-content:space-around;
                       align-items:flex-end; gap:10px; }
          .out-row   { display:flex; flex-direction:row; align-items:center; gap:4px; }
          .col-center { display:flex; flex-direction:column; align-items:center;
                        justify-content:center; gap:4px; flex-shrink:0; align-self:stretch; }
          .col-right  { display:flex; flex-direction:column; justify-content:space-between;
                        align-items:flex-start; gap:10px; }
          .right-item { display:flex; flex-direction:row; align-items:center; gap:4px; }
          .dev-box  { display:flex; flex-direction:column; align-items:center;
                      border:2px solid #444; border-radius:10px; padding:6px 10px;
                      min-width:70px; background:var(--card-background-color,#1c1c1c); }
          .solar-box { border-color:#f4c403 !important; }
          .dev-img   { width:46px; height:46px; object-fit:contain; }
          .dev-lg    { width:54px; height:54px; }
          .dev-name  { font-size:.68em; color:var(--secondary-text-color); margin-top:2px; text-align:center; }
          .dev-val   { font-size:.92em; font-weight:bold; text-align:center; }
          .dev-sub   { font-size:.62em; text-align:center; }
          .dev-temp  { font-size:.75em; margin-top:2px; text-align:center; }
          .router-box { display:flex; flex-direction:column; align-items:center;
                        border:1px solid #555; border-radius:8px; padding:4px 10px; }
          .router-img { width:76px; height:54px; object-fit:contain; }
          .eff-val   { font-size:.95em; font-weight:bold; }
          .eff-lbl   { font-size:.62em; color:var(--secondary-text-color); }
          .eff-temp  { font-size:.72em; margin-top:2px; }
          .arrs-h    { display:flex; flex-direction:row; gap:1px; align-items:center;
                       min-width:28px; justify-content:center; }
          .arrs-v    { display:flex; flex-direction:column; gap:1px; align-items:center;
                       min-height:20px; justify-content:center; }
          .ph        { display:inline-block; width:28px; }
          .ph-v      { display:block; height:20px; }
          .arr       { font-size:1.1em; line-height:1; display:inline-block; }
          @keyframes fl { 0%,100%{transform:translateX(0);opacity:1} 50%{transform:translateX(-3px);opacity:.5} }
          @keyframes fr { 0%,100%{transform:translateX(0);opacity:1} 50%{transform:translateX( 3px);opacity:.5} }
          @keyframes fd { 0%,100%{transform:translateY(0);opacity:1} 50%{transform:translateY( 3px);opacity:.5} }
          .al { color:var(--c,#03a9f4); animation:fl .8s ease-in-out infinite; }
          .ar { color:var(--c,#03a9f4); animation:fr .8s ease-in-out infinite; }
          .ad { color:#f4c403;          animation:fd .8s ease-in-out infinite; }

          /* ── Boost ── */
          .boost-bar {
            display: flex; align-items: center; gap: 10px; flex-wrap: wrap;
            padding: 8px 14px 12px; border-top: 1px solid #333; margin-top: 4px;
          }
          .boost-status {
            font-size: .82em; font-weight: bold; padding: 4px 10px;
            border-radius: 20px; letter-spacing: .04em;
          }
          .boost-on  { background: #FF9800; color: #000; }
          .boost-off { background: #333;    color: #888; }
          .boost-controls {
            display: flex; align-items: center; gap: 6px; margin-left: auto;
          }
          .boost-dur {
            width: 56px; text-align: center; padding: 4px 6px; font-size: .85em;
            background: #2a2a2a; color: #fff; border: 1px solid #555;
            border-radius: 4px;
          }
          .boost-unit { font-size: .78em; color: #888; }
          .boost-btn {
            padding: 4px 12px; border: none; border-radius: 4px;
            font-size: .82em; font-weight: bold; cursor: pointer;
          }
          .boost-btn-on  { background: #FF9800; color: #000; }
          .boost-btn-off { background: #555;    color: #ccc; }
          .boost-hint    { font-size: .75em; color: #666; margin-left: auto; }
        </style>
      </ha-card>`;

    // ── Listeners boost (après render du DOM) ─────────────────────
    const btnOn  = this.querySelector("#pvr-boost-on");
    const btnOff = this.querySelector("#pvr-boost-off");
    if (btnOn) btnOn.addEventListener("click", () => {
      const dur = parseInt(this.querySelector("#pvr-boost-dur")?.value || "30");
      mqttPublish("BOOST", isNaN(dur) || dur <= 0 ? "1" : String(dur));
    });
    if (btnOff) btnOff.addEventListener("click", () => {
      mqttPublish("BOOST", "0");
    });
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