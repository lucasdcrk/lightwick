"""ZHA adapter. ponytail: written against the 2026.9 zha API without a dongle to test on; treat as experimental."""

from __future__ import annotations

from homeassistant.core import HomeAssistant

SCENES_CLUSTER = 0x0005
CMD_REMOVE_ALL, CMD_STORE, CMD_RECALL = 0x03, 0x04, 0x05
BIND_CLUSTERS = {0x0006: "OnOff", 0x0008: "LevelControl", 0x0300: "Color"}


class ZHA:
    name = "zha"

    def __init__(self, hass: HomeAssistant) -> None:
        self.hass = hass

    @property
    def available(self) -> bool:
        return "zha" in self.hass.config.components

    async def start(self) -> None:
        pass

    def stop(self) -> None:
        pass

    def _gateway(self):
        from homeassistant.components.zha.helpers import get_zha_gateway

        return get_zha_gateway(self.hass)

    def _device(self, gateway, ieee: str):
        from zigpy.types import EUI64

        return gateway.get_device(EUI64.convert(ieee))

    def _light_endpoint(self, gateway, ieee: str) -> int:
        for ep_id, ep in self._device(gateway, ieee).device.endpoints.items():
            if ep_id and 0x0006 in ep.in_clusters:
                return ep_id
        return 1

    async def ensure_group(self, room_id: str, ieees: list[str]) -> dict:
        from zha.zigbee.group import GroupMemberReference
        from zigpy.types import EUI64

        gateway = self._gateway()
        name = f"lightwick_{room_id}"
        members = [
            GroupMemberReference(ieee=EUI64.convert(ieee), endpoint_id=self._light_endpoint(gateway, ieee))
            for ieee in ieees
        ]
        group = next((g for g in gateway.groups.values() if g.name == name), None)
        if group is None:
            group = await gateway.async_create_zigpy_group(name, members)
        else:
            have = {(str(m.device.ieee), m.endpoint_id) for m in group.members}
            want = {(str(m.ieee), m.endpoint_id) for m in members}
            if have != want:
                await group.async_remove_members(
                    [GroupMemberReference(m.device.ieee, m.endpoint_id) for m in group.members if (str(m.device.ieee), m.endpoint_id) not in want]
                )
                await group.async_add_members([m for m in members if (str(m.ieee), m.endpoint_id) not in have])
        return {"backend": self.name, "group": name, "group_id": group.group_id}

    async def _group_command(self, entry: dict, command: int, args: list) -> None:
        await self.hass.services.async_call(
            "zha",
            "issue_zigbee_group_command",
            {"group": entry["group_id"], "cluster_id": SCENES_CLUSTER, "command": command, "args": args},
            blocking=True,
        )

    async def store_scene(self, entry: dict, number: int, name: str) -> None:
        await self._group_command(entry, CMD_STORE, [entry["group_id"], number])

    async def clear_scenes(self, entry: dict) -> None:
        await self._group_command(entry, CMD_REMOVE_ALL, [entry["group_id"]])

    async def recall(self, entry: dict, number: int, transition: float | None = None) -> None:
        await self._group_command(entry, CMD_RECALL, [entry["group_id"], number])

    async def bind(self, remote_ieee: str, entry: dict) -> None:
        from zha.application.helpers import ClusterBinding

        device = self._device(self._gateway(), remote_ieee)
        bindings = [
            ClusterBinding(name=cname, type="out", id=cid, endpoint_id=ep_id)
            for ep_id, ep in device.device.endpoints.items()
            if ep_id
            for cid, cname in BIND_CLUSTERS.items()
            if cid in ep.out_clusters
        ]
        await device.async_bind_to_group(entry["group_id"], bindings)
