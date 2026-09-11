"""Dynamic scenes: rotate a scene's palette across the room's lights on a timer. Runs in HA, survives the app closing."""

from __future__ import annotations

import asyncio
import logging

from homeassistant.core import HomeAssistant

from .const import EVENT_CONFIG_UPDATED
from .ha import apply_scene
from .store import LightwickStore

_LOGGER = logging.getLogger(__name__)


class Dynamic:
    def __init__(self, hass: HomeAssistant, store: LightwickStore) -> None:
        self.hass = hass
        self.store = store
        self.state: dict[str, dict] = {}  # room_id -> {scene_id, interval, transition}; ponytail: in-memory, restart stops loops
        self._tasks: dict[str, asyncio.Task] = {}

    def start(self, room_id: str, scene_id: str, interval: float, transition: float) -> None:
        self.stop(room_id, notify=False)
        self.state[room_id] = {"scene_id": scene_id, "interval": interval, "transition": transition}
        self._tasks[room_id] = self.hass.async_create_background_task(self._loop(room_id), f"lightwick dynamic {room_id}")
        self.hass.bus.async_fire(EVENT_CONFIG_UPDATED)

    def stop(self, room_id: str, notify: bool = True) -> None:
        if task := self._tasks.pop(room_id, None):
            task.cancel()
        self.state.pop(room_id, None)
        if notify:
            self.hass.bus.async_fire(EVENT_CONFIG_UPDATED)

    def stop_all(self) -> None:
        for room_id in list(self._tasks):
            self.stop(room_id, notify=False)

    async def _loop(self, room_id: str) -> None:
        offset = 0
        while (cfg := self.state.get(room_id)):
            try:
                await apply_scene(self.hass, self.store, room_id, cfg["scene_id"], transition=cfg["transition"], offset=offset, hardware=False)
            except Exception:  # noqa: BLE001
                _LOGGER.exception("dynamic scene step failed in %s", room_id)
            offset += 1
            await asyncio.sleep(cfg["interval"])
