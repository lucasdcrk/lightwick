export type Role = "main" | "accent" | "task" | "ambient";
export type Backend = "z2m" | "zha" | null;

export type Color = { kelvin: number } | { h: number; s: number };

export type MainPolicy =
  | { policy: "off" }
  | { policy: "white"; kelvin: number; brightness: number }
  | { policy: "palette" };

export type LightState = { brightness_pct: number; color_temp_kelvin?: number; hs_color?: [number, number] } | null;

export type Scene = {
  id: string;
  name: string;
  group: string;
  builtin: boolean;
  main?: MainPolicy;
  palette?: Color[];
  brightness?: number;
  states?: Record<string, LightState>;
  room_id?: string;
};

export type Light = { entity_id: string; role: Role; backend: Backend; ieee: string | null };

export type Hardware = { available: boolean; backend: Backend; synced: boolean; scenes: Record<string, number> };

export type Room = { id: string; name: string; lights: Light[]; hardware: Hardware };

export type ButtonAction = { action: "toggle" | "on" | "off" | "dim_up" | "dim_down" | "cycle" | "scene"; scene_id?: string };

export type RemoteConfig = { room_id: string; buttons: Record<string, ButtonAction>; bind: boolean; bound: boolean };

export type RemoteCandidate = {
  device_id: string;
  name: string;
  model: string | null;
  area_id: string | null;
  backend: Backend;
  ieee: string | null;
  buttons: string[];
};

export type DynamicState = { scene_id: string; interval: number; transition: number };

export type Config = {
  rooms: Room[];
  scenes: Scene[];
  scene_groups: string[];
  roles: Role[];
  favorites: Record<string, string[]>;
  remotes: Record<string, RemoteConfig>;
  dynamic: Record<string, DynamicState>;
  backends: Record<string, boolean>;
};
