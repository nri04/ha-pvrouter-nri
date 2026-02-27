/**
 * PvRouter NRI Card
 * 
 * type: custom:pvrouter-card
 * entity_prefix: pvrouter
 * outputs:
 *   - name: "Ballon 1"
 *     icon: "ballon.png"
 *     enabled: true
 *   - name: "Ballon 2" 
 *     icon: "ballon.png"
 *     enabled: true
 */
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

  setConfig(config) { this.config = config; }
  getCardSize() { return 5; }

  set hass(hass) {
    const p    = this.config?.entity_prefix || "pvrouter";
    const outs = (this.config?.outputs || [
      { name: "Sortie 1", icon: "ballon.png", enabled: true },
      { name: "Sortie 2", icon: "ballon.png", enabled: true },
    ]).filter(o => o.enabled !== false);
    const base = "/pvrouter-nri";

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
      if (v === null || isNaN(v)) return "—";
      if (Math.abs(v) >= 1000) return (v/1000).toFixed(2) + " kW";
      return Math.round(v) + " W";
    };

    // --- Données capteurs ---
    const prod = getF("production");
    const eff  = getF("efficiency");
    const pin  = getF("pin");
    const pout = getF("pout");
    const bal  = getS("ballon_actif");

    // Calcul puissance par sortie : OFF=0 / partiel=Px / saturé=LOADx
    const outData = [
      {
        on:  getS("statusout1") === "True",
        sat: getS("load1satured") === "True",
        p:   getF("p1"),
        lod: getF("load_1"),
      },
      {
        on:  getS("statusout2") === "True",
        sat: getS("load2satured") === "True",
        p:   getF("p2"),
        lod: getF("load_2"),
      },
    ];
    const pwr = (o) => !o.on ? 0 : o.sat ? (o.lod ?? 0) : (o.p ?? 0);

    const active = (v) => v !== null && Math.abs(v) > 5;
    const importing = pin !== null && pin > 5;
    const exporting = pin !== null && pin < -5;
    const gridColor = importing ? "#e74c3c" : exporting ? "#2ecc71" : "#888";

    // --- Blocs sortie (colonne gauche) ---
    const leftHTML = outs.map((out, i) => {
      const od  = outData[i] || {};
      const pw  = pwr(od);
      const col = od.on ? "#03a9f4" : "#777";
      const bdg = i === 0 && bal !== null ? `<span class="bdg">B${bal}</span>` : "";
      const aOn = active(pw);
      return `
        <div class="device-row">
          <div class="device-box" style="border-color:${od.on ? '#03a9f4' : '#444'}">
            <img src="${base}/${out.icon || 'ballon.png'}" class="dev-img">
            <div class="dev-name">${out.name}${bdg}</div>
            <div class="dev-val" style="color:${col}">${fmt(pw)}</div>
          </div>
          <div class="arrows-h">
            <span class="arr ${aOn ? 'fl' : 'off'}">&#9664;</span>
            <span class="arr ${aOn ? 'fl' : 'off'}">&#9664;</span>
          </div>
        </div>`;
    }).join('');

    // --- Bloc réseau (colonne droite haut) ---
    const gridArr = importing ? 'fr' : exporting ? 'fl' : 'off';
    const gridAOn = active(pin);
    const poutOn  = active(pout);

    this.innerHTML = `
      <ha-card>
        <div class="pv-title">PvRouter NRI — Live</div>

        <div class="pv-outer">

          <!-- GAUCHE : sorties routeur -->
          <div class="pv-col-left">
            ${leftHTML}
          </div>

          <!-- CENTRE : solaire → routeur -->
          <div class="pv-col-center">
            <div class="device-box solar-box">
              <img src="${base}/solar.png" class="dev-img dev-img-lg">
              <div class="dev-name">Solaire</div>
              <div class="dev-val" style="color:#f4c403">${fmt(prod)}</div>
            </div>
            <div class="arrows-v">
              <span class="arr ${active(prod) ? 'fd' : 'off'}">&#9660;</span>
              <span class="arr ${active(prod) ? 'fd' : 'off'}">&#9660;</span>
            </div>
            <div class="router-box">
              <img src="${base}/pvrouter.png" class="router-img">
              <div class="eff-val">${eff !== null ? eff.toFixed(1)+"%" : "—"}</div>
              <div class="eff-lbl">Efficacite</div>
            </div>
          </div>

          <!-- DROITE : réseau + sortie totale -->
          <div class="pv-col-right">

            <div class="device-row">
              <div class="arrows-h">
                <span class="arr ${gridAOn ? gridArr : 'off'}">&#9654;</span>
                <span class="arr ${gridAOn ? gridArr : 'off'}">&#9654;</span>
              </div>
              <div class="device-box" style="border-color:${gridColor}">
                <img src="${base}/house.png" class="dev-img">
                <div class="dev-name">Reseau</div>
                <div class="dev-val" style="color:${gridColor}">${fmt(pin)}</div>
                <div class="dev-sub" style="color:${gridColor}">${importing?"Import":exporting?"Export":""}</div>
              </div>
            </div>

            <div class="device-row">
              <div class="arrows-h">
                <span class="arr ${poutOn ? 'fr' : 'off'}">&#9654;</span>
                <span class="arr ${poutOn ? 'fr' : 'off'}">&#9654;</span>
              </div>
              <div class="device-box" style="border-color:${poutOn ? '#03a9f4' : '#444'}">
                <img src="${base}/charge.png" class="dev-img">
                <div class="dev-name">Sortie tot.</div>
                <div class="dev-val" style="color:#03a9f4">${fmt(pout)}</div>
              </div>
            </div>

          </div>

        </div>

        <style>
          .pv-title {
            font-weight: bold;
            font-size: .95em;
            padding: 12px 16px 4px;
          }
          .pv-outer {
            display: flex;
            flex-direction: row;
            align-items: center;
            justify-content: space-between;
            padding: 8px 10px 16px;
            gap: 4px;
          }
          .pv-col-left {
            display: flex;
            flex-direction: column;
            gap: 12px;
            align-items: flex-end;
          }
          .pv-col-center {
            display: flex;
            flex-direction: column;
            align-items: center;
            gap: 4px;
            flex-shrink: 0;
          }
          .pv-col-right {
            display: flex;
            flex-direction: column;
            gap: 12px;
            align-items: flex-start;
          }
          .device-row {
            display: flex;
            flex-direction: row;
            align-items: center;
            gap: 4px;
          }
          .device-box {
            display: flex;
            flex-direction: column;
            align-items: center;
            border: 2px solid #444;
            border-radius: 10px;
            padding: 6px 10px;
            min-width: 72px;
            background: var(--card-background-color, #1c1c1c);
          }
          .solar-box  { border-color: #f4c403 !important; }
          .dev-img    { width: 46px; height: 46px; object-fit: contain; }
          .dev-img-lg { width: 54px; height: 54px; }
          .dev-name   { font-size: .68em; color: var(--secondary-text-color); margin-top: 2px; text-align: center; }
          .dev-val    { font-size: .92em; font-weight: bold; text-align: center; }
          .dev-sub    { font-size: .62em; text-align: center; }
          .bdg {
            display: inline-block;
            background: #03a9f4;
            color: #fff;
            border-radius: 4px;
            padding: 0 3px;
            font-size: .62em;
            margin-left: 2px;
            vertical-align: middle;
          }
          .router-box {
            display: flex;
            flex-direction: column;
            align-items: center;
            border: 1px solid #555;
            border-radius: 8px;
            padding: 4px 10px;
          }
          .router-img { width: 76px; height: 54px; object-fit: contain; }
          .eff-val    { font-size: .95em; font-weight: bold; }
          .eff-lbl    { font-size: .62em; color: var(--secondary-text-color); }

          .arrows-h { display: flex; flex-direction: row; gap: 1px; align-items: center; }
          .arrows-v { display: flex; flex-direction: column; gap: 1px; align-items: center; }

          .arr  { font-size: 1.1em; line-height: 1; display: inline-block; }
          .off  { color: #444; }

          @keyframes fl { 0%,100%{transform:translateX(0);opacity:1} 50%{transform:translateX(-3px);opacity:.5} }
          @keyframes fr { 0%,100%{transform:translateX(0);opacity:1} 50%{transform:translateX( 3px);opacity:.5} }
          @keyframes fd { 0%,100%{transform:translateY(0);opacity:1} 50%{transform:translateY( 3px);opacity:.5} }

          .fl { color: #03a9f4; animation: fl .8s ease-in-out infinite; }
          .fr { color: #03a9f4; animation: fr .8s ease-in-out infinite; }
          .fd { color: #f4c403; animation: fd .8s ease-in-out infinite; }
        </style>
      </ha-card>`;
  }
}

customElements.define("pvrouter-card", PvRouterCard);
window.customCards = window.customCards || [];
window.customCards.push({ type:"pvrouter-card", name:"PvRouter NRI", description:"Flux de puissance PvRouter en temps reel", preview:false });
