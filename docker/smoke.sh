#!/bin/zsh
# Dev smoke test: drives the WebSocket API against the seeded dev HA and prints resulting light states.
cd "$(dirname "$0")/.."
W() { .venv/bin/python docker/ws.py "$@"; }
TOK=$(sed -n 's/^VITE_HA_TOKEN=//p' frontend/apps/web/.env)
S() { curl -s -H "Authorization: Bearer $TOK" "http://localhost:8123/api/states/$1" | .venv/bin/python -c 'import json,sys; d=json.load(sys.stdin); a=d["attributes"]; print(d["entity_id"], d["state"], a.get("brightness"), a.get("color_temp_kelvin"), a.get("hs_color"))'; }

W lightwick/role/set '{"entity_id":"light.ceiling_lights","role":"main"}' >/dev/null && echo role-ok
W lightwick/favorites/set '{"room_id":"living_room","scene_ids":["bright","relax","read","savanna"]}' >/dev/null && echo fav-ok
W lightwick/scene/apply '{"room_id":"living_room","scene_id":"relax"}' >/dev/null && echo apply-relax-ok
S light.ceiling_lights; S light.living_room_rgbww_lights
W lightwick/scene/apply '{"room_id":"living_room","scene_id":"read"}' >/dev/null && echo apply-read-ok
S light.ceiling_lights; S light.living_room_rgbww_lights
W lightwick/scene/snapshot '{"room_id":"living_room","name":"Movie night"}' | head -3
W lightwick/dynamic/set '{"room_id":"living_room","scene_id":"savanna","interval":3}' >/dev/null && echo dyn-ok
sleep 4; S light.living_room_rgbww_lights
W lightwick/dynamic/set '{"room_id":"living_room","scene_id":null}' >/dev/null && echo dyn-stop-ok
echo "candidates:"; W lightwick/remotes/candidates | head -5
echo "scene entities:"; curl -s -H "Authorization: Bearer $TOK" http://localhost:8123/api/states | grep -o '"entity_id": *"scene\.[a-z_]*"'
docker logs --since 90s lightwick-ha 2>&1 | grep -iE "lightwick.*(error|exception)|Traceback" -A5 | head -30
