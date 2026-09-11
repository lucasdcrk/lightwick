"""WebSocket API used by the panel and the mobile app."""

from __future__ import annotations

import logging
import uuid

import voluptuous as vol
from homeassistant.components import websocket_api
from homeassistant.core import HomeAssistant, callback

from .const import DOMAIN, ROLES
from .ha import all_scenes, apply_scene, current_states, favorite_scenes, hardware_lights, room, rooms
from .scenes import GROUPS, plan, scene_hash

_LOGGER = logging.getLogger(__name__)
COMMANDS: list = []


def command(schema: dict):
    def wrap(fn):
        handler = websocket_api.websocket_command({vol.Required("type"): f"{DOMAIN}/{schema.pop('_')}", **schema})(
            websocket_api.async_response(fn)
        )
        COMMANDS.append(handler)
        return handler

    return wrap


def _ctx(hass: HomeAssistant):
    return hass.data[DOMAIN]


@callback
def register(hass: HomeAssistant) -> None:
    for handler in COMMANDS:
        websocket_api.async_register_command(hass, handler)


def config_payload(hass: HomeAssistant) -> dict:
    ctx = _ctx(hass)
    store = ctx["store"]
    return {
        "rooms": rooms(hass, store),
        "scenes": list(all_scenes(store).values()),
        "scene_groups": GROUPS,
        "roles": list(ROLES),
        "favorites": store.data["favorites"],
        "remotes": store.data["remotes"],
        "dynamic": ctx["dynamic"].state,
        "backends": {name: adapter.available for name, adapter in ctx["adapters"].items()},
    }


@command({"_": "config"})
async def ws_config(hass, connection, msg):
    connection.send_result(msg["id"], config_payload(hass))


@command({"_": "role/set", vol.Required("entity_id"): str, vol.Required("role"): vol.In(ROLES)})
async def ws_role_set(hass, connection, msg):
    store = _ctx(hass)["store"]
    store.data["roles"][msg["entity_id"]] = msg["role"]
    await store.save()
    connection.send_result(msg["id"])


@command({
    "_": "scene/apply",
    vol.Required("room_id"): str,
    vol.Required("scene_id"): str,
    vol.Optional("transition"): vol.Coerce(float),
})
async def ws_scene_apply(hass, connection, msg):
    ctx = _ctx(hass)
    ctx["dynamic"].stop(msg["room_id"], notify=False)
    await apply_scene(hass, ctx["store"], msg["room_id"], msg["scene_id"], msg.get("transition"))
    connection.send_result(msg["id"])


@command({"_": "scene/preview", vol.Required("room_id"): str, vol.Required("scene"): dict})
async def ws_scene_preview(hass, connection, msg):
    """Apply an unsaved scene definition (custom scene editor live preview)."""
    from .ha import apply_plan

    r = room(hass, _ctx(hass)["store"], msg["room_id"])
    await apply_plan(hass, plan(msg["scene"], r["lights"]), 0.4)
    connection.send_result(msg["id"])


SCENE_SCHEMA = vol.Schema({
    vol.Optional("id"): str,
    vol.Required("name"): str,
    vol.Optional("group", default="custom"): str,
    vol.Optional("main"): dict,
    vol.Optional("palette"): [dict],
    vol.Optional("brightness"): vol.All(int, vol.Range(1, 100)),
    vol.Optional("states"): dict,
    vol.Optional("room_id"): str,
})


@command({"_": "scene/save", vol.Required("scene"): SCENE_SCHEMA})
async def ws_scene_save(hass, connection, msg):
    store = _ctx(hass)["store"]
    scene = {**msg["scene"], "builtin": False}
    scene.setdefault("id", f"custom_{uuid.uuid4().hex[:8]}")
    store.data["scenes"][scene["id"]] = scene
    await store.save()
    connection.send_result(msg["id"], scene)


@command({"_": "scene/snapshot", vol.Required("room_id"): str, vol.Required("name"): str})
async def ws_scene_snapshot(hass, connection, msg):
    """Save the room's current light state as a scene, Hue style."""
    store = _ctx(hass)["store"]
    r = room(hass, store, msg["room_id"])
    scene = {
        "id": f"custom_{uuid.uuid4().hex[:8]}",
        "name": msg["name"],
        "group": "custom",
        "room_id": msg["room_id"],
        "states": current_states(hass, [l["entity_id"] for l in r["lights"]]),
        "builtin": False,
    }
    store.data["scenes"][scene["id"]] = scene
    store.data["favorites"].setdefault(msg["room_id"], []).append(scene["id"])
    await store.save()
    connection.send_result(msg["id"], scene)


@command({"_": "scene/delete", vol.Required("scene_id"): str})
async def ws_scene_delete(hass, connection, msg):
    store = _ctx(hass)["store"]
    store.data["scenes"].pop(msg["scene_id"], None)
    for favs in store.data["favorites"].values():
        if msg["scene_id"] in favs:
            favs.remove(msg["scene_id"])
    await store.save()
    connection.send_result(msg["id"])


