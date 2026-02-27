class PvRouterCard extends HTMLElement {
  setConfig(config) {
    this.config = config;
  }

  getCardSize() {
    return 2;
  }

  set hass(hass) {
    const prefix = this.config?.entity_prefix || "pvrouter";

    if (!this.content) {
      this.innerHTML = `
        <ha-card header="PvRouter NRI - Live">
          <div class="card-content" style="display:flex; justify-content:space-around; text-align:center; padding:16px;">
            <div>?? Production<br><span id="solar" class="val">—</span> W</div>
            <div>?? Maison<br><span id="house" class="val">—</span> W</div>
            <div>?? Charge<br><span id="load" class="val">—</span> W</div>
          </div>
          <style>
            .val { font-weight: bold; font-size: 1.4em; color: #03a9f4; }
          </style>
        </ha-card>
      `;
      this.content = this.querySelector(".card-content");
    }

    const get = (key) => hass.states[`sensor.${prefix}_${key}`]?.state ?? "—";

    this.querySelector("#solar").innerText = get("production");
    this.querySelector("#house").innerText = get("pout");
    this.querySelector("#load").innerText  = get("load_1");
  }
}

customElements.define("pvrouter-card", PvRouterCard);