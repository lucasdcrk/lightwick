# Lightwick

A light-control app for Home Assistant that feels like the Hue app: opens on your rooms, one tap toggles a room, scenes that look good by default, remotes set up in thirty seconds.

## Vision

Home Assistant knows everything about your lights but its UI treats them like any other entity. Hue's UI is great but only works with Hue. Lightwick sits on top of HA and gives you the Hue experience for every light you own, whatever bridge it hangs off.

Three things matter, in this order:

1. **Instant.** The app opens on the room list. No dashboard, no graphs. One tap per room.
2. **Scenes that look good without work.** Premade scenes are templates built on light roles, so "Relax" works in any room the first time.
3. **Remotes in thirty seconds.** Pick a remote, pick a room, done. Zigbee binding where the hardware allows it, so the switch keeps working when HA is down.

The one idea Hue never had: every light has a **role**. The ceiling light is *main*, the lamps are *accent*. A scene says what to do per role: main off, accents warm; or main 4000K at 80% and accents dim. That one distinction is what people fight Hue over, and it lets a scene made for one room work in another.

Everything else stays in HA. Lightwick writes real HA scenes and automations under its own label. Uninstall it and nothing breaks.

## How it fits together

- **HA is the source of truth.** Rooms are HA areas, lights are `light.*` entities in an area, remotes are HA devices with triggers. Lightwick keeps no parallel inventory.
- **The integration** (`custom_components/lightwick`, Python) owns the config store, the capability adapters (Zigbee2MQTT, ZHA, plain entities), scene sync, and a small WebSocket API. It also serves the panel.
- **The frontend** (`frontend/`, React + TypeScript) is one bundle with two shells: an HA sidebar panel and a Capacitor mobile app. `packages/core` holds the connection and domain logic so both shells share it.
- **Capability tiers.** Each device is tagged with what its backend can do: hardware groups, in-bulb scenes, binding, effects. The UI shows the same features everywhere and marks which scenes recall instantly.

## Roadmap

Everything below ships in the current version. Each line was built on top of a working app and checked against the dev Home Assistant.

- [x] **Skeleton.** Dev HA in Docker, integration with a WebSocket API and a sidebar panel.
- [x] **Rooms and roles.** Every light has a role (main, accent, task, ambient). Room screen with a master slider, per-light sliders and colour/white pickers.
- [x] **Scenes.** Forty role-based templates in seven moods, plus custom palette scenes and "save current lights" snapshots. Favourites per room become real HA scene entities.
- [x] **Hardware scenes.** Zigbee2MQTT adapter: one Zigbee group per room, favourites stored in the bulbs, one-hop recall. Rooms show an "instant" bolt when synced.
- [x] **Remotes.** Pick a switch, pick a room, assign buttons (toggle, on, off, brighter, dimmer, next scene, a scene). Optional direct Zigbee binding so on/off and dimming survive HA being down.
- [x] **Dynamic scenes.** Rotate a scene's palette across the room on a timer; loop runs inside HA. Bulb effects (Hue candle, fireplace…) exposed per light.
- [x] **Automations.** Four curated kinds: schedule, sunset, motion, away. Written to `automations.yaml` as real HA automations you can open in HA.
- [x] **Mobile.** Capacitor shell in `frontend/apps/mobile`. Sign in with HA username and password, home and remote URLs, the app picks whichever answers.
- [x] **ZHA adapter.** Same group, scene and bind operations through ZHA. Written against the 2026.9 API without a ZHA dongle on hand, so treat it as experimental.
- [x] **HACS release.** A GitHub release builds the panel and attaches `lightwick.zip`.

Known gaps, in the order I'd fix them:

1. ZHA adapter needs a real dongle to verify group membership and scene storage.
2. Login has no MFA step.
3. Dynamic scene loops stop on HA restart.
4. Zigbee2MQTT base topic is fixed to `zigbee2mqtt`.

## Development

Needs Docker, Node 22 with pnpm, Python 3.12+. Xcode for the iOS shell.

```sh
make venv          # once: python venv with pytest + websockets
make ha            # dev HA on http://localhost:8123 (demo lights, no Zigbee)
make seed          # once HA is up: onboard dev/dev, add lightwick, write a token to frontend/apps/web/.env
pnpm -C frontend install
make dev           # vite on http://localhost:5173 with HMR, talking to the dev HA
```

Three ways to see the app:

- **Standalone** at `http://localhost:5173`. Token auth from `.env`, hot reload. Use this most of the time.
- **Inside HA** at `http://localhost:8123/lightwick` after `make build`. Checks the `hass` injection and sidebar behaviour.
- **On a phone.** `pnpm -C frontend/apps/mobile ios` builds the SPA, syncs Capacitor and opens Xcode. Sign in with the dev HA's LAN address, or with your real HA to dogfood.

The standalone web build signs in only from origins listed under `http: cors_allowed_origins` in HA; the mobile app uses native HTTP and needs nothing.

Python changes need `make restart`. Logs with `make logs`. Tests and type checks with `make check`. `zsh docker/smoke.sh` drives the WebSocket API end to end against the seeded dev HA.

To work against real Zigbee devices, point the dev HA's MQTT integration at your production Mosquitto. Zigbee2MQTT is shared, so the dev HA sees the real devices.

## Install on your Home Assistant

Add this repository to HACS as an integration, install Lightwick, restart HA, then add the integration under Settings → Integrations. Lightwick appears in the sidebar. The mobile app is built from source for now.
