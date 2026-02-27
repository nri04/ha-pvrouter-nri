# -*- coding: utf-8 -*-
import os
import logging
from homeassistant.core import HomeAssistant
from homeassistant.config_entries import ConfigEntry
from homeassistant.components.frontend import add_extra_js_url
from homeassistant.components.http import StaticPathConfig
from .const import DOMAIN, CONF_TOPIC_PREFIX
from .coordinator import PvRouterCoordinator

_LOGGER = logging.getLogger(__name__)

PLATFORMS = ["sensor", "switch", "button"]
CARD_URL = "/pvrouter-nri/pvrouter-card.js"


async def async_setup_entry(hass: HomeAssistant, entry: ConfigEntry) -> bool:

    # Enregistrement du fichier JS de la carte
    www_path = hass.config.path("custom_components/pvrouter/www/pvrouter-card.js")
    if os.path.isfile(www_path):
        await hass.http.async_register_static_paths([
            StaticPathConfig(CARD_URL, www_path, False)
        ])
        add_extra_js_url(hass, CARD_URL)
        _LOGGER.debug("PvRouter card enregistree: %s", CARD_URL)

    prefix = entry.data.get(CONF_TOPIC_PREFIX)
    coordinator = PvRouterCoordinator(hass, prefix)
    await coordinator._async_setup()

    hass.data.setdefault(DOMAIN, {})
    hass.data[DOMAIN][entry.entry_id] = coordinator

    await hass.config_entries.async_forward_entry_setups(entry, PLATFORMS)
    return True


async def async_unload_entry(hass: HomeAssistant, entry: ConfigEntry) -> bool:
    unload_ok = await hass.config_entries.async_unload_platforms(entry, PLATFORMS)
    if unload_ok:
        coordinator = hass.data[DOMAIN].pop(entry.entry_id)
        coordinator.unsubscribe()
    return unload_ok
