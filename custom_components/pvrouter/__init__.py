# -*- coding: utf-8 -*-
import logging
from homeassistant.core import HomeAssistant
from homeassistant.config_entries import ConfigEntry
from .const import DOMAIN, CONF_TOPIC_PREFIX
from .coordinator import PvRouterCoordinator

_LOGGER = logging.getLogger(__name__)

PLATFORMS = ["sensor", "switch", "button"]


async def async_setup_entry(hass: HomeAssistant, entry: ConfigEntry) -> bool:


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
