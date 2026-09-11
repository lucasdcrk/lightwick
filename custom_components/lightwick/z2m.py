"""Zigbee2MQTT adapter: groups, in-bulb scenes, binding. Talks MQTT through HA's MQTT integration."""

from __future__ import annotations

import asyncio
import json

from homeassistant.components import mqtt
from homeassistant.core import HomeAssistant, callback

from .const import Z2M_BASE

# scene_store captures the bulbs' current state; give them time to settle after the software apply
SETTLE_SECONDS = 1.5


class Z2M:
    name = "z2m"

    def __init__(self, hass: HomeAssistant) -> None:
        self.hass = hass
        self.devices: dict[str, dict] = {}  # ieee -> device
        self.groups: dict[str, dict] = {}  # friendly_name -> group
        self._changed = asyncio.Event()
        self._unsub: list = []

    @property
    def available(self) -> bool:
        return bool(self.devices)

    async def start(self) -> None:
        if "mqtt" not in self.hass.config.components:
            return
        self._unsub = [
            await mqtt.async_subscribe(self.hass, f"{Z2M_BASE}/bridge/devices", self._on_devices),
            await mqtt.async_subscribe(self.hass, f"{Z2M_BASE}/bridge/groups", self._on_groups),
        ]

    def stop(self) -> None:
        for unsub in self._unsub:
            unsub()

    @callback
    def _on_devices(self, msg) -> None:
        self.devices = {d["ieee_address"]: d for d in json.loads(msg.payload)}
        self._changed.set()

    @callback
    def _on_groups(self, msg) -> None:
        self.groups = {g["friendly_name"]: g for g in json.loads(msg.payload)}
        self._changed.set()

    async def _publish(self, topic: str, payload: dict) -> None:
        await mqtt.async_publish(self.hass, f"{Z2M_BASE}/{topic}", json.dumps(payload))

    async def _wait(self, predicate, timeout: float = 5) -> None:
        for _ in range(int(timeout * 10)):
            if predicate():
                return
            self._changed.clear()
            try:
                await asyncio.wait_for(self._changed.wait(), 0.1)
            except TimeoutError:
                pass
        raise TimeoutError("zigbee2mqtt did not confirm")

    def friendly(self, ieee: str) -> str:
        return self.devices[ieee]["friendly_name"]

    def _members(self, name: str) -> set[str]:
        return {m["ieee_address"] for m in self.groups[name]["members"]}

    async def ensure_group(self, room_id: str, ieees: list[str]) -> dict:
        """Create/reconcile the room's Zigbee group. Returns the hardware entry to store."""
        name = f"lightwick_{room_id}"
        if name not in self.groups:
            await self._publish("bridge/request/group/add", {"friendly_name": name})
            await self._wait(lambda: name in self.groups)
        want = set(ieees)
        for ieee in want - self._members(name):
            await self._publish("bridge/request/group/members/add", {"group": name, "device": self.friendly(ieee)})
        for ieee in self._members(name) - want:
            if ieee in self.devices:
                await self._publish("bridge/request/group/members/remove", {"group": name, "device": self.friendly(ieee)})
        await self._wait(lambda: self._members(name) == want)
        return {"backend": self.name, "group": name, "group_id": self.groups[name]["id"]}

    async def store_scene(self, entry: dict, number: int, name: str) -> None:
        await asyncio.sleep(SETTLE_SECONDS)
        await self._publish(f"{entry['group']}/set", {"scene_store": {"ID": number, "name": name}})

    async def clear_scenes(self, entry: dict) -> None:
        await self._publish(f"{entry['group']}/set", {"scene_remove_all": ""})

    async def recall(self, entry: dict, number: int, transition: float | None = None) -> None:
        payload: dict = {"scene_recall": number}
        if transition is not None:
            payload["transition"] = transition
        await self._publish(f"{entry['group']}/set", payload)

    async def bind(self, remote_ieee: str, entry: dict) -> None:
        await self._publish("bridge/request/device/bind", {"from": self.friendly(remote_ieee), "to": entry["group"]})
