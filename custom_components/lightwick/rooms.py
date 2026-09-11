"""Pure room-building logic, no HA imports so it stays testable without HA."""

from collections.abc import Iterable, Mapping


def build_rooms(
    areas: Mapping[str, str],
    lights: Iterable[tuple[str, str | None, str | None]],
    device_areas: Mapping[str, str | None],
) -> list[dict]:
    """areas: id -> name. lights: (entity_id, area_id, device_id). device_areas: device_id -> area_id.

    A light belongs to its own area, else to its device's area.
    """
    rooms = {aid: {"id": aid, "name": name, "lights": []} for aid, name in areas.items()}
    for entity_id, area_id, device_id in lights:
        aid = area_id or device_areas.get(device_id or "")
        if aid in rooms:
            rooms[aid]["lights"].append(entity_id)
    return sorted(rooms.values(), key=lambda r: r["name"].lower())
