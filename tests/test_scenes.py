from scenes import CATALOG, GROUPS, plan, scene_hash

LIGHTS = [
    {"entity_id": "light.ceiling", "role": "main"},
    {"entity_id": "light.lamp_a", "role": "accent"},
    {"entity_id": "light.lamp_b", "role": "accent"},
    {"entity_id": "light.strip", "role": "ambient"},
    {"entity_id": "light.desk", "role": "task"},
]
BY_ID = {s["id"]: s for s in CATALOG}


def test_relax_turns_main_off_and_spreads_palette():
    p = plan(BY_ID["relax"], LIGHTS)
    assert p["light.ceiling"] is None and p["light.desk"] is None
    assert p["light.lamp_a"]["color_temp_kelvin"] == 2200
    assert p["light.lamp_b"]["color_temp_kelvin"] == 2400
    assert p["light.strip"]["brightness_pct"] == 25  # ambient at half


def test_read_keeps_main_white_and_offset_rotates_palette():
    p = plan(BY_ID["read"], LIGHTS)
    assert p["light.ceiling"] == {"color_temp_kelvin": 4000, "brightness_pct": 80}
    rotated = plan(BY_ID["savanna"], LIGHTS, offset=1)
    assert rotated["light.lamp_a"]["hs_color"] == plan(BY_ID["savanna"], LIGHTS)["light.lamp_b"]["hs_color"]


def test_snapshot_scene_only_touches_known_lights():
    scene = {"states": {"light.lamp_a": {"brightness_pct": 10}, "light.gone": None}}
    assert plan(scene, LIGHTS) == {"light.lamp_a": {"brightness_pct": 10}}


def test_catalog_is_consistent():
    assert len(BY_ID) == len(CATALOG), "duplicate scene id"
    assert {s["group"] for s in CATALOG} <= set(GROUPS)
    assert scene_hash([BY_ID["relax"]], LIGHTS) == scene_hash([BY_ID["relax"]], LIGHTS)
    assert scene_hash([BY_ID["relax"]], LIGHTS) != scene_hash([BY_ID["read"]], LIGHTS)
