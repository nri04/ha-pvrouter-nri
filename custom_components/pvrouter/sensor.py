# -*- coding: utf-8 -*-
from homeassistant.components.sensor import (
    SensorEntity, SensorDeviceClass, SensorStateClass
)
from homeassistant.helpers.update_coordinator import CoordinatorEntity
from .const import DOMAIN

# Constantes de classes pour la lisibilité
M = SensorStateClass.MEASUREMENT
TI = SensorStateClass.TOTAL_INCREASING
POW = SensorDeviceClass.POWER
ENE = SensorDeviceClass.ENERGY
TMP = SensorDeviceClass.TEMPERATURE
SIG = SensorDeviceClass.SIGNAL_STRENGTH

async def async_setup_entry(hass, entry, async_add_entities):
    """Configuration des capteurs via config_entry."""
    coordinator = hass.data[DOMAIN][entry.entry_id]

    # (Nom, Cle JSON, Unite, DeviceClass, StateClass)
    sensors_definitions = [
        # --- Mesures électriques entrée ---
        ("Vin", "VIN", "V", SensorDeviceClass.VOLTAGE, M),
        ("Cin", "CIN", "A", SensorDeviceClass.CURRENT, M),
        ("Pin", "PIN", "W", POW, M),
        ("Inject", "INJECT", "kWh", ENE, TI),
        ("Inject I", "INJECT_I", "W", POW, M),

        # --- Mesures électriques sortie ---
        ("Cout", "COUT", "A", SensorDeviceClass.CURRENT, M),
        ("Pout", "POUT", "W", POW, M),

        # --- Puissance par sortie ---
        ("P1", "P1", "W", POW, M),
        ("P2", "P2", "W", POW, M),

        # --- Charges max ---
        ("Load 1", "LOAD1", "W", POW, M),
        ("Load 2", "LOAD2", "W", POW, M),
        ("Load 10", "LOAD10", "W", POW, M),
        ("Load 11", "LOAD11", "W", POW, M),

        # --- Énergie cumulée ---
        ("Saved Power", "SAVED_POWER", "kWh", ENE, TI),
        ("Total Power", "TOTAL_POWER", "kWh", ENE, TI),
        ("Total S", "TOT_S", "kWh", ENE, TI),
        ("Production", "PROD", "W", POW, M),
        ("Total Production", "TOT_PROD", "kWh", ENE, TI),

        # --- Borne VE ---
        ("EV Power", "EVPOWER", "W", POW, M),

        # --- Rendement ---
        ("Efficiency", "EFF", "%", None, M),

        # --- Températures ---
        ("Temp 1", "TEMP1", "°C", TMP, M),
        ("Temp 2", "TEMP2", "°C", TMP, M),
        ("Temp Ref", "REF_T", "°C", TMP, M),
        ("Temp Interne", "T_RTC", "°C", TMP, M),

        # --- Statuts sorties ---
        ("Status Out 1", "STATUS_OUT1", None, None, None),
        ("Status Out 2", "STATUS_OUT2", None, None, None),
        ("Load 1 Satured", "LOAD1_SATURED", None, None, None),
        ("Load 2 Satured", "LOAD2_SATURED", None, None, None),

        # --- Modes et infos système ---
        ("Ballon Actif", "BALLON", None, None, None),
        ("Night", "NIGHT", None, None, None),
        ("Ecomax", "ECOMAX", None, None, None),
        ("Boost", "BOOST", None, None, None),
        ("Bacteria", "BACT", None, None, None),
        ("Suffi", "SUFFI", None, None, None),
        ("Auto C", "AUTO_C", None, None, None),
        ("Mode Info", "MODEINFO", None, None, None),
        ("Display", "DISPLAY", None, None, None),
        ("Time", "TIME", None, None, None),

        # --- Infos réseau/appareil ---
        ("Wifi Level", "WIFI", "dBm", SIG, M),
        ("SSID", "SSID", None, None, None),
        ("MQTT Status", "MQTT", None, None, None),
        ("Model", "MODEL", None, None, None),
        ("Firmware", "Version", None, None, None),
    ]

    entities = [
        PvRouterSensor(coordinator, name, key, unit, dc, sc)
        for name, key, unit, dc, sc in sensors_definitions
    ]
    entities.append(PvRouterDataSensor(coordinator))
    async_add_entities(entities)


class PvRouterSensor(CoordinatorEntity, SensorEntity):
    """Capteur standard lié au coordinateur."""

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
        """Récupère la valeur depuis les données du coordinateur."""
        if not self.coordinator.data:
            return None
        
        val = self.coordinator.data.get(self._json_key)
        
        # Sécurité : Si c'est une mesure numérique, on force le cast en float
        if self._attr_state_class in [M, TI] and val is not None:
            try:
                return float(val)
            except (ValueError, TypeError):
                return val
        return val

    @property
    def available(self) -> bool:
        """
        Reste disponible tant qu'une première donnée a été reçue.
        Empêche la carte de disparaître au moindre lag réseau.
        """
        return bool(self.coordinator.data)


class PvRouterDataSensor(CoordinatorEntity, SensorEntity):
    """
    Sensor technique exposant tout le JSON en attributs.
    Indispensable pour la carte JS (données synchronisées).
    """

    def __init__(self, coordinator):
        super().__init__(coordinator)
        self._attr_name = "PvRouter Data"
        self._attr_unique_id = f"{coordinator.prefix}_data"
        self._attr_icon = "mdi:solar-power"
        self._attr_device_info = {
            "identifiers": {(DOMAIN, coordinator.prefix)},
            "name": "PvRouter NRI",
            "manufacturer": "Smart Pv-Router",
            "model": coordinator.prefix,
        }

    @property
    def native_value(self):
        """Retourne l'heure du routeur ou 'OK'."""
        if self.coordinator.data:
            return self.coordinator.data.get("TIME", "Online")
        return "Offline"

    @property
    def extra_state_attributes(self):
        """Expose l'intégralité du JSON pour la carte Lovelace."""
        if self.coordinator.data:
            return dict(self.coordinator.data)
        return {}

    @property
    def available(self) -> bool:
        """Garantit que le sensor est présent pour la carte JS."""
        return True
