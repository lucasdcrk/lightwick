/** Lightwick-owned HA automations: a small curated set, stored as real automations the user can open in HA. */
import type { Connection } from "@lightwick/core";

export type Kind = "schedule" | "sunset" | "motion" | "away";
export type Target = { room_id: string; scene_id: string | "off" };

export type Form =
  | { kind: "schedule"; id?: string; name: string; at: string; days: string[]; target: Target }
  | { kind: "sunset"; id?: string; name: string; offset: number; target: Target }
  | { kind: "motion"; id?: string; name: string; sensor: string; offAfter: number; onlyDark: boolean; target: Target }
  | { kind: "away"; id?: string; name: string };

export const DAYS = ["mon", "tue", "wed", "thu", "fri", "sat", "sun"];
const PREFIX = "lightwick_";

export const blank = (kind: Kind): Form => {
  const target: Target = { room_id: "", scene_id: "off" };
  switch (kind) {
    case "schedule":
      return { kind, name: "", at: "22:30", days: DAYS, target };
    case "sunset":
      return { kind, name: "", offset: -30, target };
    case "motion":
      return { kind, name: "", sensor: "", offAfter: 5, onlyDark: true, target };
    case "away":
      return { kind, name: "" };
  }
};

const action = (t: Target) =>
  t.scene_id === "off"
    ? { action: "light.turn_off", target: { area_id: t.room_id } }
    : { action: "lightwick.apply_scene", data: { room_id: t.room_id, scene_id: t.scene_id, transition: 2 } };

const pad = (n: number) => String(Math.abs(n)).padStart(2, "0");
const offsetStr = (m: number) => `${m < 0 ? "-" : ""}${pad(Math.floor(Math.abs(m) / 60))}:${pad(Math.abs(m) % 60)}:00`;
const parseOffset = (s: string | undefined) => {
  if (!s) return 0;
  const m = /^(-?)(\d+):(\d+)/.exec(s);
  return m ? (m[1] ? -1 : 1) * (Number(m[2]) * 60 + Number(m[3])) : 0;
};

export function toConfig(f: Form): Record<string, unknown> {
  const base = { alias: f.name, description: "Managed by Lightwick", mode: "restart" };
  switch (f.kind) {
    case "schedule":
      return {
        ...base,
        triggers: [{ trigger: "time", at: `${f.at}:00` }],
        conditions: f.days.length < 7 ? [{ condition: "time", weekday: f.days }] : [],
        actions: [action(f.target)],
      };
    case "sunset":
      return { ...base, triggers: [{ trigger: "sun", event: "sunset", offset: offsetStr(f.offset) }], conditions: [], actions: [action(f.target)] };
    case "motion":
      return {
        ...base,
        triggers: [
          { trigger: "state", entity_id: f.sensor, to: "on", id: "motion" },
          { trigger: "state", entity_id: f.sensor, to: "off", for: { minutes: f.offAfter }, id: "clear" },
        ],
        conditions: [],
        actions: [
          {
            choose: [
              {
                conditions: [
                  { condition: "trigger", id: "motion" },
                  ...(f.onlyDark ? [{ condition: "state", entity_id: "sun.sun", state: "below_horizon" }] : []),
                ],
                sequence: [action(f.target)],
              },
              { conditions: [{ condition: "trigger", id: "clear" }], sequence: [action({ room_id: f.target.room_id, scene_id: "off" })] },
            ],
          },
        ],
      };
    case "away":
      return {
        ...base,
        triggers: [{ trigger: "numeric_state", entity_id: "zone.home", below: 1 }],
        conditions: [],
        actions: [{ action: "light.turn_off", target: { entity_id: "all" } }],
      };
  }
}

const targetOf = (a: any): Target =>
  a?.action === "lightwick.apply_scene" ? { room_id: a.data.room_id, scene_id: a.data.scene_id } : { room_id: a?.target?.area_id ?? "", scene_id: "off" };

export function fromConfig(id: string, c: any): Form | null {
  const t = c.triggers?.[0] ?? c.trigger?.[0];
  const kind = t?.trigger ?? t?.platform;
  const name = c.alias ?? "";
  if (kind === "time") {
    return { kind: "schedule", id, name, at: String(t.at).slice(0, 5), days: c.conditions?.[0]?.weekday ?? DAYS, target: targetOf(c.actions?.[0]) };
  }
  if (kind === "sun") return { kind: "sunset", id, name, offset: parseOffset(t.offset), target: targetOf(c.actions?.[0]) };
  if (kind === "state") {
    const choose = c.actions?.[0]?.choose ?? [];
    const motion = choose[0];
    return {
      kind: "motion",
      id,
      name,
      sensor: t.entity_id,
      offAfter: (c.triggers?.[1] ?? c.trigger?.[1])?.for?.minutes ?? 5,
      onlyDark: (motion?.conditions ?? []).some((x: any) => x.entity_id === "sun.sun"),
      target: targetOf(motion?.sequence?.[0]),
    };
  }
  if (kind === "numeric_state") return { kind: "away", id, name };
  return null;
}

export const isOurs = (automationId: unknown) => typeof automationId === "string" && automationId.startsWith(PREFIX);

export const load = (conn: Connection, id: string) => conn.sendMessagePromise<any>({ type: "lightwick/automation/get", automation_id: id });

export async function save(conn: Connection, f: Form): Promise<string> {
  const id = f.id ?? `${PREFIX}${Math.random().toString(36).slice(2, 10)}`;
  await conn.sendMessagePromise({ type: "lightwick/automation/save", automation_id: id, config: toConfig(f) });
  return id;
}

export const remove = (conn: Connection, id: string) => conn.sendMessagePromise({ type: "lightwick/automation/delete", automation_id: id });

export function summary(f: Form, roomName: (id: string) => string, sceneName: (id: string) => string): string {
  const what = (t: Target) => (t.scene_id === "off" ? `${roomName(t.room_id)} off` : `${sceneName(t.scene_id)} in ${roomName(t.room_id)}`);
  switch (f.kind) {
    case "schedule":
      return `${f.at} · ${f.days.length === 7 ? "every day" : f.days.map((d) => d[0].toUpperCase() + d.slice(1, 3)).join(" ")} · ${what(f.target)}`;
    case "sunset":
      return `${f.offset === 0 ? "At sunset" : `${Math.abs(f.offset)} min ${f.offset < 0 ? "before" : "after"} sunset`} · ${what(f.target)}`;
    case "motion":
      return `Motion → ${what(f.target)} · off after ${f.offAfter} min${f.onlyDark ? " · after dark" : ""}`;
    case "away":
      return "Everyone left → all lights off";
  }
}
