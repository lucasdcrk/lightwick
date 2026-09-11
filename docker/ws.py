"""Dev helper: send one WebSocket command to the dev HA. Usage: ws.py lightwick/config [json-fields]"""

import asyncio
import json
import re
import sys
from pathlib import Path

import websockets

ENV = Path(__file__).parent.parent / "frontend/apps/web/.env"
env = dict(re.findall(r"^(\w+)=(.*)$", ENV.read_text(), re.M))


async def main() -> None:
    msg = {"type": sys.argv[1], **(json.loads(sys.argv[2]) if len(sys.argv) > 2 else {})}
    async with websockets.connect(env["VITE_HA_URL"].replace("http", "ws") + "/api/websocket", max_size=None) as ws:
        await ws.recv()
        await ws.send(json.dumps({"type": "auth", "access_token": env["VITE_HA_TOKEN"]}))
        await ws.recv()
        await ws.send(json.dumps({"id": 1, **msg}))
        while (res := json.loads(await ws.recv())).get("id") != 1:
            pass
        print(json.dumps(res.get("result", res), indent=1))
        sys.exit(0 if res.get("success") else 1)


asyncio.run(main())
