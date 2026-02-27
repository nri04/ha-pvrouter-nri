from homeassistant.components.sensor import (
    SensorEntity,
    SensorDeviceClass,
    SensorStateClass,
)
from .const import DOMAIN

async def async_setup_entry(hass, entry, async_add_entities):
    """Configuration des capteurs à partir du coordinateur."""
    coordinator = hass.data[DOMAIN][entry.entry_id]
    
    # On définit ici TOUS tes capteurs basés sur ton YAML
    sensors_definitions = [
        # Nom, Clé JSON, Unité, Device Class, State Class
        ("Temp 1", "TEMP1", "°C", SensorDeviceClass.TEMPERATURE, SensorStateClass.MEASUREMENT),
        ("Temp 2", "TEMP2", "°C", SensorDeviceClass.TEMPERATURE, SensorStateClass.MEASUREMENT),
        ("Vin", "VIN", "V", SensorDeviceClass.VOLTAGE, SensorStateClass.MEASUREMENT),
        ("Cin", "CIN", "A", SensorDeviceClass.CURRENT, SensorStateClass.MEASUREMENT),
        ("Pin", "PIN", "W", SensorDeviceClass.POWER, SensorStateClass.MEASUREMENT),
        ("Inject", "INJECT", "kWh", SensorDeviceClass.ENERGY, SensorStateClass.TOTAL_INCREASING),
        ("Cout", "COUT", "A", SensorDeviceClass.CURRENT, SensorStateClass.MEASUREMENT),
        ("Pout", "POUT", "W", SensorDeviceClass.POWER, SensorStateClass.MEASUREMENT),
        ("P1", "P1", "W", SensorDeviceClass.POWER, SensorStateClass.MEASUREMENT),
        ("P2", "P2", "W", SensorDeviceClass.POWER, SensorStateClass.MEASUREMENT),
        ("Load 1", "LOAD1", "W", SensorDeviceClass.POWER, SensorStateClass.MEASUREMENT),
        ("Load 2", "LOAD2", "W", SensorDeviceClass.POWER, SensorStateClass.MEASUREMENT),
        ("Saved Power", "SAVED_POWER", "kWh", SensorDeviceClass.ENERGY, SensorStateClass.TOTAL_INCREASING),
        ("Total Power", "TOTAL_POWER", "kWh", SensorDeviceClass.ENERGY, SensorStateClass.TOTAL_INCREASING),
        ("Efficiency", "EFF", "%", None, SensorStateClass.MEASUREMENT),
        ("Production", "PROD", "W", SensorDeviceClass.POWER, SensorStateClass.MEASUREMENT),
        ("Total Production", "TOT_PROD", "kWh", SensorDeviceClass.ENERGY, SensorStateClass.TOTAL_INCREASING),
        # Capteurs de texte/info
        ("Firmware", "Version", None, None, None),
        ("Mode Info", "MODEINFO", None, None, None),
    ]

    entities = []
    for name, json_key, unit, d_class, s_class in sensors_definitions:
        entities.append(
            PvRouterSensor(coordinator, name, json_key, unit, d_class, s_class)
        )
    
    async_add_entities(entities)

class PvRouterSensor(SensorEntity):
    """Capteur générique pour le PvRouter."""

    def __init__(self, coordinator, name, json_key, unit, d_class, s_class):
        self.coordinator = coordinator
        self._attr_name = f"PvRouter {name}"
        self._json_key = json_key
        self._attr_native_unit_of_measurement = unit
        self._attr_device_class = d_class
        self._attr_state_class = s_class
        self._attr_unique_id = f"{coordinator.prefix}_{json_key}"
        
        # On lie l'appareil pour qu'ils soient tous groupés dans HA
        self._attr_device_info = {
            "identifiers": {(DOMAIN, coordinator.prefix)},
            "name": "PvRouter",
            "manufacturer": "Smart Pv-Router",
            "model": coordinator.prefix,
        }

    @property
    def native_value(self):
        """Récupère la valeur depuis le dictionnaire du coordinateur."""
        if self.coordinator.data:
            return self.coordinator.data.get(self._json_key)
        return None

    @property
    def should_poll(self) -> bool:
        """Pas de polling, le coordinateur pousse les données."""
        return False

    async def async_added_to_hass(self):
        """S'enregistre auprès du coordinateur pour les mises à jour."""
        self.async_on_remove(
            self.coordinator.async_add_listener(self.async_write_ha_state)
        )