# -*- coding: utf-8 -*-
import json
import logging
from homeassistant.helpers.update_coordinator import DataUpdateCoordinator
from homeassistant.components.mqtt import async_subscribe
from .const import DOMAIN, TOPIC_DATA

_LOGGER = logging.getLogger(__name__)

class PvRouterCoordinator(DataUpdateCoordinator):
    """Coordinateur MQTT pour PvRouter."""

    def __init__(self, hass, prefix):
        super().__init__(hass, _LOGGER, name=DOMAIN)
        self.prefix = prefix
        self.data = {} # On initialise avec un dict vide
        self._unsubscribe = None

    async def _async_setup(self):
        """Abonnement au topic MQTT au démarrage."""
        topic = TOPIC_DATA.format(self.prefix)

        async def message_received(msg):
            try:
                payload = json.loads(msg.payload)
                if not isinstance(payload, dict):
                    return
                
                # Fusion des données au lieu de remplacement total
                # Cela évite de perdre des attributs si un message est partiel
                new_data = {**self.data, **payload}
                self.async_set_updated_data(new_data)
                
            except json.JSONDecodeError:
                _LOGGER.error("Erreur JSON reçue sur %s", topic)

        self._unsubscribe = await async_subscribe(
            self.hass, topic, message_received
        )

    def unsubscribe(self):
        if self._unsubscribe:
            self._unsubscribe()
            self._unsubscribe = None
