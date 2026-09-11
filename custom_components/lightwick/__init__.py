from pathlib import Path

import voluptuous as vol
from homeassistant.components import panel_custom, websocket_api
from homeassistant.components.http import StaticPathConfig
from homeassistant.config_entries import ConfigEntry
from homeassistant.core import HomeAssistant, callback
from homeassistant.helpers import area_registry, device_registry, entity_registry

from .const import DOMAIN, PANEL_URL, STATIC_URL
from .rooms import build_rooms

FRONTEND_DIR = Path(__file__).parent / "frontend"


async def async_setup_entry(hass: HomeAssistant, entry: ConfigEntry) -> bool:
    websocket_api.async_register_command(hass, ws_rooms)
    await hass.http.async_register_static_paths(
        [StaticPathConfig(STATIC_URL, str(FRONTEND_DIR), cache_headers=False)]
    )
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
    panel_custom.async_remove_panel(hass, PANEL_URL)
    return True


@websocket_api.websocket_command({vol.Required("type"): f"{DOMAIN}/rooms"})
@callback
def ws_rooms(hass: HomeAssistant, connection: websocket_api.ActiveConnection, msg: dict) -> None:
    areas = {a.id: a.name for a in area_registry.async_get(hass).async_list_areas()}
    lights = [
        (e.entity_id, e.area_id, e.device_id)
        for e in entity_registry.async_get(hass).entities.values()
        if e.domain == "light" and not e.disabled and not e.hidden
    ]
    device_areas = {d.id: d.area_id for d in device_registry.async_get(hass).devices.values()}
    connection.send_result(msg["id"], build_rooms(areas, lights, device_areas))
