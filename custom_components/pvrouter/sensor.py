from homeassistant.components.sensor import (
    SensorEntity,
    SensorDeviceClass,
    SensorStateClass,
)
from homeassistant.helpers.update_coordinator import CoordinatorEntity
from .const import DOMAIN


async def async_setup_entry(hass, entry, async_add_entities):
    """Configuration des capteurs à partir du coordinateur."""
    coordinator = hass.data[DOMAIN][entry.entry_id]

    sensors_definitions = [
        ("Temp 1",           "TEMP1",       "°C",  SensorDeviceClass.TEMPERATURE, SensorStateClass.MEASUREMENT),
        ("Temp 2",           "TEMP2",       "°C",  SensorDeviceClass.TEMPERATURE, SensorStateClass.MEASUREMENT),
        ("Vin",              "VIN",         "V",   SensorDeviceClass.VOLTAGE,     SensorStateClass.MEASUREMENT),
        ("Cin",              "CIN",         "A",   SensorDeviceClass.CURRENT,     SensorStateClass.MEASUREMENT),
        ("Pin",              "PIN",         "W",   SensorDeviceClass.POWER,       SensorStateClass.MEASUREMENT),
        ("Inject",           "INJECT",      "kWh", SensorDeviceClass.ENERGY,      SensorStateClass.TOTAL_INCREASING),
        ("Cout",             "COUT",        "A",   SensorDeviceClass.CURRENT,     SensorStateClass.MEASUREMENT),
        ("Pout",             "POUT",        "W",   SensorDeviceClass.POWER,       SensorStateClass.MEASUREMENT),
        ("P1",               "P1",          "W",   SensorDeviceClass.POWER,       SensorStateClass.MEASUREMENT),
        ("P2",               "P2",          "W",   SensorDeviceClass.POWER,       SensorStateClass.MEASUREMENT),
        ("Load 1",           "LOAD1",       "W",   SensorDeviceClass.POWER,       SensorStateClass.MEASUREMENT),
        ("Load 2",           "LOAD2",       "W",   SensorDeviceClass.POWER,       SensorStateClass.MEASUREMENT),
        ("Saved Power",      "SAVED_POWER", "kWh", SensorDeviceClass.ENERGY,      SensorStateClass.TOTAL_INCREASING),
        ("Total Power",      "TOTAL_POWER", "kWh", SensorDeviceClass.ENERGY,      SensorStateClass.TOTAL_INCREASING),
        ("Efficiency",       "EFF",         "%",   None,                          SensorStateClass.MEASUREMENT),
        ("Production",       "PROD",        "W",   SensorDeviceClass.POWER,       SensorStateClass.MEASUREMENT),
        ("Total Production", "TOT_PROD",    "kWh", SensorDeviceClass.ENERGY,      SensorStateClass.TOTAL_INCREASING),
        ("Firmware",         "Version",     None,  None,                          None),
        ("Mode Info",        "MODEINFO",    None,  None,                          None),
    ]

    entities = [
        PvRouterSensor(coordinator, name, json_key, unit, d_class, s_class)
        for name, json_key, unit, d_class, s_class in sensors_definitions
    ]
    async_add_entities(entities)


class PvRouterSensor(CoordinatorEntity, SensorEntity):
    """Capteur générique pour le PvRouter."""

    def __init__(self, coordinator, name, json_key, unit, d_class, s_class):
        super().__init__(coordinator)
        self._attr_name = f"PvRouter {name}"
        self._json_key = json_key
        self._attr_native_unit_of_measurement = unit
        self._attr_device_class = d_class
        self._attr_state_class = s_class
        self._attr_unique_id = f"{coordinator.prefix}_{json_key}"
        self._attr_device_info = {
            "identifiers": {(DOMAIN, coordinator.prefix)},
            "name": "PvRouter NRI",
            "manufacturer": "Smart Pv-Router",
            "model": coordinator.prefix,
        }

    @property
    def native_value(self):
        if self.coordinator.data:
            return self.coordinator.data.get(self._json_key)
        return None

    @property
    def available(self) -> bool:
        return self.coordinator.last_update_success and bool(self.coordinator.data)
