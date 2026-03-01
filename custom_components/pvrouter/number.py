# -*- coding: utf-8 -*-
from homeassistant.components.number import (
    NumberEntity, NumberMode
)
from .const import DOMAIN


async def async_setup_entry(hass, entry, async_add_entities):
    coordinator = hass.data[DOMAIN][entry.entry_id]
    async_add_entities([
        PvRouterBoostDuree(coordinator),
    ])


class PvRouterBoostDuree(NumberEntity):
    """Durée du boost en minutes (1–240, défaut 30)."""

    def __init__(self, coordinator):
        self.coordinator = coordinator
        self._attr_name = "PvRouter Boost Durée"
        self._attr_unique_id = (
            f"{coordinator.prefix}_boost_duree"
        )
        self._attr_icon = "mdi:timer-outline"
        self._attr_native_min_value = 1
        self._attr_native_max_value = 240
        self._attr_native_step = 1
        self._attr_native_unit_of_measurement = "min"
        self._attr_mode = NumberMode.BOX
        self._attr_native_value = 30
        self._attr_device_info = {
            "identifiers": {(DOMAIN, coordinator.prefix)},
            "name": "PvRouter NRI",
        }

    async def async_set_native_value(self, value: float):
        self._attr_native_value = int(value)
        self.async_write_ha_state()
