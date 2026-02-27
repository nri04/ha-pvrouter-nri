class PvRouterCard extends HTMLElement {

  static getStubConfig() {
    return {
      entity_prefix: "pvrouter",
      output1_name: "Ballon 1",
      output2_name: "Ballon 2",
      output3_name: "Maison",
      images_path: "/local/pvrouter"
    };
  }

  setConfig(config) { this.config = config; }
  getCardSize() { return 5; }

  set hass(hass) {
    const p    = this.config?.entity_prefix || "pvrouter";
    const n1   = this.config?.output1_name  || "Ballon 1";
    const n2   = this.config?.output2_name  || "Ballon 2";
    const n3   = this.config?.output3_name  || "Maison";
    const imgs = this.config?.images_path   || "/local/pvrouter";

    const get = (key) => {
      const s = hass.states[`sensor.${p}_${key}`];
      if (!s || s.state === "unavailable" || s.state === "unknown") return null;
      return parseFloat(s.state);
    };

    const getStr = (key) => {
      const s = hass.states[`sensor.${p}_${key}`];
      if (!s) return null;
      return s.state;
    };

    const fmt = (v) => {
      if (v === null) return "&mdash;";
      if (Math.abs(v) >= 1000) return (v / 1000).toFixed(2) + " kW";
      return v.toFixed(0) + " W";
    };

    // Valeurs
    const prod  = get("production");
    const eff   = get("efficiency");
    const pout  = get("pout");
    const pin   = get("pin");

    // Sortie 1 — logique : OFF=0 / partiel=P1 / sature=LOAD1
    const s1on  = getStr("statusout1") === "True";
    const s1sat = getStr("load1satured") === "True";
    const p1    = get("p1");
    const l1    = get("load_1");
    const bal   = getStr("ballonactif");
    const pwr1  = !s1on ? 0 : s1sat ? l1 : p1;

    // Sortie 2 — logique : OFF=0 / partiel=P2 / sature=LOAD2
    const s2on  = getStr("statusout2") === "True";
    const s2sat = getStr("load2satured") === "True";
    const p2    = get("p2");
    const l2    = get("load_2");
    const pwr2  = !s2on ? 0 : s2sat ? l2 : p2;

    // Reseau (PIN positif = import, negatif = export)
    const grid  = pin;

    // Fleches actives si puissance > 5W
    const on   = (v) => v !== null && Math.abs(v) > 5;
    const cls  = (v, dir) => on(v) ? `arrow arrow-${dir} flowing` : `arrow arrow-${dir} inactive`;

    // Ballon actif
    const ballonLabel = bal === "0" ? `<span class="bal-badge">B0</span>` : bal === "1" ? `<span class="bal-badge">B1</span>` : "";

    // Couleur reseau
    const gridColor = (grid !== null && grid > 0) ? "#e74c3c" : "#2ecc71";
    const gridLabel = grid !== null ? (grid > 0 ? "Import" : "Export") : "";

    this.innerHTML = `
      <ha-card>
        <div class="pv-header">PvRouter NRI &mdash; Live</div>
        <div class="pv-layout">

          <!-- COLONNE GAUCHE : sorties 1 et 2 -->
          <div class="pv-col-left">

            <!-- Sortie 1 -->
            <div class="pv-row">
              <div class="pv-device">
                <img src="${imgs}/ballon.png" class="pv-img">
                <div class="pv-dname">${n1} ${ballonLabel}</div>
                <div class="pv-dval" style="color:${s1on ? '#03a9f4' : '#888'}">${fmt(pwr1)}</div>
              </div>
              <div class="pv-arrows-h">
                <div class="${cls(pwr1, 'left')}">&#9664;</div>
                <div class="${cls(pwr1, 'left')}">&#9664;</div>
              </div>
            </div>

            <!-- Sortie 2 -->
            <div class="pv-row">
              <div class="pv-device">
                <img src="${imgs}/ballon.png" class="pv-img">
                <div class="pv-dname">${n2}</div>
                <div class="pv-dval" style="color:${s2on ? '#03a9f4' : '#888'}">${fmt(pwr2)}</div>
              </div>
              <div class="pv-arrows-h">
                <div class="${cls(pwr2, 'left')}">&#9664;</div>
                <div class="${cls(pwr2, 'left')}">&#9664;</div>
              </div>
            </div>

          </div>

          <!-- COLONNE CENTRE : solaire + routeur + efficacite -->
          <div class="pv-col-center">

            <!-- Solaire en haut -->
            <div class="pv-device pv-solar">
              <img src="${imgs}/solar.png" class="pv-img">
              <div class="pv-dname">Solaire</div>
              <div class="pv-dval" style="color:#f4c403">${fmt(prod)}</div>
            </div>

            <!-- Fleches vers le bas depuis solaire -->
            <div class="pv-arrows-v">
              <div class="${cls(prod, 'down')}">&#9660;</div>
              <div class="${cls(prod, 'down')}">&#9660;</div>
            </div>

            <!-- Routeur -->
            <div class="pv-router-box">
              <img src="${imgs}/pvrouter.png" class="pv-router-img">
              <div class="pv-eff">${eff !== null ? eff.toFixed(1) + "%" : "&mdash;"}</div>
              <div class="pv-eff-label">Efficacite</div>
            </div>

          </div>

          <!-- COLONNE DROITE : maison/reseau et sortie 3 -->
          <div class="pv-col-right">

            <!-- Maison / Reseau -->
            <div class="pv-row">
              <div class="pv-arrows-h">
                <div class="${cls(grid, on(grid) && grid > 0 ? 'right' : 'left')}">&#9654;</div>
                <div class="${cls(grid, on(grid) && grid > 0 ? 'right' : 'left')}">&#9654;</div>
              </div>
              <div class="pv-device">
                <img src="${imgs}/house.png" class="pv-img">
                <div class="pv-dname">${n3}</div>
                <div class="pv-dval" style="color:${gridColor}">${fmt(grid)}</div>
                <div class="pv-badge" style="color:${gridColor}">${gridLabel}</div>
              </div>
            </div>

            <!-- Pout -->
            <div class="pv-row">
              <div class="pv-arrows-h">
                <div class="${cls(pout, 'right')}">&#9654;</div>
                <div class="${cls(pout, 'right')}">&#9654;</div>
              </div>
              <div class="pv-device">
                <img src="${imgs}/charge.png" class="pv-img">
                <div class="pv-dname">Sortie</div>
                <div class="pv-dval" style="color:#03a9f4">${fmt(pout)}</div>
              </div>
            </div>

          </div>

        </div>

        <style>
          .pv-header { font-size:1em; font-weight:bold; padding:12px 16px 4px; color:var(--primary-text-color); }

          .pv-layout {
            display: grid;
            grid-template-columns: 1fr auto 1fr;
            align-items: center;
            gap: 8px;
            padding: 8px 12px 16px;
          }

          .pv-col-left   { display:flex; flex-direction:column; gap:16px; align-items:flex-end; }
          .pv-col-center { display:flex; flex-direction:column; align-items:center; gap:4px; }
          .pv-col-right  { display:flex; flex-direction:column; gap:16px; align-items:flex-start; }

          .pv-row { display:flex; align-items:center; gap:6px; }

          .pv-device {
            display: flex;
            flex-direction: column;
            align-items: center;
            min-width: 70px;
          }
          .pv-img { width:52px; height:52px; object-fit:contain; }
          .pv-solar .pv-img { width:58px; height:58px; }
          .pv-dname { font-size:0.72em; color:var(--secondary-text-color); margin-top:2px; text-align:center; }
          .pv-dval  { font-size:1em; font-weight:bold; text-align:center; }
          .pv-badge { font-size:0.65em; text-align:center; }

          .bal-badge {
            display:inline-block;
            background:#03a9f4;
            color:white;
            border-radius:4px;
            padding:0 4px;
            font-size:0.65em;
            vertical-align:middle;
          }

          .pv-router-box {
            display:flex;
            flex-direction:column;
            align-items:center;
            border:1px solid #444;
            border-radius:8px;
            padding:6px 10px;
          }
          .pv-router-img { width:80px; height:60px; object-fit:contain; }
          .pv-eff       { font-size:1em; font-weight:bold; color:var(--primary-text-color); }
          .pv-eff-label { font-size:0.65em; color:var(--secondary-text-color); }

          .pv-arrows-h { display:flex; flex-direction:row; gap:2px; align-items:center; }
          .pv-arrows-v { display:flex; flex-direction:column; gap:2px; align-items:center; }

          .arrow { font-size:1.2em; line-height:1; }
          .inactive { color:#444; }

          /* Animations selon direction */
          @keyframes flow-left  { 0%,100%{color:#03a9f4;transform:translateX(0)}  50%{color:#7dd4f8;transform:translateX(-3px)} }
          @keyframes flow-right { 0%,100%{color:#03a9f4;transform:translateX(0)}  50%{color:#7dd4f8;transform:translateX(3px)}  }
          @keyframes flow-down  { 0%,100%{color:#f4c403;transform:translateY(0)}  50%{color:#fde57a;transform:translateY(3px)}  }

          .flowing.arrow-left  { animation:flow-left  0.8s ease-in-out infinite; }
          .flowing.arrow-right { animation:flow-right 0.8s ease-in-out infinite; }
          .flowing.arrow-down  { animation:flow-down  0.8s ease-in-out infinite; }
        </style>
      </ha-card>`;
  }
}

customElements.define("pvrouter-card", PvRouterCard);
window.customCards = window.customCards || [];
window.customCards.push({ type: "pvrouter-card", name: "PvRouter NRI", description: "Flux de puissance PvRouter en temps reel", preview: false });