@command({"_": "favorites/set", vol.Required("room_id"): str, vol.Required("scene_ids"): [str]})
async def ws_favorites_set(hass, connection, msg):
    store = _ctx(hass)["store"]
    store.data["favorites"][msg["room_id"]] = msg["scene_ids"]
    await store.save()
    connection.send_result(msg["id"])


@command({
    "_": "dynamic/set",
    vol.Required("room_id"): str,
    vol.Required("scene_id"): vol.Any(str, None),
    vol.Optional("interval", default=20): vol.All(vol.Coerce(float), vol.Range(2, 600)),
    vol.Optional("transition", default=4): vol.All(vol.Coerce(float), vol.Range(0, 60)),
})
async def ws_dynamic_set(hass, connection, msg):
    dyn = _ctx(hass)["dynamic"]
    if msg["scene_id"] is None:
        dyn.stop(msg["room_id"])
    else:
        dyn.start(msg["room_id"], msg["scene_id"], msg["interval"], msg["transition"])
    connection.send_result(msg["id"])


@command({"_": "remotes/candidates"})
async def ws_remotes_candidates(hass, connection, msg):
    connection.send_result(msg["id"], await _ctx(hass)["remotes"].candidates())


@command({
    "_": "remote/set",
    vol.Required("device_id"): str,
    vol.Required("room_id"): str,
    vol.Required("buttons"): {str: {vol.Required("action"): str, vol.Optional("scene_id"): str}},
    vol.Optional("bind", default=False): bool,
})
async def ws_remote_set(hass, connection, msg):
    ctx = _ctx(hass)
    store = ctx["store"]
    cfg = {"room_id": msg["room_id"], "buttons": msg["buttons"], "bind": msg["bind"], "bound": False}
    if msg["bind"]:
        remote = next((c for c in await ctx["remotes"].candidates() if c["device_id"] == msg["device_id"]), None)
        entry = store.data["hardware"].get(msg["room_id"])
        if remote and remote["backend"] and entry and entry["backend"] == remote["backend"]:
            try:
                await ctx["adapters"][remote["backend"]].bind(remote["ieee"], entry)
                cfg["bound"] = True
            except Exception:  # noqa: BLE001
                _LOGGER.exception("bind failed for %s", msg["device_id"])
    store.data["remotes"][msg["device_id"]] = cfg
    await store.save()
    await ctx["remotes"].reload()
    connection.send_result(msg["id"], cfg)


@command({"_": "remote/delete", vol.Required("device_id"): str})
async def ws_remote_delete(hass, connection, msg):
    ctx = _ctx(hass)
    ctx["store"].data["remotes"].pop(msg["device_id"], None)
    await ctx["store"].save()
    await ctx["remotes"].reload()
    connection.send_result(msg["id"])


@command({"_": "hardware/sync", vol.Required("room_id"): str})
async def ws_hardware_sync(hass, connection, msg):
    """Push the room's favorite scenes into the Zigbee group so remotes and recalls work without HA."""
    from .ha import apply_plan

    ctx = _ctx(hass)
    store = ctx["store"]
    r = room(hass, store, msg["room_id"])
    hw_lights = hardware_lights(r)
    backend = r["hardware"]["backend"]
    if not hw_lights or backend not in ctx["adapters"] or not ctx["adapters"][backend].available:
        connection.send_error(msg["id"], "no_hardware", "no Zigbee lights in this room")
        return
    adapter = ctx["adapters"][backend]
    ids = [l["entity_id"] for l in hw_lights]
    favs = favorite_scenes(store, r["id"])
    await hass.services.async_call("scene", "create", {"scene_id": "lightwick_restore", "snapshot_entities": ids}, blocking=True)
    try:
        entry = await adapter.ensure_group(r["id"], [l["ieee"] for l in hw_lights])
        await adapter.clear_scenes(entry)
        numbers = {}
        for n, scene in enumerate(favs, start=1):
            await apply_plan(hass, plan(scene, hw_lights), 0)
            await adapter.store_scene(entry, n, scene["name"])
            numbers[scene["id"]] = n
        store.data["hardware"][r["id"]] = {**entry, "scenes": numbers, "hash": scene_hash(favs, hw_lights)}
        await store.save()
    finally:
        await hass.services.async_call("scene", "turn_on", {"entity_id": "scene.lightwick_restore"}, blocking=True)
    connection.send_result(msg["id"], store.data["hardware"][r["id"]])


@command({"_": "automation/get", vol.Required("automation_id"): str})
async def ws_automation_get(hass, connection, msg):
    from . import automations

    connection.send_result(msg["id"], await automations.get(hass, msg["automation_id"]))


@command({"_": "automation/save", vol.Required("automation_id"): str, vol.Required("config"): dict})
async def ws_automation_save(hass, connection, msg):
    from . import automations

    await automations.save(hass, msg["automation_id"], msg["config"])
    connection.send_result(msg["id"])


@command({"_": "automation/delete", vol.Required("automation_id"): str})
async def ws_automation_delete(hass, connection, msg):
    from . import automations

    await automations.delete(hass, msg["automation_id"])
    connection.send_result(msg["id"])
