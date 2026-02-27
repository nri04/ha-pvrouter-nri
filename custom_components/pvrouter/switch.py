from homeassistant.components.switch import SwitchEntity
from homeassistant.components.mqtt import async_publish
from .const import DOMAIN, TOPIC_SETMODE, TOPIC_SWITCH


async def async_setup_entry(hass, entry, async_add_entities):
    """Configuration des switches PvRouter."""
    coordinator = hass.data[DOMAIN][entry.entry_id]

    async_add_entities([
        PvRouterSwitch(coordinator, "Switch Ballon", "SWITCH", "1", "0"),
        PvRouterModeSwitch(coordinator, "Mode Automatique",   "11"),
        PvRouterModeSwitch(coordinator, "Activation Forcée",  "22"),
        PvRouterModeSwitch(coordinator, "Désactiver Sorties", "00"),
        PvRouterOutput1Switch(coordinator),
    ])


class PvRouterSwitch(SwitchEntity):
    """Switch simple ON/OFF."""

    def __init__(self, coordinator, name, topic_suffix, payload_on, payload_off):
        self.coordinator = coordinator
        self._attr_name = f"PvRouter {name}"
        self._topic = f"{coordinator.prefix}/{topic_suffix}"
        self._payload_on = payload_on
        self._payload_off = payload_off
        self._attr_unique_id = f"{coordinator.prefix}_{name.lower().replace(' ', '_')}"
        self._attr_device_info = {
            "identifiers": {(DOMAIN, coordinator.prefix)},
            "name": "PvRouter NRI",
        }

    @property
    def is_on(self):
        return self.coordinator.data.get("BALLON") == 1

    async def async_turn_on(self, **kwargs):
        await async_publish(self.hass, self._topic, self._payload_on)

    async def async_turn_off(self, **kwargs):
        await async_publish(self.hass, self._topic, self._payload_off)


class PvRouterModeSwitch(SwitchEntity):
    """Switch pour changer le mode (SETMODE)."""

    def __init__(self, coordinator, name, code_on):
        self.coordinator = coordinator
        self._attr_name = f"PvRouter {name}"
        self._code_on = code_on
        self._attr_unique_id = f"{coordinator.prefix}_{name.lower().replace(' ', '_')}"
        self._attr_device_info = {
            "identifiers": {(DOMAIN, coordinator.prefix)},
            "name": "PvRouter NRI",
        }

    @property
    def is_on(self):
        return str(self.coordinator.data.get("MODEINFO", "")) == self._code_on

    async def async_turn_on(self, **kwargs):
        topic = TOPIC_SETMODE.format(self.coordinator.prefix)
        await async_publish(self.hass, topic, self._code_on)

    async def async_turn_off(self, **kwargs):
        topic = TOPIC_SETMODE.format(self.coordinator.prefix)
        await async_publish(self.hass, topic, "33")


class PvRouterOutput1Switch(SwitchEntity):
    """Gère le mode complexe avec le calcul modulo 10."""

    def __init__(self, coordinator):
        self.coordinator = coordinator
        self._attr_name = "PvRouter Activation Forcée Sortie 1"
        self._attr_unique_id = f"{coordinator.prefix}_sortie1_force"
        self._attr_device_info = {
            "identifiers": {(DOMAIN, coordinator.prefix)},
            "name": "PvRouter NRI",
        }

    @property
    def is_on(self):
        try:
            mode = int(self.coordinator.data.get("MODEINFO", 0))
            return (mode % 10) == 2
        except (ValueError, TypeError):
            return False

    async def async_turn_on(self, **kwargs):
        topic = TOPIC_SETMODE.format(self.coordinator.prefix)
        await async_publish(self.hass, topic, "32")

    async def async_turn_off(self, **kwargs):
        topic = TOPIC_SETMODE.format(self.coordinator.prefix)
        await async_publish(self.hass, topic, "33")
