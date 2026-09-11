"""Glue between HA registries/services and the pure scene planner."""

from __future__ import annotations

import asyncio
from typing import Any

from homeassistant.core import HomeAssistant
from homeassistant.helpers import area_registry, device_registry, entity_registry

from .rooms import build_rooms
from .scenes import CATALOG, plan, scene_hash
from .store import LightwickStore


def light_backend(identifiers: set[tuple[str, str]]) -> tuple[str | None, str | None]:
    """-> (backend, ieee) from device registry identifiers."""
    for domain, ident in identifiers:
        if domain == "mqtt" and ident.startswith("zigbee2mqtt_"):
            return "z2m", ident.removeprefix("zigbee2mqtt_")
        if domain == "zha":
            return "zha", ident
    return None, None


def rooms(hass: HomeAssistant, store: LightwickStore) -> list[dict]:
    """Rooms with their lights, roles and backends."""
    ar, er, dr = area_registry.async_get(hass), entity_registry.async_get(hass), device_registry.async_get(hass)
    areas = {a.id: a.name for a in ar.async_list_areas()}
    entries = [e for e in er.entities.values() if e.domain == "light" and not e.disabled and not e.hidden]
    device_areas = {d.id: d.area_id for d in dr.devices}
    result = build_rooms(areas, [(e.entity_id, e.area_id, e.device_id) for e in entries], device_areas)
    by_id = {e.entity_id: e for e in entries}
    roles = store.data["roles"]
    for room in result:
        lights = []
        for entity_id in room["lights"]:
            device = dr.async_get(by_id[entity_id].device_id) if by_id[entity_id].device_id else None
            backend, ieee = light_backend(device.identifiers) if device else (None, None)
            lights.append({"entity_id": entity_id, "role": roles.get(entity_id, "accent"), "backend": backend, "ieee": ieee})
        room["lights"] = lights
        room["hardware"] = hardware_status(store, room)
    return result


def room(hass: HomeAssistant, store: LightwickStore, room_id: str) -> dict:
    for r in rooms(hass, store):
        if r["id"] == room_id:
            return r
    raise ValueError(f"unknown room {room_id}")


def all_scenes(store: LightwickStore) -> dict[str, dict]:
    return {s["id"]: s for s in CATALOG} | store.data["scenes"]


def favorite_scenes(store: LightwickStore, room_id: str) -> list[dict]:
    scenes = all_scenes(store)
    return [scenes[s] for s in store.data["favorites"].get(room_id, []) if s in scenes]


def hardware_lights(room: dict) -> list[dict]:
    return [l for l in room["lights"] if l["backend"]]


def hardware_status(store: LightwickStore, room: dict) -> dict:
    hw_lights = hardware_lights(room)
    entry = store.data["hardware"].get(room["id"])
    current = scene_hash(favorite_scenes(store, room["id"]), hw_lights) if hw_lights else None
    return {
        "available": bool(hw_lights),
        "backend": hw_lights[0]["backend"] if hw_lights else None,
        "synced": bool(entry) and entry.get("hash") == current,
        "scenes": entry.get("scenes", {}) if entry else {},
    }


async def apply_plan(hass: HomeAssistant, plan_: dict[str, dict | None], transition: float | None = None) -> None:
    """One service call per distinct parameter set, all in parallel."""
    groups: dict[str, list[str]] = {}
    params: dict[str, dict | None] = {}
    for entity_id, p in plan_.items():
        key = repr(sorted(p.items())) if p else "off"
        groups.setdefault(key, []).append(entity_id)
        params[key] = p
    calls = []
    for key, ids in groups.items():
        p = params[key]
        data: dict[str, Any] = {"entity_id": ids}
        if transition is not None:
            data["transition"] = transition
        if p is None:
            calls.append(hass.services.async_call("light", "turn_off", data, blocking=True))
        else:
            calls.append(hass.services.async_call("light", "turn_on", {**data, **p}, blocking=True))
    await asyncio.gather(*calls)


async def apply_scene(
    hass: HomeAssistant,
    store: LightwickStore,
    room_id: str,
    scene_id: str,
    transition: float | None = None,
    offset: int = 0,
    hardware: bool = True,
) -> None:
    r = room(hass, store, room_id)
    scene = all_scenes(store)[scene_id]
    lights = r["lights"]
    adapters = hass.data.get("lightwick_adapters", {})
    hw = r["hardware"]
    if hardware and hw["synced"] and scene_id in hw["scenes"] and hw["backend"] in adapters:
        entry = store.data["hardware"][room_id]
        await adapters[hw["backend"]].recall(entry, hw["scenes"][scene_id], transition)
        lights = [l for l in lights if not l["backend"]]
    if lights:
        await apply_plan(hass, plan(scene, lights, offset), transition)


def current_states(hass: HomeAssistant, entity_ids: list[str]) -> dict[str, dict | None]:
    """Snapshot lights into scene 'states' form."""
    out: dict[str, dict | None] = {}
    for entity_id in entity_ids:
        st = hass.states.get(entity_id)
        if not st or st.state != "on":
            out[entity_id] = None
            continue
        a = st.attributes
        p: dict[str, Any] = {"brightness_pct": round((a.get("brightness") or 255) / 255 * 100)}
        if a.get("color_mode") == "color_temp" and a.get("color_temp_kelvin"):
            p["color_temp_kelvin"] = a["color_temp_kelvin"]
        elif a.get("hs_color"):
            p["hs_color"] = list(a["hs_color"])
        out[entity_id] = p
    return out
