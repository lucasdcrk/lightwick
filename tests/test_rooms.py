from rooms import build_rooms


def test_light_falls_back_to_device_area_and_rooms_sort_by_name():
    areas = {"kitchen": "Kitchen", "bed": "Bedroom"}
    lights = [
        ("light.kitchen_ceiling", "kitchen", None),
        ("light.bed_lamp", None, "dev1"),
        ("light.orphan", None, None),
    ]
    rooms = build_rooms(areas, lights, {"dev1": "bed"})
    assert [r["name"] for r in rooms] == ["Bedroom", "Kitchen"]
    assert rooms[0]["lights"] == ["light.bed_lamp"]
    assert rooms[1]["lights"] == ["light.kitchen_ceiling"]
