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
        self.data = {}
        self._unsubscribe = None

    async def _async_setup(self):
        """Abonnement au topic MQTT au demarrage."""
        topic = TOPIC_DATA.format(self.prefix)

        async def message_received(msg):
            try:
                payload = json.loads(msg.payload)
                self.async_set_updated_data(payload)
                _LOGGER.debug("Donnees PvRouter recues: %s", payload)
            except json.JSONDecodeError:
                _LOGGER.error("Erreur JSON sur le topic %s", topic)

        self._unsubscribe = await async_subscribe(self.hass, topic, message_received)

    def unsubscribe(self):
        """Desabonnement MQTT propre."""
        if self._unsubscribe:
            self._unsubscribe()
            self._unsubscribe = None
