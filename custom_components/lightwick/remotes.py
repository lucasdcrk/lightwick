"""Remote buttons -> room actions. Attaches HA device triggers in-process, no automation entities to orphan."""

from __future__ import annotations

import logging

from homeassistant.components.device_automation import DeviceAutomationType, async_get_device_automations
from homeassistant.core import HomeAssistant
from homeassistant.helpers import device_registry, entity_registry
from homeassistant.helpers.trigger import async_initialize_triggers, async_validate_trigger_config

from .const import DOMAIN
from .ha import apply_scene, favorite_scenes, light_backend, room
from .store import LightwickStore

_LOGGER = logging.getLogger(__name__)
# integrations whose device triggers are physical buttons
REMOTE_DOMAINS = {"mqtt", "zha", "deconz", "hue", "shelly", "tuya", "zwave_js", "lutron_caseta", "homekit_controller", "matter", "esphome"}
DIM_STEP = 20


def button_key(trigger: dict) -> str:
    return f"{trigger.get('type')}|{trigger.get('subtype')}"


class Remotes:
    def __init__(self, hass: HomeAssistant, store: LightwickStore) -> None:
        self.hass = hass
        self.store = store
        self._detach: dict[str, list] = {}
        self._cycle: dict[str, int] = {}

    async def candidates(self) -> list[dict]:
        """Devices with button triggers and no light entity."""
        dr, er = device_registry.async_get(self.hass), entity_registry.async_get(self.hass)
        lit = {e.device_id for e in er.entities.values() if e.domain == "light"}
        ids = [d.id for d in dr.devices if d.id not in lit]
        triggers = await async_get_device_automations(self.hass, DeviceAutomationType.TRIGGER, ids)
        out = []
        for device_id, trigs in triggers.items():
            buttons = sorted({button_key(t) for t in trigs if t.get("domain") in REMOTE_DOMAINS and t.get("subtype")})
            if not buttons:
                continue
            d = dr.async_get(device_id)
            backend, ieee = light_backend(d.identifiers)
            out.append({
                "device_id": device_id,
                "name": d.name_by_user or d.name or device_id,
                "model": d.model,
                "area_id": d.area_id,
                "backend": backend,
                "ieee": ieee,
                "buttons": buttons,
            })
        return sorted(out, key=lambda r: r["name"].lower())

    async def reload(self) -> None:
        for detach in self._detach.values():
            for remove in detach:
                remove()
        self._detach.clear()
        for device_id, cfg in self.store.data["remotes"].items():
            try:
                await self._attach(device_id, cfg)
            except Exception:  # noqa: BLE001 - one broken remote must not take the rest down
                _LOGGER.exception("could not attach remote %s", device_id)

    async def _attach(self, device_id: str, cfg: dict) -> None:
        triggers = await async_get_device_automations(self.hass, DeviceAutomationType.TRIGGER, [device_id])
        by_key = {button_key(t): t for t in triggers.get(device_id, [])}
        removes = []
        for key, action in cfg["buttons"].items():
            if key not in by_key:
                continue
            trigger = {k: v for k, v in by_key[key].items() if k != "metadata"}
            validated = await async_validate_trigger_config(self.hass, [trigger])

            async def run(run_variables, context=None, *, _room=cfg["room_id"], _action=action):
                await self.act(_room, _action)

            remove = await async_initialize_triggers(self.hass, validated, run, DOMAIN, f"remote {device_id} {key}", _LOGGER.log)
            if remove:
                removes.append(remove)
        self._detach[device_id] = removes

    async def act(self, room_id: str, action: dict) -> None:
        kind = action["action"]
        r = room(self.hass, self.store, room_id)
        ids = [l["entity_id"] for l in r["lights"]]
        if kind == "scene":
            await apply_scene(self.hass, self.store, room_id, action["scene_id"])
        elif kind == "cycle":
            favs = favorite_scenes(self.store, room_id)
            if favs:
                i = self._cycle.get(room_id, -1) + 1
                self._cycle[room_id] = i
                await apply_scene(self.hass, self.store, room_id, favs[i % len(favs)]["id"])
        elif kind in ("dim_up", "dim_down"):
            step = DIM_STEP if kind == "dim_up" else -DIM_STEP
            on = [i for i in ids if (s := self.hass.states.get(i)) and s.state == "on"]
            if on:
                await self.hass.services.async_call("light", "turn_on", {"entity_id": on, "brightness_step_pct": step}, blocking=True)
        elif kind in ("on", "off", "toggle"):
            any_on = any((s := self.hass.states.get(i)) and s.state == "on" for i in ids)
            service = {"on": "turn_on", "off": "turn_off"}.get(kind, "turn_off" if any_on else "turn_on")
            await self.hass.services.async_call("light", service, {"entity_id": ids}, blocking=True)
