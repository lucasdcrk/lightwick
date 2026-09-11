"""One-shot seed for the dev HA: onboard, add lightwick, mint a token into apps/web/.env, area the demo lights.

Idempotent enough to rerun: skips onboarding if already done.
"""

import asyncio
import json
import sys
import urllib.parse
import urllib.request
from pathlib import Path

import websockets

HA = "http://localhost:8123"
WS = "ws://localhost:8123/api/websocket"
CLIENT_ID = "http://localhost:5173/"
USER, PASSWORD = "dev", "dev"
ENV = Path(__file__).parent.parent / "frontend/apps/web/.env"
ROOMS = {
    "Living room": ["light.living_room_rgbww_lights", "light.ceiling_lights"],
    "Bedroom": ["light.bed_light"],
    "Kitchen": ["light.kitchen_lights"],
    "Office": ["light.office_rgbw_lights", "light.entrance_color_white_lights"],
}


def http(path, data=None, token=None, form=False):
    body = urllib.parse.urlencode(data).encode() if form else (json.dumps(data).encode() if data is not None else None)
    req = urllib.request.Request(HA + path, data=body, method="POST" if data is not None else "GET")
    req.add_header("Content-Type", "application/x-www-form-urlencoded" if form else "application/json")
    if token:
        req.add_header("Authorization", f"Bearer {token}")
    with urllib.request.urlopen(req) as r:
        return json.loads(r.read() or "null")


def access_token():
    steps = http("/api/onboarding")
    if all(s["done"] for s in steps if s["step"] == "user"):
        code = http("/auth/login_flow", {"client_id": CLIENT_ID, "handler": ["homeassistant", None], "redirect_uri": CLIENT_ID})
        res = http(f"/auth/login_flow/{code['flow_id']}", {"client_id": CLIENT_ID, "username": USER, "password": PASSWORD})
        code = res["result"]
    else:
        code = http("/api/onboarding/users", {"client_id": CLIENT_ID, "name": "Dev", "username": USER, "password": PASSWORD, "language": "en"})["auth_code"]
    tok = http("/auth/token", {"grant_type": "authorization_code", "code": code, "client_id": CLIENT_ID}, form=True)["access_token"]
    for step, payload in (("core_config", {}), ("analytics", {}), ("integration", {"client_id": CLIENT_ID, "redirect_uri": CLIENT_ID})):
        if not next(s["done"] for s in http("/api/onboarding") if s["step"] == step):
            http(f"/api/onboarding/{step}", payload, tok)
    return tok


def add_integration(tok):
    if any(e["domain"] == "lightwick" for e in http("/api/config/config_entries/entry", token=tok)):
        return
    flow = http("/api/config/config_entries/flow", {"handler": "lightwick"}, tok)
    http(f"/api/config/config_entries/flow/{flow['flow_id']}", {}, tok)


async def ws_seed(tok):
    async with websockets.connect(WS, max_size=None) as ws:
        await ws.recv()
        await ws.send(json.dumps({"type": "auth", "access_token": tok}))
        assert json.loads(await ws.recv())["type"] == "auth_ok"
        n = 0

        async def call(**msg):
            nonlocal n
            n += 1
            await ws.send(json.dumps({"id": n, **msg}))
            while (res := json.loads(await ws.recv())).get("id") != n:
                pass
            assert res.get("success"), res
            return res["result"]

        areas = {a["name"].lower(): a["area_id"] for a in await call(type="config/area_registry/list")}
        for name, lights in ROOMS.items():
            area_id = areas.get(name.lower()) or (await call(type="config/area_registry/create", name=name))["area_id"]
            for eid in lights:
                await call(type="config/entity_registry/update", entity_id=eid, area_id=area_id)
        rooms = await call(type="lightwick/rooms")
        llat = await call(type="auth/long_lived_access_token", client_name="lightwick dev", lifespan=3650)
        return rooms, llat


tok = access_token()
add_integration(tok)
rooms, llat = asyncio.run(ws_seed(tok))
ENV.write_text(f"VITE_HA_URL={HA}\nVITE_HA_TOKEN={llat}\n")
print(f"login {USER}/{PASSWORD} at {HA}; token written to {ENV.relative_to(Path.cwd())}", file=sys.stderr)
print(json.dumps(rooms, indent=1))
