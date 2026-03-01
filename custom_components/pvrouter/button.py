# -*- coding: utf-8 -*-
from homeassistant.components.button import (
    ButtonEntity, ButtonDeviceClass
)
from homeassistant.components.mqtt import async_publish
from .const import DOMAIN, TOPIC_RESET, TOPIC_BOOST


async def async_setup_entry(hass, entry, async_add_entities):
    coordinator = hass.data[DOMAIN][entry.entry_id]
    async_add_entities([
        PvRouterButton(
            coordinator, "Reboot",
            TOPIC_RESET, "1", ButtonDeviceClass.RESTART
        ),
        PvRouterButton(
            coordinator, "Boost ON",
            TOPIC_BOOST, "1", ButtonDeviceClass.UPDATE
        ),
        PvRouterButton(
            coordinator, "Boost OFF",
            TOPIC_BOOST, "0", ButtonDeviceClass.UPDATE
        ),
    ])


class PvRouterButton(ButtonEntity):

    def __init__(
        self, coordinator, name, topic_template,
        payload, device_class
    ):
        self.coordinator = coordinator
        self._attr_name = f"PvRouter {name}"
        self._topic = topic_template.format(coordinator.prefix)
        self._payload = payload
        self._attr_device_class = device_class
        self._attr_unique_id = (
            f"{coordinator.prefix}_"
            f"{name.lower().replace(' ', '_')}"
        )
        self._attr_device_info = {
            "identifiers": {(DOMAIN, coordinator.prefix)},
            "name": "PvRouter NRI",
        }

    async def async_press(self):
        await async_publish(self.hass, self._topic, self._payload)
