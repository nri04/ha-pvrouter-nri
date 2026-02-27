/**
 * PvRouter NRI - Carte Lovelace
 * 
 * Configuration YAML :
 * 
 * type: custom:pvrouter-card
 * entity_prefix: pvrouter
 * outputs:
 *   - name: "Ballon 1"
 *     icon: "ballon.png"     # fichier dans www/pvrouter/
 *     enabled: true
 *   - name: "Ballon 2"
 *     icon: "ballon.png"
 *     enabled: true
 *   - name: "Piscine"
 *     icon: "charge.png"
 *     enabled: false         # masquee si false
 */

const ICONS = {
  ballon:  "ballon.png",
  house:   "house.png",
  solar:   "solar.png",
  charge:  "charge.png",
  battery: "battery.png",
  router:  "pvrouter.png",
};

class PvRouterCard extends HTMLElement {

  static getStubConfig() {
    return {
      entity_prefix: "pvrouter",
      outputs: [
        { name: "Ballon 1", icon: "ballon.png", enabled: true },
        { name: "Ballon 2", icon: "ballon.png", enabled: true },
      ]
    };
  }

  setConfig(config) {
    this.config = config;
  }

  getCardSize() { return 5; }

  set hass(hass) {
    const p       = this.config?.entity_prefix || "pvrouter";
    const outputs = this.config?.outputs || [
      { name: "Sortie 1", icon: "ballon.png", enabled: true },
      { name: "Sortie 2", icon: "ballon.png", enabled: true },
    ];
    const imgs = "/pvrouter-nri";

    // ---- Helpers ----
    const getF = (key) => {
      const s = hass.states[`sensor.${p}_${key}`];
      if (!s || ["unavailable","unknown","none"].includes(s.state)) return null;
      return parseFloat(s.state);
    };
    const getS = (key) => {
      const s = hass.states[`sensor.${p}_${key}`];
      return s ? s.state : null;
    };
    const fmt = (v) => {
      if (v === null) return "&mdash;";
      if (Math.abs(v) >= 1000) return (v/1000).toFixed(2) + " kW";
      return Math.round(v) + " W";
    };

    // ---- Valeurs ----
    const prod = getF("production");
    const eff  = getF("efficiency");
    const pin  = getF("pin");
    const pout = getF("pout");
    const bal  = getS("ballon_actif");

    // Sorties — index 0 = sortie 1, index 1 = sortie 2
    const outData = [
      { p: getF("p1"), load: getF("load_1"), on: getS("statusout1") === "True", sat: getS("load1satured") === "True" },
      { p: getF("p2"), load: getF("load_2"), on: getS("statusout2") === "True", sat: getS("load2satured") === "True" },
    ];

    const pwr = (o) => !o.on ? 0 : o.sat ? o.load : o.p;

    // Reseau
    const importing = pin !== null && pin > 5;
    const exporting = pin !== null && pin < -5;
    const gridColor = importing ? "#e74c3c" : exporting ? "#2ecc71" : "#888";
    const gridArrow = importing ? "right" : "left";

    // ---- Fleches ----
    const arrowH = (v, dir, color) => {
      const active = v !== null && Math.abs(v) > 5;
      const cls = active ? `arrow flowing-${dir}` : "arrow inactive";
      return `<span class="${cls}" style="${active ? '--ac:'+color : ''}">${dir === 'left' ? '&#9664;' : '&#9654;'}</span>`;
    };
    const arrowV = (v) => {
      const active = v !== null && v > 5;
      const cls = active ? "arrow flowing-down" : "arrow inactive";
      return `<span class="${cls}">&#9660;</span>`;
    };

    // ---- Sorties HTML ----
    const enabledOutputs = outputs
      .map((out, i) => ({ ...out, idx: i }))
      .filter(out => out.enabled !== false);

    const outputsHTML = enabledOutputs.map((out) => {
      const od   = outData[out.idx] || { p: null, load: null, on: false, sat: false };
      const pw   = pwr(od);
      const col  = od.on ? "#03a9f4" : "#666";
      const icon = out.icon || "ballon.png";
      const badgeHTML = out.idx === 0 && bal !== null
        ? `<div class="badge">B${bal}</div>` : "";
      return `
        <div class="pv-row">
          <div class="pv-device">
            <img src="${imgs}/${icon}" class="pv-img">
            <div class="pv-name">${out.name}${badgeHTML}</div>
            <div class="pv-val" style="color:${col}">${fmt(pw)}</div>
          </div>
          <div class="arrows-h">
            ${arrowH(pw, 'left', '#03a9f4')}
            ${arrowH(pw, 'left', '#03a9f4')}
          </div>
        </div>`;
    }).join('');

    // ---- Rendu ----
    this.innerHTML = `
      <ha-card>
        <div class="pv-title">PvRouter NRI &mdash; Live</div>
        <div class="pv-grid">

          <!-- GAUCHE : sorties -->
          <div class="pv-left">
            ${outputsHTML}
          </div>

          <!-- CENTRE : solaire + routeur -->
          <div class="pv-center">
            <div class="pv-device">
              <img src="${imgs}/solar.png" class="pv-img pv-img-lg">
              <div class="pv-name">Solaire</div>
              <div class="pv-val" style="color:#f4c403">${fmt(prod)}</div>
            </div>
            <div class="arrows-v">
              ${arrowV(prod)}
              ${arrowV(prod)}
            </div>
            <div class="pv-router">
              <img src="${imgs}/pvrouter.png" class="pv-router-img">
              <div class="pv-eff-val">${eff !== null ? eff.toFixed(1)+"%" : "&mdash;"}</div>
              <div class="pv-eff-lbl">Efficacite</div>
            </div>
          </div>

          <!-- DROITE : reseau + pout -->
          <div class="pv-right">

            <!-- Reseau EDF -->
            <div class="pv-row">
              <div class="arrows-h">
                ${arrowH(pin, gridArrow, gridColor)}
                ${arrowH(pin, gridArrow, gridColor)}
              </div>
              <div class="pv-device">
                <img src="${imgs}/house.png" class="pv-img">
                <div class="pv-name">Reseau</div>
                <div class="pv-val" style="color:${gridColor}">${fmt(pin)}</div>
                <div class="pv-sub" style="color:${gridColor}">${importing?"Import":exporting?"Export":""}</div>
              </div>
            </div>

            <!-- Pout -->
            <div class="pv-row">
              <div class="arrows-h">
                ${arrowH(pout, 'right', '#03a9f4')}
                ${arrowH(pout, 'right', '#03a9f4')}
              </div>
              <div class="pv-device">
                <img src="${imgs}/charge.png" class="pv-img">
                <div class="pv-name">Sortie tot.</div>
                <div class="pv-val" style="color:#03a9f4">${fmt(pout)}</div>
              </div>
            </div>

          </div>

        </div>

        <style>
          :host { display:block; }
          .pv-title { font-weight:bold; padding:12px 16px 6px; font-size:.95em; }

          .pv-grid {
            display: grid;
            grid-template-columns: 1fr auto 1fr;
            gap: 8px;
            padding: 4px 12px 16px;
            align-items: center;
          }

          .pv-left   { display:flex; flex-direction:column; gap:14px; align-items:flex-end; }
          .pv-center { display:flex; flex-direction:column; align-items:center; gap:4px; }
          .pv-right  { display:flex; flex-direction:column; gap:14px; align-items:flex-start; }

          .pv-row { display:flex; align-items:center; gap:4px; }

          .pv-device { display:flex; flex-direction:column; align-items:center; min-width:68px; }
          .pv-img    { width:50px; height:50px; object-fit:contain; }
          .pv-img-lg { width:58px; height:58px; }
          .pv-name   { font-size:.7em; color:var(--secondary-text-color); margin-top:2px; text-align:center; }
          .pv-val    { font-size:.95em; font-weight:bold; text-align:center; }
          .pv-sub    { font-size:.65em; text-align:center; }

          .badge {
            display:inline-block;
            background:#03a9f4;
            color:#fff;
            border-radius:4px;
            padding:0 4px;
            font-size:.65em;
            margin-left:3px;
            vertical-align:middle;
          }

          .pv-router {
            display:flex; flex-direction:column; align-items:center;
            border:1px solid #444; border-radius:8px; padding:4px 8px;
          }
          .pv-router-img { width:78px; height:56px; object-fit:contain; }
          .pv-eff-val { font-size:1em; font-weight:bold; }
          .pv-eff-lbl { font-size:.65em; color:var(--secondary-text-color); }

          .arrows-h { display:flex; flex-direction:row; gap:1px; align-items:center; }
          .arrows-v { display:flex; flex-direction:column; gap:1px; align-items:center; }

          .arrow { font-size:1.1em; line-height:1; }
          .inactive { color:#444; }

          @keyframes fl { 0%,100%{opacity:1;transform:translateX(0)} 50%{opacity:.6;transform:translateX(-3px)} }
          @keyframes fr { 0%,100%{opacity:1;transform:translateX(0)} 50%{opacity:.6;transform:translateX(3px)}  }
          @keyframes fd { 0%,100%{opacity:1;transform:translateY(0)} 50%{opacity:.6;transform:translateY(3px)}  }

          .flowing-left  { color:var(--ac,#03a9f4); animation:fl .8s ease-in-out infinite; }
          .flowing-right { color:var(--ac,#03a9f4); animation:fr .8s ease-in-out infinite; }
          .flowing-down  { color:#f4c403;            animation:fd .8s ease-in-out infinite; }
        </style>
      </ha-card>`;
  }
}

customElements.define("pvrouter-card", PvRouterCard);
window.customCards = window.customCards || [];
window.customCards.push({ type:"pvrouter-card", name:"PvRouter NRI", description:"Flux de puissance PvRouter en temps reel", preview:false });
