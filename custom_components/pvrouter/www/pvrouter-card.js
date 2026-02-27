class PvRouterCard extends HTMLElement {
  set hass(hass) {
    if (!this.content) {
      this.innerHTML = `
        <ha-card header="PvRouter NRI - Live">
          <div class="card-content" style="display: flex; justify-content: space-around; text-align: center;">
            <div id="solar">??<br><span class="val">0</span>W</div>
            <div id="house">??<br><span class="val">0</span>W</div>
            <div id="load">??<br><span class="val">0</span>W</div>
          </div>
          <style>
            .val { font-weight: bold; font-size: 1.2em; color: #03a9f4; }
          </style>
        </ha-card>
      `;
      this.content = this.querySelector(".card-content");
    }

    // On récupère les vraies valeurs de tes sensors
    const solar = hass.states['sensor.pvrouter_production']?.state || '0';
    const load = hass.states['sensor.pvrouter_load1']?.state || '0';

    this.querySelector("#solar .val").innerText = solar;
    this.querySelector("#load .val").innerText = load;
  }

  setConfig(config) {
    this.config = config;
  }
}

customElements.define("pvrouter-card", PvRouterCard);