# -*- coding: utf-8 -*-
from homeassistant.components.switch import SwitchEntity
from homeassistant.components.mqtt import async_publish
from .const import DOMAIN, TOPIC_SWITCH


async def async_setup_entry(hass, entry, async_add_entities):
    coordinator = hass.data[DOMAIN][entry.entry_id]
    async_add_entities([
        PvRouterBallonSwitch(coordinator),
    ])


class PvRouterBallonSwitch(SwitchEntity):
    """Switch pilotant le relais de sélection du ballon.

    ON  → Ballon B actif (résistance secondaire)
    OFF → Ballon A actif (résistance principale)
    """

    def __init__(self, coordinator):
        self.coordinator = coordinator
        self._attr_name = "PvRouter Switch Ballon"
        self._attr_unique_id = (
            f"{coordinator.prefix}_switch_ballon"
        )
        self._attr_icon = "mdi:water-boiler"
        self._attr_device_info = {
            "identifiers": {(DOMAIN, coordinator.prefix)},
            "name": "PvRouter NRI",
        }

    @property
    def is_on(self):
        return self.coordinator.data.get("BALLON") == 1

    async def async_turn_on(self, **kwargs):
        topic = TOPIC_SWITCH.format(self.coordinator.prefix)
        await async_publish(self.hass, topic, "1")

    async def async_turn_off(self, **kwargs):
        topic = TOPIC_SWITCH.format(self.coordinator.prefix)
        await async_publish(self.hass, topic, "0")
