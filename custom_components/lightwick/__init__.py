from pathlib import Path

import voluptuous as vol
from homeassistant.components import frontend, panel_custom
from homeassistant.components.http import StaticPathConfig
from homeassistant.config_entries import ConfigEntry
from homeassistant.const import Platform
from homeassistant.core import HomeAssistant, ServiceCall

from .const import DOMAIN, PANEL_URL, STATIC_URL
from .dynamic import Dynamic
from .ha import apply_scene
from .remotes import Remotes
from .store import LightwickStore
from .websocket import register as register_ws
from .z2m import Z2M
from .zha import ZHA

FRONTEND_DIR = Path(__file__).parent / "frontend"
PLATFORMS = [Platform.SCENE]
APPLY_SCHEMA = vol.Schema({vol.Required("room_id"): str, vol.Required("scene_id"): str, vol.Optional("transition"): vol.Coerce(float)})


async def async_setup_entry(hass: HomeAssistant, entry: ConfigEntry) -> bool:
    store = LightwickStore(hass)
    await store.load()
    adapters = {a.name: a for a in (Z2M(hass), ZHA(hass))}
    for adapter in adapters.values():
        await adapter.start()
    ctx = hass.data[DOMAIN] = {
        "store": store,
        "adapters": adapters,
        "dynamic": Dynamic(hass, store),
        "remotes": Remotes(hass, store),
    }
    hass.data["lightwick_adapters"] = adapters
    await ctx["remotes"].reload()

    register_ws(hass)

    async def handle_apply(call: ServiceCall) -> None:
        await apply_scene(hass, store, call.data["room_id"], call.data["scene_id"], call.data.get("transition"))

    hass.services.async_register(DOMAIN, "apply_scene", handle_apply, schema=APPLY_SCHEMA)

    await hass.config_entries.async_forward_entry_setups(entry, PLATFORMS)
    await hass.http.async_register_static_paths([StaticPathConfig(STATIC_URL, str(FRONTEND_DIR), cache_headers=False)])
    await panel_custom.async_register_panel(
        hass,
        webcomponent_name="lightwick-panel",
        frontend_url_path=PANEL_URL,
        module_url=f"{STATIC_URL}/panel.js",
        sidebar_title="Lightwick",
        sidebar_icon="mdi:lightbulb-group",
        require_admin=False,
    )
    return True


async def async_unload_entry(hass: HomeAssistant, entry: ConfigEntry) -> bool:
    ctx = hass.data.pop(DOMAIN)
    ctx["dynamic"].stop_all()
    for adapter in ctx["adapters"].values():
        adapter.stop()
    hass.services.async_remove(DOMAIN, "apply_scene")
    frontend.async_remove_panel(hass, PANEL_URL)
    return await hass.config_entries.async_unload_platforms(entry, PLATFORMS)
