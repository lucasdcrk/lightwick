"""Read/write Lightwick-owned automations in automations.yaml, the same way HA's own editor does.

Over WebSocket so the mobile app and the dev server avoid the REST endpoints' same-origin rule.
"""

from __future__ import annotations

import os

from homeassistant.core import HomeAssistant
from homeassistant.helpers import entity_registry
from homeassistant.util.file import write_utf8_file_atomic
from homeassistant.util.yaml import dump, load_yaml

PREFIX = "lightwick_"
ORDER = ("alias", "description", "triggers", "conditions", "actions", "mode")


def _path(hass: HomeAssistant) -> str:
    return hass.config.path("automations.yaml")


def _read(path: str) -> list[dict]:
    if not os.path.isfile(path):
        return []
    return list(load_yaml(path) or [])


def _write(path: str, data: list[dict]) -> None:
    write_utf8_file_atomic(path, dump(data))


async def get(hass: HomeAssistant, automation_id: str) -> dict | None:
    data = await hass.async_add_executor_job(_read, _path(hass))
    return next((a for a in data if str(a.get("id")) == automation_id), None)


async def save(hass: HomeAssistant, automation_id: str, config: dict) -> None:
    if not automation_id.startswith(PREFIX):
        raise ValueError("not a lightwick automation")
    path = _path(hass)
    data = await hass.async_add_executor_job(_read, path)
    value = {"id": automation_id, **{k: config[k] for k in ORDER if k in config}, **{k: v for k, v in config.items() if k not in ORDER and k != "id"}}
    idx = next((i for i, a in enumerate(data) if str(a.get("id")) == automation_id), None)
    if idx is None:
        data.append(value)
    else:
        data[idx] = value
    await hass.async_add_executor_job(_write, path, data)
    await hass.services.async_call("automation", "reload", {"id": automation_id}, blocking=True)


async def delete(hass: HomeAssistant, automation_id: str) -> None:
    path = _path(hass)
    data = [a for a in await hass.async_add_executor_job(_read, path) if str(a.get("id")) != automation_id]
    await hass.async_add_executor_job(_write, path, data)
    reg = entity_registry.async_get(hass)
    if entity_id := reg.async_get_entity_id("automation", "automation", automation_id):
        reg.async_remove(entity_id)
