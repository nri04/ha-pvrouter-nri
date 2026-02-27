/**
 * PvRouter NRI Card
 *
 * type: custom:pvrouter-card
 * entity_prefix: pvrouter
 * outputs:
 *   - id: "1"        # sortie 1 - ballon 0 (toujours present)
 *     name: "Ballon 1"
 *     icon: "ballon.png"
 *     enabled: true
 *   - id: "1.1"      # sortie 1.1 - ballon 1 (optionnel)
 *     name: "Ballon 2"
 *     icon: "ballon.png"
 *     enabled: true
 *   - id: "2"        # sortie 2 (optionnelle)
 *     name: "Piscine"
 *     icon: "charge.png"
 *     enabled: false
 */
class PvRouterCard extends HTMLElement {

  static getStubConfig() {
    return {
      entity_prefix: "pvrouter",
      outputs: [
        { id: "1",   name: "Ballon 1", icon: "ballon.png", enabled: true  },
        { id: "1.1", name: "Ballon 2", icon: "ballon.png", enabled: false },
        { id: "2",   name: "Sortie 2", icon: "charge.png", enabled: false },
      ]
    };
  }

  setConfig(config) { this.config = config; }
  getCardSize() { return 5; }

  set hass(hass) {
    const p    = this.config?.entity_prefix || "pvrouter";
    const outs = this.config?.outputs || [
      { id: "1", name: "Sortie 1", icon: "ballon.png", enabled: true },
    ];
    const base = "/pvrouter-nri";

    const getF = (key) => {
      const s = hass.states[`sensor.${p}_${key}`];
      if (!s || ["unavailable","unknown","none"].includes(s.state)) return null;
      const v = parseFloat(s.state);
      return isNaN(v) ? null : v;
    };
    const getS = (key) => {
      const s = hass.states[`sensor.${p}_${key}`];
      return s ? s.state : null;
    };
    const fmt = (v) => {
      if (v === null) return "—";
      if (Math.abs(v) >= 1000) return (v/1000).toFixed(2) + " kW";
      return Math.round(v) + " W";
    };

    // --- Capteurs ---
    const prod  = getF("production");
    const eff   = getF("efficiency");
    const pin   = getF("pin");
    const pout  = getF("pout");
    const p1    = getF("p1");
    const p2    = getF("p2");
    const bal   = getS("ballon_actif");          // "0" ou "1"
    const s1on  = getS("statusout1") === "True";
    const s2on  = getS("statusout2") === "True";
    const s1sat = getS("load1satured") === "True";
    const s2sat = getS("load2satured") === "True";

    // Charges max
    const load   = getF("load_10");  // LOAD  = ballon 0 max
    const load0  = getF("load_11");  // LOAD0 = ballon 1 max
    const load1  = getF("load_1");   // LOAD1 = sortie active ou sortie 1 simple
    const load2  = getF("load_2");   // LOAD2 = sortie 2 max

    // Detect mode 2 ballons : LOAD et LOAD0 existent et > 0
    const dualBallon = load !== null && load > 0 && load0 !== null && load0 > 0;

    // --- Calcul puissance par sortie ---
    // Sortie 1 (ballon 0) : active si statusout1=True ET (pas dual OU ballon=0)
    const s1_0_active = s1on && (!dualBallon || bal === "0");
    const s1_0_sat_load = dualBallon ? load : load1;
    const pwr_1_0 = !s1_0_active ? 0 : s1sat ? (s1_0_sat_load ?? 0) : (p1 ?? 0);

    // Sortie 1.1 (ballon 1) : active si statusout1=True ET dual ET ballon=1
    const s1_1_active = s1on && dualBallon && bal === "1";
    const pwr_1_1 = !s1_1_active ? 0 : s1sat ? (load0 ?? 0) : (p1 ?? 0);

    // Sortie 2
    const pwr_2 = !s2on ? 0 : s2sat ? (load2 ?? 0) : (p2 ?? 0);

    const pwrFor = (id) => {
      if (id === "1")   return pwr_1_0;
      if (id === "1.1") return pwr_1_1;
      if (id === "2")   return pwr_2;
      return 0;
    };
    const onFor = (id) => {
      if (id === "1")   return s1_0_active;
      if (id === "1.1") return s1_1_active;
      if (id === "2")   return s2on;
      return false;
    };

    // --- Fleches ---
    const act    = (v) => v !== null && Math.abs(v) > 5;
    const importing = pin !== null && pin > 5;
    const exporting = pin !== null && pin < -5;
    const gridColor = importing ? "#e74c3c" : exporting ? "#2ecc71" : "#888";
    const poutOn = act(pout);

    const arrH = (active, dir, color) => {
      const cls = active ? `arr a${dir}` : "arr off";
      const ch  = dir === "l" ? "&#9664;" : "&#9654;";
      return `<span class="${cls}" style="${active ? '--c:'+color : ''}">${ch}</span>`;
    };
    const arrV = (active) => {
      return `<span class="arr ${active ? 'ad' : 'off'}">&#9660;</span>`;
    };

    // --- Sorties HTML ---
    const enabledOuts = outs.filter(o => o.enabled !== false);
    const leftHTML = enabledOuts.map((out) => {
      const pw   = pwrFor(out.id);
      const isOn = onFor(out.id);
      const col  = isOn ? "#03a9f4" : "#777";
      const aOn  = pw > 5;
      return `
        <div class="dev-row">
          <div class="dev-box" style="border-color:${isOn ? '#03a9f4' : '#444'}">
            <img src="${base}/${out.icon || 'ballon.png'}" class="dev-img">
            <div class="dev-name">${out.name}</div>
            <div class="dev-val" style="color:${col}">${fmt(pw)}</div>
          </div>
          <div class="arrs-h">
            ${arrH(aOn, 'l', '#03a9f4')}
            ${arrH(aOn, 'l', '#03a9f4')}
          </div>
        </div>`;
    }).join('');

    const gridDir  = importing ? 'r' : 'l';
    const gridAOn  = act(pin);

    this.innerHTML = `
      <ha-card>
        <div class="pv-title">PvRouter NRI — Live</div>
        <div class="pv-outer">

          <!-- GAUCHE -->
          <div class="pv-left">${leftHTML}</div>

          <!-- CENTRE -->
          <div class="pv-center">
            <div class="dev-box solar-box">
              <img src="${base}/solar.png" class="dev-img dev-lg">
              <div class="dev-name">Solaire</div>
              <div class="dev-val" style="color:#f4c403">${fmt(prod)}</div>
            </div>
            <div class="arrs-v">
              ${arrV(act(prod))}
              ${arrV(act(prod))}
            </div>
            <div class="router-box">
              <img src="${base}/pvrouter.png" class="router-img">
              <div class="eff-val">${eff !== null ? eff.toFixed(1)+"%" : "—"}</div>
              <div class="eff-lbl">Efficacite</div>
            </div>
          </div>

          <!-- DROITE -->
          <div class="pv-right">

            <div class="dev-row">
              <div class="arrs-h">
                ${arrH(gridAOn, gridDir, gridColor)}
                ${arrH(gridAOn, gridDir, gridColor)}
              </div>
              <div class="dev-box" style="border-color:${gridColor}">
                <img src="${base}/house.png" class="dev-img">
                <div class="dev-name">Reseau</div>
                <div class="dev-val" style="color:${gridColor}">${fmt(pin)}</div>
                <div class="dev-sub" style="color:${gridColor}">${importing?"Import":exporting?"Export":""}</div>
              </div>
            </div>

            <div class="dev-row">
              <div class="arrs-h">
                ${arrH(poutOn, 'r', '#03a9f4')}
                ${arrH(poutOn, 'r', '#03a9f4')}
              </div>
              <div class="dev-box" style="border-color:${poutOn ? '#03a9f4' : '#444'}">
                <img src="${base}/charge.png" class="dev-img">
                <div class="dev-name">Sortie tot.</div>
                <div class="dev-val" style="color:#03a9f4">${fmt(pout)}</div>
              </div>
            </div>

          </div>

        </div>

        <style>
          .pv-title { font-weight:bold; font-size:.95em; padding:12px 16px 4px; }
          .pv-outer {
            display: flex;
            flex-direction: row;
            align-items: center;
            justify-content: space-between;
            padding: 6px 10px 16px;
            gap: 4px;
          }
          .pv-left   { display:flex; flex-direction:column; gap:12px; align-items:flex-end; }
          .pv-center { display:flex; flex-direction:column; align-items:center; gap:4px; flex-shrink:0; }
          .pv-right  { display:flex; flex-direction:column; gap:12px; align-items:flex-start; }
          .dev-row   { display:flex; flex-direction:row; align-items:center; gap:4px; }
          .dev-box {
            display:flex; flex-direction:column; align-items:center;
            border:2px solid #444; border-radius:10px;
            padding:6px 10px; min-width:72px;
            background:var(--card-background-color,#1c1c1c);
          }
          .solar-box { border-color:#f4c403 !important; }
          .dev-img   { width:46px; height:46px; object-fit:contain; }
          .dev-lg    { width:54px; height:54px; }
          .dev-name  { font-size:.68em; color:var(--secondary-text-color); margin-top:2px; text-align:center; }
          .dev-val   { font-size:.92em; font-weight:bold; text-align:center; }
          .dev-sub   { font-size:.62em; text-align:center; }
          .router-box {
            display:flex; flex-direction:column; align-items:center;
            border:1px solid #555; border-radius:8px; padding:4px 10px;
          }
          .router-img { width:76px; height:54px; object-fit:contain; }
          .eff-val { font-size:.95em; font-weight:bold; }
          .eff-lbl { font-size:.62em; color:var(--secondary-text-color); }
          .arrs-h { display:flex; flex-direction:row; gap:1px; align-items:center; }
          .arrs-v { display:flex; flex-direction:column; gap:1px; align-items:center; }
          .arr { font-size:1.1em; line-height:1; display:inline-block; }
          .off { color:#444; }
          @keyframes fl { 0%,100%{transform:translateX(0);opacity:1} 50%{transform:translateX(-3px);opacity:.5} }
          @keyframes fr { 0%,100%{transform:translateX(0);opacity:1} 50%{transform:translateX( 3px);opacity:.5} }
          @keyframes fd { 0%,100%{transform:translateY(0);opacity:1} 50%{transform:translateY( 3px);opacity:.5} }
          .al { color:var(--c,#03a9f4); animation:fl .8s ease-in-out infinite; }
          .ar { color:var(--c,#03a9f4); animation:fr .8s ease-in-out infinite; }
          .ad { color:#f4c403;           animation:fd .8s ease-in-out infinite; }
        </style>
      </ha-card>`;
  }
}

customElements.define("pvrouter-card", PvRouterCard);
window.customCards = window.customCards || [];
window.customCards.push({ type:"pvrouter-card", name:"PvRouter NRI", description:"Flux de puissance PvRouter en temps reel", preview:false });
