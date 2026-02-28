/**
 * PvRouter NRI Card
 *
 * type: custom:pvrouter-card
 * entity_prefix: pvrouter
 * home_entity: "sensor.home_conso_live"
 * outputs:
 *   - id: "1"      name: "Ballon 1"  icon: "ballon.png"  enabled: true
 *   - id: "1.1"    name: "Ballon 2"  icon: "ballon.png"  enabled: false
 *   - id: "2"      name: "Sortie 2"  icon: "charge.png"  enabled: false
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
    const outs = this.config?.outputs || [{ id:"1", name:"Sortie 1", icon:"ballon.png", enabled:true }];
    const homeEntity = this.config?.home_entity || "sensor.home_conso_live";
    const base = "/pvrouter-nri";

    const getF = (key) => {
      const s = hass.states[`sensor.${p}_${key}`];
      if (!s || ["unavailable","unknown","none"].includes(s.state)) return null;
      const v = parseFloat(s.state); return isNaN(v) ? null : v;
    };
    const getS = (key) => { const s = hass.states[`sensor.${p}_${key}`]; return s ? s.state : null; };
    const getEnt = (eid) => {
      const s = hass.states[eid];
      if (!s || ["unavailable","unknown","none"].includes(s.state)) return null;
      const v = parseFloat(s.state); return isNaN(v) ? null : v;
    };
    const fmt = (v) => {
      if (v === null) return "—";
      if (Math.abs(v) >= 1000) return (v/1000).toFixed(2) + " kW";
      return Math.round(v) + " W";
    };

    const prod  = getF("production");
    const eff   = getF("efficiency");
    const pin   = getF("pin");
    const p1    = getF("p1");
    const p2    = getF("p2");
    // Noms des entités HA : dérivés du nom sensor (ex: "Status Out 1" → sensor.pvrouter_status_out_1)
    const bal   = getS("ballon_actif");       // sensor.pvrouter_ballon_actif
    const s1on  = getS("status_out_1") === "True";   // sensor.pvrouter_status_out_1
    const s2on  = getS("status_out_2") === "True";   // sensor.pvrouter_status_out_2
    const s1sat = getS("load_1_satured") === "True"; // sensor.pvrouter_load_1_satured
    const s2sat = getS("load_2_satured") === "True"; // sensor.pvrouter_load_2_satured
    const load  = getF("load_10");   // sensor.pvrouter_load_10
    const load0 = getF("load_11");   // sensor.pvrouter_load_11
    const load1 = getF("load_1");    // sensor.pvrouter_load_1
    const load2 = getF("load_2");    // sensor.pvrouter_load_2
    // Maison = PROD + PIN - POUT
    // Solaire + reseau (import/export) - sorties routeur
    const poutVal = getF('pout');
    // Formule officielle app SmartPvRouter : PROD + PIN - POUT (HomeFragment.kt ligne 525)
    const homeW = (poutVal !== null && pin !== null && prod !== null)
      ? Math.round(prod + pin - poutVal)
      : null;

    // Mode dual : deux appareils sur sortie 1 (LOAD10 + LOAD11 presents et > 0)
    const dual     = load !== null && load > 0 && load0 !== null && load0 > 0;
    const ballonInt = bal !== null ? parseInt(bal) : 0;  // 0 ou 1
    const pout     = poutVal ?? 0;  // reutilise poutVal deja calcule
    const load1v   = load1 ?? 0;
    const load2v   = load2 ?? 0;

    // --- Calcul exact depuis app Kotlin ---
    let pwr_1_0 = 0;  // ballon 0 (sortie 1, appareil 0)
    let pwr_1_1 = 0;  // ballon 1 (sortie 1, appareil 1) — mode dual uniquement
    let pwr_2   = 0;  // sortie 2

    // Logique simple et correcte : P1 et P2 donnent directement la puissance par sortie
    // STATUS=False ou SATURED=True → 0W
    // STATUS=True et SATURED=False → P1 ou P2
    if (!s1on || s1sat) {
      pwr_1_0 = 0;
      pwr_1_1 = 0;
    } else {
      // P1 va au ballon actif
      if (!dual || ballonInt === 0) pwr_1_0 = p1 ?? 0;
      else                          pwr_1_1 = p1 ?? 0;
    }
    pwr_2 = (!s2on || s2sat) ? 0 : (p2 ?? 0);

    // Securite : pas de valeur negative
    pwr_1_0 = Math.max(0, pwr_1_0);
    pwr_1_1 = Math.max(0, pwr_1_1);
    pwr_2   = Math.max(0, pwr_2);

    const pwrFor = (id) => id==="1"?pwr_1_0 : id==="1.1"?pwr_1_1 : id==="2"?pwr_2 : 0;
    const onFor  = (id) => {
      if (id === "1")   return s1on && (!dual || ballonInt === 0) && pwr_1_0 > 0;
      if (id === "1.1") return s1on && dual && ballonInt === 1 && pwr_1_1 > 0;
      if (id === "2")   return s2on && pwr_2 > 0;
      return false;
    };

    const importing  = pin !== null && pin > 5;
    const exporting  = pin !== null && pin < -5;
    const gridColor  = importing ? "#e74c3c" : exporting ? "#2ecc71" : "#888";
    const homeActive = homeW !== null && homeW > 5;

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

    // import = courant vient du réseau → flèches ◀◀ (vers la gauche / vers le routeur)
    // export = courant va vers le réseau → flèches ▶▶ (vers la droite)
    const gridArrows = importing ? arrsL(pin, gridColor) : arrsR(Math.abs(pin??0), gridColor);

    const enabledOuts = outs.filter(o => o.enabled !== false);
    const nOuts = Math.max(enabledOuts.length, 1);

    const outsHTML = enabledOuts.map((out) => {
      const pw   = pwrFor(out.id);
      const isOn = onFor(out.id);
      const col  = isOn && pw > 5 ? "#03a9f4" : "#777";

      // Temperature optionnelle via temp_entity
      let tempHTML = "";
      if (out.temp_entity) {
        const ts = hass.states[out.temp_entity];
        if (ts && !["unavailable","unknown","none"].includes(ts.state)) {
          const tv = parseFloat(ts.state);
          if (!isNaN(tv)) {
            tempHTML = `<div class="dev-temp">${tv.toFixed(1)} °C</div>`;
          }
        }
      }

      return `
        <div class="out-row">
          <div class="dev-box" style="border-color:${isOn && pw > 5 ? '#03a9f4' : '#444'}">
            <img src="${base}/${out.icon||'ballon.png'}" class="dev-img">
            <div class="dev-name">${out.name}</div>
            <div class="dev-val" style="color:${col}">${fmt(pw)}</div>
            ${tempHTML}
          </div>
          <div class="arrs-h">${arrsL(pw,'#03a9f4')}</div>
        </div>`;
    }).join('');

    this.innerHTML = `
      <ha-card>
        <div class="pv-title">PvRouter NRI — Live</div>
        <div class="pv-wrap">

          <!-- GAUCHE -->
          <div class="col-left">${outsHTML}</div>

          <!-- CENTRE : toujours au centre, indépendant du nombre de sorties -->
          <div class="col-center">
            <div class="dev-box solar-box">
              <img src="${base}/solar.png" class="dev-img dev-lg">
              <div class="dev-name">Solaire</div>
              <div class="dev-val" style="color:#f4c403">${fmt(prod)}</div>
            </div>
            <div class="arrs-v">${arrsD(prod)}</div>
            <div class="router-box">
              <img src="${base}/pvrouter.png" class="router-img">
              <div class="eff-val">${eff !== null ? eff.toFixed(1)+"%" : "—"}</div>
              <div class="eff-lbl">Efficacite</div>
              ${(() => { const t = getF("temp_interne"); return t !== null ? `<div class="eff-temp">${t.toFixed(1)} °C</div>` : ""; })()}
            </div>
          </div>

          <!-- DROITE : réseau collé en haut, maison collée en bas -->
          <div class="col-right">
            <div class="right-item">
              <div class="arrs-h">${gridArrows}</div>
              <div class="dev-box" style="border-color:${Math.abs(pin??0)>5?gridColor:'#444'}">
                <img src="${base}/reseau.png" class="dev-img">
                <div class="dev-name">Reseau</div>
                <div class="dev-val" style="color:${gridColor}">${fmt(pin)}</div>
                <div class="dev-sub" style="color:${gridColor}">${importing?"Import":exporting?"Export":""}</div>
              </div>
            </div>
            <div class="right-item">
              <div class="arrs-h">${arrsR(homeW,'#f39c12')}</div>
              <div class="dev-box" style="border-color:${homeActive?'#f39c12':'#444'}">
                <img src="${base}/house.png" class="dev-img">
                <div class="dev-name">Maison</div>
                <div class="dev-val" style="color:${homeActive?'#f39c12':'#777'}">${fmt(homeW)}</div>
              </div>
            </div>
          </div>

        </div>

        <style>
          .pv-title { font-weight:bold; font-size:.95em; padding:12px 16px 4px; }

          /* Grid fixe 3 colonnes — ne s'effondre jamais */
          .pv-wrap {
            display: grid;
            grid-template-columns: 1fr auto 1fr;
            align-items: center;
            padding: 8px 10px 16px;
            gap: 0 8px;
          }

          /* GAUCHE — hauteur automatique, sorties réparties uniformément */
          .col-left {
            display: flex;
            flex-direction: column;
            justify-content: space-around;
            align-items: flex-end;
            gap: 10px;
          }
          .out-row {
            display: flex;
            flex-direction: row;
            align-items: center;
            gap: 4px;
          }

          /* CENTRE — centré verticalement, s étire sur toute la hauteur de la grille */
          .col-center {
            display: flex;
            flex-direction: column;
            align-items: center;
            justify-content: center;
            gap: 4px;
            flex-shrink: 0;
            align-self: stretch;
          }

          /* DROITE — hauteur automatique, réseau haut / maison bas */
          .col-right {
            display: flex;
            flex-direction: column;
            justify-content: space-between;
            align-items: flex-start;
            gap: 10px;
          }
          .right-item {
            display: flex;
            flex-direction: row;
            align-items: center;
            gap: 4px;
          }

          .dev-box {
            display: flex;
            flex-direction: column;
            align-items: center;
            border: 2px solid #444;
            border-radius: 10px;
            padding: 6px 10px;
            min-width: 70px;
            background: var(--card-background-color, #1c1c1c);
          }
          .solar-box  { border-color: #f4c403 !important; }
          .dev-img    { width: 46px; height: 46px; object-fit: contain; }
          .dev-lg     { width: 54px; height: 54px; }
          .dev-name   { font-size: .68em; color: var(--secondary-text-color); margin-top: 2px; text-align: center; }
          .dev-val    { font-size: .92em; font-weight: bold; text-align: center; }
          .dev-sub    { font-size: .62em; text-align: center; }
          .dev-temp   { font-size: .75em; color: #e67e22; margin-top: 2px; text-align: center; }

          .router-box {
            display: flex; flex-direction: column; align-items: center;
            border: 1px solid #555; border-radius: 8px; padding: 4px 10px;
          }
          .router-img { width: 76px; height: 54px; object-fit: contain; }
          .eff-val    { font-size: .95em; font-weight: bold; }
          .eff-lbl    { font-size: .62em; color: var(--secondary-text-color); }
          .eff-temp   { font-size: .72em; color: #e67e22; margin-top: 2px; }

          .arrs-h { display:flex; flex-direction:row; gap:1px; align-items:center; min-width:28px; justify-content:center; }
          .arrs-v { display:flex; flex-direction:column; gap:1px; align-items:center; min-height:20px; justify-content:center; }
          .ph     { display:inline-block; width:28px; }
          .ph-v   { display:block; height:20px; }
          .arr    { font-size:1.1em; line-height:1; display:inline-block; }

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
