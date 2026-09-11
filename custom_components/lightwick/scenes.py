"""Scene catalog and the pure planner: scene + lights with roles -> per-light light.turn_on params.

Colors are {"kelvin": K} or {"h": hue, "s": sat}. HA converts to whatever each bulb supports.
Roles: main/task follow the scene's main policy, accent/ambient take the palette (ambient at half brightness).
"""

from __future__ import annotations

import hashlib
import json
from typing import Any

Color = dict[str, float]
Plan = dict[str, dict[str, Any] | None]  # entity_id -> turn_on params, None = turn off


def K(k: int) -> Color:
    return {"kelvin": k}


def H(h: float, s: float = 100) -> Color:
    return {"h": h, "s": s}


OFF = {"policy": "off"}


def white(kelvin: int, brightness: int = 100) -> dict:
    return {"policy": "white", "kelvin": kelvin, "brightness": brightness}


PALETTE = {"policy": "palette"}


def _s(id: str, name: str, group: str, main: dict, palette: list[Color], brightness: int) -> dict:
    return {"id": id, "name": name, "group": group, "main": main, "palette": palette, "brightness": brightness, "builtin": True}


# fmt: off
CATALOG: list[dict] = [
    # Natural — whites for daily life
    _s("bright",      "Bright",       "natural", white(4000),      [K(4000)],                 100),
    _s("concentrate", "Concentrate",  "natural", white(4700),      [K(4700)],                 100),
    _s("energize",    "Energize",     "natural", white(6000),      [K(6000)],                 100),
    _s("cool_bright", "Cool bright",  "natural", white(5500),      [K(5500)],                 100),
    _s("read",        "Read",         "natural", white(4000, 80),  [K(3000)],                  60),
    _s("dimmed",      "Dimmed",       "natural", white(2700, 30),  [K(2700)],                  30),
    _s("relax",       "Relax",        "natural", OFF,              [K(2200), K(2400)],         50),
    _s("cozy",        "Cozy",         "natural", OFF,              [K(2100), K(2300), K(2500)], 70),
    _s("nightlight",  "Nightlight",   "natural", OFF,              [K(2000)],                   5),
    # Warm — sunsets, fire, gold
    _s("savanna",     "Savanna dusk", "warm", OFF, [H(22, 90), H(35, 80), H(10, 95)],      70),
    _s("golden_hour", "Golden hour",  "warm", OFF, [H(40, 85), H(28, 95), K(2200)],        65),
    _s("ember",       "Ember",        "warm", OFF, [H(5, 100), H(18, 100), H(30, 90)],     40),
    _s("honey",       "Honey",        "warm", OFF, [H(42, 70), H(38, 85), K(2400)],        60),
    _s("peach",       "Peach",        "warm", OFF, [H(20, 55), H(30, 45), H(12, 60)],      65),
    _s("rose",        "Rosé",         "warm", OFF, [H(345, 45), H(355, 60), H(20, 40)],    55),
    _s("sundown",     "Sundown",      "warm", OFF, [H(300, 60), H(15, 95), H(40, 90)],     60),
    _s("candle",      "Candlelight",  "warm", OFF, [K(1900)],                              15),
    # Cool — sea, ice, sky
    _s("arctic",      "Arctic dawn",  "cool", OFF, [H(200, 60), H(220, 40), H(180, 50)],   60),
    _s("lagoon",      "Blue lagoon",  "cool", OFF, [H(190, 85), H(205, 70), H(170, 60)],   65),
    _s("deep_sea",    "Deep sea",     "cool", OFF, [H(225, 95), H(240, 85), H(200, 90)],   45),
    _s("ice",         "Ice",          "cool", OFF, [H(195, 20), K(6500), H(210, 30)],      80),
    _s("moonrise",    "Moonrise",     "cool", OFF, [H(230, 55), H(250, 40), K(4000)],      35),
    _s("mist",        "Lake mist",    "cool", OFF, [H(185, 30), H(200, 25), K(5000)],      55),
    # Nature — leaves, blossoms, auroras
    _s("forest",      "Forest",       "nature", OFF, [H(120, 80), H(95, 70), H(150, 60)],  50),
    _s("meadow",      "Meadow",       "nature", OFF, [H(80, 60), H(100, 50), K(3500)],     65),
    _s("blossom",     "Spring blossom","nature", OFF, [H(330, 50), H(120, 40), H(345, 35)], 60),
    _s("aurora",      "Aurora",       "nature", OFF, [H(140, 90), H(175, 80), H(275, 70)], 55),
    _s("lavender",    "Lavender",     "nature", OFF, [H(265, 45), H(280, 35), H(250, 50)], 50),
    # Vivid — parties, colour for its own sake
    _s("tropical",    "Tropical",     "vivid", OFF, [H(160, 100), H(320, 100), H(45, 100)], 80),
    _s("neon",        "Neon",         "vivid", OFF, [H(300, 100), H(180, 100), H(60, 100)], 90),
    _s("miami",       "Miami",        "vivid", OFF, [H(330, 90), H(190, 90), H(280, 80)],   75),
    _s("galaxy",      "Galaxy",       "vivid", OFF, [H(260, 100), H(230, 90), H(290, 85)],  50),
    _s("nebula",      "Nebula",       "vivid", OFF, [H(285, 90), H(320, 80), H(210, 90)],   55),
    _s("magma",       "Magma",        "vivid", OFF, [H(0, 100), H(20, 100), H(350, 90)],    70),
    # Night — barely there
    _s("midnight",    "Midnight",     "night", OFF, [H(240, 80)],                            8),
    _s("starry",      "Starry",       "night", OFF, [H(230, 60), H(260, 50)],               10),
    _s("moth",        "Moth",         "night", OFF, [K(2000), H(35, 60)],                   10),
    # Holiday
    _s("festive",     "Festive",      "holiday", OFF, [H(0, 100), H(120, 100)],             70),
    _s("spooky",      "Spooky",       "holiday", OFF, [H(25, 100), H(280, 100)],            60),
    _s("valentine",   "Valentine",    "holiday", OFF, [H(340, 90), H(0, 80), H(320, 60)],   55),
]
# fmt: on

