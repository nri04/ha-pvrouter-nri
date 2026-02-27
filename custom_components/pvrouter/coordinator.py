import json
import logging
from homeassistant.helpers.update_coordinator import DataUpdateCoordinator
from homeassistant.components.mqtt import async_subscribe
from .const import DOMAIN, TOPIC_DATA

_LOGGER = logging.getLogger(__name__)

class PvRouterCoordinator(DataUpdateCoordinator):
    """Gère la réception des données MQTT pour toutes les entités."""

    def __init__(self, hass, prefix):
        """Initialise le coordinateur."""
        super().__init__(
            hass,
            _LOGGER,
            name=DOMAIN,
        )
        self.prefix = prefix
        self.data = {} # Contiendra le JSON décodé

    async def _async_setup(self):
        """S'abonne au topic MQTT au démarrage."""
        topic = TOPIC_DATA.format(self.prefix)
        
        async def message_received(msg):
            """Logique déclenchée à chaque réception de message MQTT."""
            try:
                # On décode le JSON comme tu le faisais dans tes value_templates
                payload = json.loads(msg.payload)
                self.async_set_updated_data(payload)
                _LOGGER.debug("Données PvRouter reçues: %s", payload)
            except json.JSONDecodeError:
                _LOGGER.error("Erreur de décodage JSON sur le topic %s", topic)

        # Abonnement réel au broker MQTT de Home Assistant
        await async_subscribe(self.hass, topic, message_received)