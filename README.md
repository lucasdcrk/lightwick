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
- **The frontend** (`frontend/`, React + TypeScript) is one bundle with two shells: an HA sidebar panel today, a Capacitor mobile app later. `packages/core` holds the connection and domain logic so both shells share it.
- **Capability tiers.** Each device is tagged with what its backend can do: hardware groups, in-bulb scenes, binding, effects. The UI shows the same features everywhere and marks which scenes recall instantly.

## Roadmap

Each step is usable on its own before the next starts.

- [x] **0. Skeleton.** Dev HA in Docker, integration with a `lightwick/rooms` command and a sidebar panel, room list with tap-to-toggle.
- [ ] **1. Rooms and roles.** Per-light role (main, accent, task, ambient), stored by the integration. Room screen with a brightness slider and per-light control. Role guess on first open, confirmed by the user.
- [ ] **2. Scenes.** Role-based scene templates (Relax, Read, Bright, Night) plus custom scenes with a palette. Saved as HA scenes. Colour math through `culori` with per-bulb gamut clipping.
- [ ] **3. Hardware scenes.** Zigbee2MQTT adapter: Zigbee groups per room, `scene_add` on save, `scene_recall` on tap. Sync button after re-pairs. Instant badge in the UI.
- [ ] **4. Remotes.** Pick remote, pick room, assign buttons: toggle, cycle scenes, dim. Z2M binding to the group; everything else through a generated HA automation.
- [ ] **5. Dynamic scenes.** Palette plus interval and transition, loop lives in the integration. Hue in-bulb effects where the bulb supports them.
- [ ] **6. Automations.** A small curated set: schedule, sunset, motion to scene, off when nobody home. Anything else deep-links to HA.
- [ ] **7. Mobile.** Capacitor shell in `frontend/apps/mobile`, HA OAuth login, install on the phone.
- [ ] **8. ZHA adapter.** Same tiers as Z2M through ZHA's WebSocket commands.
- [ ] **HACS release.** Built frontend shipped in the release zip. Install on the production HA and use it daily.

## Development

Needs Docker, Node 22 with pnpm, Python 3.12+.

```sh
make venv          # once: python venv with pytest + websockets
make ha            # dev HA on http://localhost:8123 (demo lights, no Zigbee)
make seed          # once HA is up: onboard dev/dev, add lightwick, write a token to frontend/apps/web/.env
pnpm -C frontend install
make dev           # vite on http://localhost:5173 with HMR, talking to the dev HA
```

Two ways to see the app:

- **Standalone** at `http://localhost:5173`. Token auth from `.env`, hot reload. Use this most of the time.
- **Inside HA** at `http://localhost:8123/lightwick` after `make build`. Checks the `hass` injection and sidebar behaviour.

Python changes need `make restart`. Logs with `make logs`. Tests and type checks with `make check`.

To work against real Zigbee devices, point the dev HA's MQTT integration at your production Mosquitto. Zigbee2MQTT is shared, so the dev HA sees the real devices.
