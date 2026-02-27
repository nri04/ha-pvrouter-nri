# -*- coding: utf-8 -*-
from homeassistant.components.sensor import SensorEntity, SensorDeviceClass, SensorStateClass
from homeassistant.helpers.update_coordinator import CoordinatorEntity
from .const import DOMAIN


async def async_setup_entry(hass, entry, async_add_entities):
    coordinator = hass.data[DOMAIN][entry.entry_id]

    sensors_definitions = [
        # (Nom, Cle JSON, Unite, DeviceClass, StateClass)

        # --- Mesures electriques entree ---
        ("Vin",              "VIN",          "V",    SensorDeviceClass.VOLTAGE,       SensorStateClass.MEASUREMENT),
        ("Cin",              "CIN",          "A",    SensorDeviceClass.CURRENT,       SensorStateClass.MEASUREMENT),
        ("Pin",              "PIN",          "W",    SensorDeviceClass.POWER,         SensorStateClass.MEASUREMENT),
        ("Inject",           "INJECT",       "kWh",  SensorDeviceClass.ENERGY,        SensorStateClass.TOTAL_INCREASING),
        ("Inject I",         "INJECT_I",     "W",    SensorDeviceClass.POWER,         SensorStateClass.MEASUREMENT),

        # --- Mesures electriques sortie ---
        ("Cout",             "COUT",         "A",    SensorDeviceClass.CURRENT,       SensorStateClass.MEASUREMENT),
        ("Pout",             "POUT",         "W",    SensorDeviceClass.POWER,         SensorStateClass.MEASUREMENT),

        # --- Puissance par sortie (modeles avec 2 ballons) ---
        ("P1",               "P1",           "W",    SensorDeviceClass.POWER,         SensorStateClass.MEASUREMENT),
        ("P2",               "P2",           "W",    SensorDeviceClass.POWER,         SensorStateClass.MEASUREMENT),

        # --- Charges max ---
        ("Load 1",           "LOAD1",        "W",    SensorDeviceClass.POWER,         SensorStateClass.MEASUREMENT),
        ("Load 2",           "LOAD2",        "W",    SensorDeviceClass.POWER,         SensorStateClass.MEASUREMENT),
        ("Load 10",          "LOAD10",       "W",    SensorDeviceClass.POWER,         SensorStateClass.MEASUREMENT),
        ("Load 11",          "LOAD11",       "W",    SensorDeviceClass.POWER,         SensorStateClass.MEASUREMENT),

        # --- Energie cumulee ---
        ("Saved Power",      "SAVED_POWER",  "kWh",  SensorDeviceClass.ENERGY,        SensorStateClass.TOTAL_INCREASING),
        ("Total Power",      "TOTAL_POWER",  "kWh",  SensorDeviceClass.ENERGY,        SensorStateClass.TOTAL_INCREASING),
        ("Total S",          "TOT_S",        "kWh",  SensorDeviceClass.ENERGY,        SensorStateClass.TOTAL_INCREASING),
        ("Production",       "PROD",         "W",    SensorDeviceClass.POWER,         SensorStateClass.MEASUREMENT),
        ("Total Production", "TOT_PROD",     "kWh",  SensorDeviceClass.ENERGY,        SensorStateClass.TOTAL_INCREASING),

        # --- Borne VE ---
        ("EV Power",         "EVPOWER",      "W",    SensorDeviceClass.POWER,         SensorStateClass.MEASUREMENT),

        # --- Rendement ---
        ("Efficiency",       "EFF",          "%",    None,                            SensorStateClass.MEASUREMENT),

        # --- Temperatures ---
        ("Temp 1",           "TEMP1",        "°C",   SensorDeviceClass.TEMPERATURE,   SensorStateClass.MEASUREMENT),
        ("Temp 2",           "TEMP2",        "°C",   SensorDeviceClass.TEMPERATURE,   SensorStateClass.MEASUREMENT),
        ("Temp Ref",         "REF_T",        "°C",   SensorDeviceClass.TEMPERATURE,   SensorStateClass.MEASUREMENT),
        ("Temp Interne",     "T_RTC",        "°C",   SensorDeviceClass.TEMPERATURE,   SensorStateClass.MEASUREMENT),

        # --- Statuts sorties ---
        ("Status Out 1",     "STATUS_OUT1",  None,   None,                            None),
        ("Status Out 2",     "STATUS_OUT2",  None,   None,                            None),
        ("Load 1 Satured",   "LOAD1_SATURED",None,   None,                            None),
        ("Load 2 Satured",   "LOAD2_SATURED",None,   None,                            None),

        # --- Modes et infos systeme ---
        ("Ballon Actif",     "BALLON",       None,   None,                            None),
        ("Night",            "NIGHT",        None,   None,                            None),
        ("Ecomax",           "ECOMAX",       None,   None,                            None),
        ("Boost",            "BOOST",        None,   None,                            None),
        ("Bacteria",         "BACT",         None,   None,                            None),
        ("Suffi",            "SUFFI",        None,   None,                            None),
        ("Auto C",           "AUTO_C",       None,   None,                            None),
        ("Mode Info",        "MODEINFO",     None,   None,                            None),
        ("Display",          "DISPLAY",      None,   None,                            None),
        ("Time",             "TIME",         None,   None,                            None),

        # --- Infos reseau/appareil ---
        ("Wifi Level",       "WIFI",         "dBm",  SensorDeviceClass.SIGNAL_STRENGTH,SensorStateClass.MEASUREMENT),
        ("SSID",             "SSID",         None,   None,                            None),
        ("MQTT Status",      "MQTT",         None,   None,                            None),
        ("Model",            "MODEL",        None,   None,                            None),
        ("Firmware",         "Version",      None,   None,                            None),
    ]

    async_add_entities([
        PvRouterSensor(coordinator, name, key, unit, dc, sc)
        for name, key, unit, dc, sc in sensors_definitions
    ])


class PvRouterSensor(CoordinatorEntity, SensorEntity):

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