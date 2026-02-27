import logging
from homeassistant.core import HomeAssistant
from homeassistant.config_entries import ConfigEntry
from .const import DOMAIN, CONF_TOPIC_PREFIX
from .coordinator import PvRouterCoordinator

_LOGGER = logging.getLogger(__name__)

# On ajoute switch et button ici pour qu'ils fonctionnent
PLATFORMS = ["sensor", "switch", "button"]

async def async_setup_entry(hass: HomeAssistant, entry: ConfigEntry) -> bool:
    """Configuration de l'intégration via l'interface active."""
    
    # Déclaration du dossier pour ta carte personnalisée
    hass.http.register_static_path(
        "/pvrouter-nri/static",
        hass.config.path("custom_components/pvrouter/www"),
        True
    )

    # Récupération du préfixe MQTT
    prefix = entry.data.get(CONF_TOPIC_PREFIX)

    # Initialisation du coordinateur
    coordinator = PvRouterCoordinator(hass, prefix)
    await coordinator._async_setup()

    hass.data.setdefault(DOMAIN, {})
    hass.data[DOMAIN][entry.entry_id] = coordinator

    # Chargement de toutes les plateformes définies plus haut
    await hass.config_entries.async_forward_entry_setups(entry, PLATFORMS)

    return True

async def async_unload_entry(hass: HomeAssistant, entry: ConfigEntry) -> bool:
    """Déchargement de l'intégration."""
    unload_ok = await hass.config_entries.async_unload_platforms(entry, PLATFORMS)
    if unload_ok:
        hass.data[DOMAIN].pop(entry.entry_id)

    return unload_ok
