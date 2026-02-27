import logging
from homeassistant.core import HomeAssistant
from homeassistant.config_entries import ConfigEntry
from .const import DOMAIN, CONF_TOPIC_PREFIX
from .coordinator import PvRouterCoordinator

_LOGGER = logging.getLogger(__name__)

# Liste des plateformes qu'on va créer (on commence par sensor)
PLATFORMS = ["sensor"]

async def async_setup_entry(hass: HomeAssistant, entry: ConfigEntry) -> bool:
    """Configuration de l'intégration via l'interface active."""
    
    # 1. On récupère le préfixe MQTT configuré par l'utilisateur
    prefix = entry.data.get(CONF_TOPIC_PREFIX)

    # 2. On crée l'instance du coordinateur pour cette installation
    coordinator = PvRouterCoordinator(hass, prefix)

    # 3. On initialise l'écoute MQTT
    await coordinator._async_setup()

    # 4. On stocke le coordinateur pour que les capteurs y aient accès plus tard
    hass.data.setdefault(DOMAIN, {})
    hass.data[DOMAIN][entry.entry_id] = coordinator

    # 5. On demande à HA de charger les fichiers sensor.py, switch.py, etc.
    await hass.config_entries.async_forward_entry_setups(entry, PLATFORMS)

    return True

async def async_unload_entry(hass: HomeAssistant, entry: ConfigEntry) -> bool:
    """Si l'utilisateur supprime ou désactive l'intégration."""
    unload_ok = await hass.config_entries.async_unload_platforms(entry, PLATFORMS)
    if unload_ok:
        hass.data[DOMAIN].pop(entry.entry_id)

    return unload_ok