"""One HA scene entity per (room, favorite scene) so Lightwick scenes work in HA automations and dashboards."""

from __future__ import annotations

from homeassistant.components.scene import Scene
from homeassistant.config_entries import ConfigEntry
from homeassistant.core import HomeAssistant, callback
from homeassistant.helpers import entity_registry
from homeassistant.helpers.entity_platform import AddEntitiesCallback

from .const import DOMAIN, EVENT_CONFIG_UPDATED
from .ha import apply_scene, favorite_scenes, rooms


class LightwickScene(Scene):
    _attr_has_entity_name = False

    def __init__(self, hass: HomeAssistant, room: dict, scene: dict) -> None:
        self.hass = hass
        self.room_id = room["id"]
        self.scene_id = scene["id"]
        self._attr_unique_id = f"{room['id']}__{scene['id']}"
        self._attr_name = f"{room['name']} {scene['name']}"
        self._attr_icon = "mdi:lightbulb-group"

    async def async_activate(self, **kwargs) -> None:
        await apply_scene(self.hass, self.hass.data[DOMAIN]["store"], self.room_id, self.scene_id)


async def async_setup_entry(hass: HomeAssistant, entry: ConfigEntry, add_entities: AddEntitiesCallback) -> None:
    store = hass.data[DOMAIN]["store"]
    live: dict[str, LightwickScene] = {}

    @callback
    def sync(_event=None) -> None:
        wanted = {
            f"{room['id']}__{scene['id']}": (room, scene)
            for room in rooms(hass, store)
            for scene in favorite_scenes(store, room["id"])
        }
        new = [LightwickScene(hass, *wanted[uid]) for uid in wanted.keys() - live.keys()]
        for uid in live.keys() - wanted.keys():
            ent = live.pop(uid)
            hass.async_create_task(ent.async_remove(force_remove=True))
            if entity_id := entity_registry.async_get(hass).async_get_entity_id("scene", DOMAIN, uid):
                entity_registry.async_get(hass).async_remove(entity_id)
        for ent in new:
            live[ent.unique_id] = ent
        if new:
            add_entities(new)

    sync()
    entry.async_on_unload(hass.bus.async_listen(EVENT_CONFIG_UPDATED, sync))