GROUPS = ["natural", "warm", "cool", "nature", "vivid", "night", "holiday"]


def color_params(color: Color) -> dict[str, Any]:
    if "kelvin" in color:
        return {"color_temp_kelvin": int(color["kelvin"])}
    return {"hs_color": [round(color["h"], 1), round(color["s"], 1)]}


def plan(scene: dict, lights: list[dict], offset: int = 0) -> Plan:
    """lights: [{"entity_id", "role"}]. offset rotates the palette (dynamic scenes)."""
    if states := scene.get("states"):  # snapshot scene: explicit per-light state
        ids = {l["entity_id"] for l in lights}
        return {eid: (dict(st) if st else None) for eid, st in states.items() if eid in ids}

    main = scene.get("main", OFF)
    palette = scene.get("palette") or [K(2700)]
    brightness = scene.get("brightness", 60)
    out: Plan = {}
    takes_palette = [
        l for l in sorted(lights, key=lambda l: l["entity_id"])
        if l["role"] in ("accent", "ambient") or main["policy"] == "palette"
    ]
    for i, light in enumerate(takes_palette):
        color = palette[(i + offset) % len(palette)]
        level = brightness * (0.5 if light["role"] == "ambient" else 1)
        out[light["entity_id"]] = {**color_params(color), "brightness_pct": max(1, round(level))}
    for light in lights:
        if light["role"] in ("main", "task") and main["policy"] != "palette":
            out[light["entity_id"]] = (
                None if main["policy"] == "off"
                else {"color_temp_kelvin": main.get("kelvin", 4000), "brightness_pct": main.get("brightness", 100)}
            )
    return out


def scene_hash(scenes: list[dict], lights: list[dict]) -> str:
    """Changes whenever a hardware sync would produce different stored scenes."""
    key = [[s.get("main"), s.get("palette"), s.get("brightness"), s.get("states")] for s in scenes]
    key.append(sorted((l["entity_id"], l["role"]) for l in lights))
    return hashlib.sha1(json.dumps(key, sort_keys=True, default=str).encode()).hexdigest()[:12]
