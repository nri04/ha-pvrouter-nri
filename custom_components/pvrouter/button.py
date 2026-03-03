# -*- coding: utf-8 -*-
from homeassistant.components.button import (
    ButtonEntity, ButtonDeviceClass
)
from homeassistant.components.mqtt import async_publish
from .const import DOMAIN, TOPIC_RESET, TOPIC_SWITCH, TOPIC_BOOST


async def async_setup_entry(hass, entry, async_add_entities):
    coordinator = hass.data[DOMAIN][entry.entry_id]
    async_add_entities([
        PvRouterButton(
            coordinator, "Reboot",
            TOPIC_RESET, "1", ButtonDeviceClass.RESTART
        ),
        PvRouterBallonButton(coordinator),
        PvRouterBoostButton(coordinator),
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


class PvRouterBallonButton(ButtonEntity):
    """Un appui = pulse '1' sur SWITCH → le firmware bascule le ballon."""

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

    async def async_press(self):
        topic = TOPIC_SWITCH.format(self.coordinator.prefix)
        await async_publish(self.hass, topic, "1")


class PvRouterBoostButton(ButtonEntity):
    """Bascule le boost ON/OFF.

    - Si boost inactif : envoie la durée lue sur
      number.pvrouter_boost_duree (ou 30 par défaut)
    - Si boost actif   : envoie 0 pour l'arrêter
    """

    def __init__(self, coordinator):
        self.coordinator = coordinator
        self._attr_name = "PvRouter Boost"
        self._attr_unique_id = (
            f"{coordinator.prefix}_boost_toggle"
        )
        self._attr_icon = "mdi:lightning-bolt"
        self._attr_device_info = {
            "identifiers": {(DOMAIN, coordinator.prefix)},
            "name": "PvRouter NRI",
        }

    async def async_press(self):
        topic = TOPIC_BOOST.format(self.coordinator.prefix)
        boost_raw = self.coordinator.data.get("BOOST")
        boost_active = str(boost_raw) in ("True", "true", "1")

        if boost_active:
            payload = "0"
        else:
            # Lire la durée depuis le number entity
            dur_entity = self.hass.states.get(
                f"number.{self.coordinator.prefix}_boost_duree"
            )
            try:
                dur = int(float(dur_entity.state))
            except (AttributeError, ValueError, TypeError):
                dur = 30
            payload = str(max(1, dur))

        await async_publish(self.hass, topic, payload)
