import voluptuous as vol
from homeassistant import config_entries
from .const import DOMAIN, CONF_TOPIC_PREFIX

class PvRouterConfigFlow(config_entries.ConfigFlow, domain=DOMAIN):
    """Handle a config flow for PvRouter NRI."""
    VERSION = 1

    async def async_step_user(self, user_input=None):
        """Etape initiale de configuration."""
        if user_input is not None:
            # On crée l'entrée en utilisant la clé définie dans const.py
            return self.async_create_entry(
                title=f"PvRouter ({user_input[CONF_TOPIC_PREFIX]})", 
                data=user_input
            )

        return self.async_show_form(
            step_id="user",
            data_schema=vol.Schema({
                vol.Required(CONF_TOPIC_PREFIX, default="PVROUTER005"): str,
            })
        )