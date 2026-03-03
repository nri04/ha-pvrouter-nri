# -*- coding: utf-8 -*-
import logging
from pathlib import Path
from homeassistant.core import HomeAssistant
from homeassistant.config_entries import ConfigEntry
from homeassistant.components.frontend import add_extra_js_url
from homeassistant.components.http import StaticPathConfig
from .const import DOMAIN, CONF_TOPIC_PREFIX
from .coordinator import PvRouterCoordinator

_LOGGER = logging.getLogger(__name__)

PLATFORMS = ["sensor", "button", "select", "number", "switch"]
CARD_VERSION = "1.1.3"
CARD_URL = f"/pvrouter-nri/pvrouter-card.js?v={CARD_VERSION}"
WWW_URL = "/pvrouter-nri"


async def async_setup_entry(
    hass: HomeAssistant, entry: ConfigEntry
) -> bool:

    www_path = Path(
        hass.config.path("custom_components/pvrouter/www")
    )

    if www_path.is_dir():
        # Enregistrement du chemin statique
        # (ignoré silencieusement si déjà enregistré)
        try:
            await hass.http.async_register_static_paths([
                StaticPathConfig(
                    WWW_URL, str(www_path), cache_headers=False
                )
            ])
        except Exception:
            pass  # déjà enregistré, pas grave

        # Toujours ré-enregistrer la carte JS avec la version courante
        # pour forcer le navigateur à recharger le bon fichier
        add_extra_js_url(hass, CARD_URL)
        _LOGGER.info(
            "PvRouter: carte enregistree sur %s", CARD_URL
        )

    prefix = entry.data.get(CONF_TOPIC_PREFIX)
    coordinator = PvRouterCoordinator(hass, prefix)
    await coordinator._async_setup()

    hass.data.setdefault(DOMAIN, {})
    hass.data[DOMAIN][entry.entry_id] = coordinator

    await hass.config_entries.async_forward_entry_setups(
        entry, PLATFORMS
    )
    return True


async def async_unload_entry(
    hass: HomeAssistant, entry: ConfigEntry
) -> bool:
    unload_ok = await hass.config_entries.async_unload_platforms(
        entry, PLATFORMS
    )
    if unload_ok:
        coordinator = hass.data[DOMAIN].pop(entry.entry_id)
        coordinator.unsubscribe()
    return unload_ok
