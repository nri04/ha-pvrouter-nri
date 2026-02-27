class PvRouterCard extends HTMLElement {

  static getStubConfig() {
    return { entity_prefix: "pvrouter", output1_name: "Sortie 1", output2_name: "Sortie 2" };
  }

  setConfig(config) { this.config = config; }
  getCardSize() { return 4; }

  set hass(hass) {
    const p = this.config?.entity_prefix || "pvrouter";
    const name1 = this.config?.output1_name || "Sortie 1";
    const name2 = this.config?.output2_name || "Sortie 2";

    const get = (key) => {
      const s = hass.states[`sensor.${p}_${key}`];
      if (!s || s.state === "unavailable" || s.state === "unknown") return null;
      return parseFloat(s.state);
    };

    const fmt = (v) => {
      if (v === null) return "&mdash;";
      if (Math.abs(v) >= 1000) return (v / 1000).toFixed(2) + " kW";
      return v.toFixed(0) + " W";
    };

    const prod  = get("production");
    const load1 = get("load_1");
    const load2 = get("load_2");
    const eff   = get("efficiency");
    const pout  = get("pout");

    const col = (v) => (v !== null && v > 5) ? "#03a9f4" : "#555";

    this.innerHTML = `
      <ha-card>
        <div class="card-header">PvRouter NRI &mdash; Live</div>
        <div class="pv-grid">

          <div class="pv-cell top-center">
            <div class="pv-box solar">
              <div class="pv-icon">&#9728;</div>
              <div class="pv-name">Solaire</div>
              <div class="pv-val">${fmt(prod)}</div>
            </div>
          </div>

          <div class="pv-cell mid-center">
            <div class="pv-arrow-v" style="color:${col(prod)}">&#9660;</div>
            <div class="pv-eff">${eff !== null ? eff.toFixed(1) + "%" : "&mdash;"}<br><small>Efficacite</small></div>
            <div class="pv-arrow-v" style="color:${col(pout)}">&#9660;</div>
          </div>

          <div class="pv-cell bot-left">
            <div class="pv-arrow-h" style="color:${col(load1)}">&#9668;</div>
            <div class="pv-box load">
              <div class="pv-icon">&#128268;</div>
              <div class="pv-name">${name1}</div>
              <div class="pv-val">${fmt(load1)}</div>
            </div>
          </div>

          <div class="pv-cell bot-right">
            <div class="pv-box load">
              <div class="pv-icon">&#128268;</div>
              <div class="pv-name">${name2}</div>
              <div class="pv-val">${fmt(load2)}</div>
            </div>
            <div class="pv-arrow-h" style="color:${col(load2)}">&#9658;</div>
          </div>

        </div>
        <style>
          .pv-grid { display:grid; grid-template-columns:1fr auto 1fr; grid-template-rows:auto auto auto; align-items:center; justify-items:center; padding:12px 16px 16px; gap:4px; }
          .top-center { grid-column:2; grid-row:1; }
          .mid-center { grid-column:2; grid-row:2; display:flex; flex-direction:column; align-items:center; gap:2px; }
          .bot-left { grid-column:1; grid-row:3; display:flex; align-items:center; gap:6px; justify-content:flex-end; }
          .bot-right { grid-column:3; grid-row:3; display:flex; align-items:center; gap:6px; justify-content:flex-start; }
          .pv-box { border:2px solid #333; border-radius:10px; padding:8px 14px; text-align:center; min-width:90px; background:var(--card-background-color,#1c1c1c); }
          .pv-box.solar { border-color:#f4c403; }
          .pv-box.load { border-color:#03a9f4; }
          .pv-icon { font-size:1.4em; }
          .pv-name { font-size:0.75em; color:var(--secondary-text-color); margin:2px 0; }
          .pv-val { font-size:1.1em; font-weight:bold; color:#03a9f4; }
          .pv-box.solar .pv-val { color:#f4c403; }
          .pv-arrow-v, .pv-arrow-h { font-size:1.4em; line-height:1; transition:color 0.3s; }
          .pv-eff { text-align:center; font-size:0.85em; color:var(--primary-text-color); padding:4px 10px; border:1px solid #444; border-radius:6px; min-width:70px; }
          .pv-eff small { color:var(--secondary-text-color); font-size:0.8em; }
        </style>
      </ha-card>`;
  }
}

customElements.define("pvrouter-card", PvRouterCard);
window.customCards = window.customCards || [];
window.customCards.push({ type: "pvrouter-card", name: "PvRouter NRI", description: "Flux de puissance PvRouter en temps reel", preview: false });
