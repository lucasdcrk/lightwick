import { callService, type Connection } from "home-assistant-js-websocket";
import type { ButtonAction, Config, RemoteCandidate, RemoteConfig, Scene } from "./types";

const cmd = <T = void>(conn: Connection, type: string, data: Record<string, unknown> = {}) =>
  conn.sendMessagePromise<T>({ type: `lightwick/${type}`, ...data });

export const api = {
  config: (c: Connection) => cmd<Config>(c, "config"),
  setRole: (c: Connection, entity_id: string, role: string) => cmd(c, "role/set", { entity_id, role }),
  applyScene: (c: Connection, room_id: string, scene_id: string, transition?: number) =>
    cmd(c, "scene/apply", { room_id, scene_id, transition }),
  previewScene: (c: Connection, room_id: string, scene: Partial<Scene>) => cmd(c, "scene/preview", { room_id, scene }),
  saveScene: (c: Connection, scene: Partial<Scene>) => cmd<Scene>(c, "scene/save", { scene }),
  snapshotScene: (c: Connection, room_id: string, name: string) => cmd<Scene>(c, "scene/snapshot", { room_id, name }),
  deleteScene: (c: Connection, scene_id: string) => cmd(c, "scene/delete", { scene_id }),
  setFavorites: (c: Connection, room_id: string, scene_ids: string[]) => cmd(c, "favorites/set", { room_id, scene_ids }),
  setDynamic: (c: Connection, room_id: string, scene_id: string | null, interval?: number, transition?: number) =>
    cmd(c, "dynamic/set", { room_id, scene_id, interval, transition }),
  remoteCandidates: (c: Connection) => cmd<RemoteCandidate[]>(c, "remotes/candidates"),
  setRemote: (c: Connection, device_id: string, room_id: string, buttons: Record<string, ButtonAction>, bind: boolean) =>
    cmd<RemoteConfig>(c, "remote/set", { device_id, room_id, buttons, bind }),
  deleteRemote: (c: Connection, device_id: string) => cmd(c, "remote/delete", { device_id }),
  hardwareSync: (c: Connection, room_id: string) => cmd(c, "hardware/sync", { room_id }),

  /** Fires whenever the integration's config changes (any client). Returns unsubscribe. */
  onConfigChange: (c: Connection, cb: () => void) => {
    const p = c.subscribeEvents(cb, "lightwick_config_updated");
    return () => {
      p.then((unsub) => unsub());
    };
  },
};

export const lights = {
  turnOn: (c: Connection, entity_id: string | string[], data: Record<string, unknown> = {}) =>
    callService(c, "light", "turn_on", data, { entity_id }),
  turnOff: (c: Connection, entity_id: string | string[], data: Record<string, unknown> = {}) =>
    callService(c, "light", "turn_off", data, { entity_id }),
  set: (c: Connection, entity_id: string | string[], on: boolean, data: Record<string, unknown> = {}) =>
    on ? lights.turnOn(c, entity_id, data) : lights.turnOff(c, entity_id, data),
};

export const automations = {
  turn: (c: Connection, entity_id: string, on: boolean) => callService(c, "automation", on ? "turn_on" : "turn_off", undefined, { entity_id }),
  trigger: (c: Connection, entity_id: string) => callService(c, "automation", "trigger", undefined, { entity_id }),
};

