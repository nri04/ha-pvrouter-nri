# -*- coding: utf-8 -*-
from homeassistant.components.select import SelectEntity
from homeassistant.components.mqtt import async_publish
from .const import DOMAIN, TOPIC_SETMODE

# MODEINFO = mode_S2 * 10 + mode_S1
# 0 = Arrêt, 1 = Auto (routage), 2 = Marche forcée

OPTIONS = ["Arrêt", "Auto", "Marche forcée"]
MODE_TO_STR = {0: "Arrêt", 1: "Auto", 2: "Marche forcée"}
STR_TO_MODE = {"Arrêt": 0, "Auto": 1, "Marche forcée": 2}


async def async_setup_entry(hass, entry, async_add_entities):
    coordinator = hass.data[DOMAIN][entry.entry_id]
    async_add_entities([
        PvRouterOutputSelect(coordinator, sortie=1),
        PvRouterOutputSelect(coordinator, sortie=2),
    ])


class PvRouterOutputSelect(SelectEntity):

    def __init__(self, coordinator, sortie: int):
        self.coordinator = coordinator
        self._sortie = sortie
        self._attr_name = f"PvRouter Sortie {sortie}"
        self._attr_unique_id = (
            f"{coordinator.prefix}_sortie{sortie}_mode"
        )
        self._attr_options = OPTIONS
        self._attr_device_info = {
            "identifiers": {(DOMAIN, coordinator.prefix)},
            "name": "PvRouter NRI",
        }

    @property
    def current_option(self):
        try:
            modeinfo = int(
                self.coordinator.data.get("MODEINFO", 11)
            )
            if self._sortie == 1:
                mode = modeinfo % 10
            else:
                mode = modeinfo // 10 % 10
            return MODE_TO_STR.get(mode, "Auto")
        except (ValueError, TypeError):
            return "Auto"

    async def async_select_option(self, option: str):
        new_mode = STR_TO_MODE.get(option, 1)
        try:
            modeinfo = int(
                self.coordinator.data.get("MODEINFO", 11)
            )
            s1 = modeinfo % 10
            s2 = modeinfo // 10 % 10
        except (ValueError, TypeError):
            s1, s2 = 1, 1

        if self._sortie == 1:
            s1 = new_mode
        else:
            s2 = new_mode

        payload = str(s2 * 10 + s1)
        topic = TOPIC_SETMODE.format(self.coordinator.prefix)
        await async_publish(self.hass, topic, payload)
