import { useEffect, useState } from "react";
import { automations as autoSvc } from "@lightwick/core";
import { Away, Clock, Motion, Plus, Sun } from "../components/Icons";
import { Empty, IconButton, Toggle, TopBar } from "../components/ui";
import { useStore } from "../store";
import { fromConfig, isOurs, load, summary, type Form, type Kind } from "../automations";

export const KIND_ICON: Record<Kind, typeof Clock> = { schedule: Clock, sunset: Sun, motion: Motion, away: Away };
export const KIND_LABEL: Record<Kind, string> = { schedule: "Schedule", sunset: "Sunset", motion: "Motion", away: "Away" };

export function Automations() {
  const { config, entities, conn, push, run } = useStore();
  const [forms, setForms] = useState<Record<string, Form>>({});
  const ours = Object.values(entities).filter((e) => e.entity_id.startsWith("automation.") && isOurs(e.attributes.id));
  const key = ours.map((e) => e.attributes.id).join(",");

  useEffect(() => {
    let alive = true;
    Promise.all(ours.map(async (e) => [e.attributes.id, fromConfig(e.attributes.id, await load(conn, e.attributes.id))] as const)).then((rows) => {
      if (alive) setForms(Object.fromEntries(rows.filter(([, f]) => f) as [string, Form][]));
    });
    return () => {
      alive = false;
    };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [key, conn]);

  const roomName = (id: string) => config?.rooms.find((r) => r.id === id)?.name ?? id;
  const sceneName = (id: string) => config?.scenes.find((s) => s.id === id)?.name ?? id;

  return (
    <div className="pb-28">
      <TopBar
        title="Automations"
        right={
          <IconButton label="New automation" onClick={() => push({ name: "automation" })}>
            <Plus />
          </IconButton>
        }
      />
      {ours.length === 0 ? (
        <Empty title="Nothing automated yet" hint="Schedules, sunset, motion and away rules. Saved as real Home Assistant automations." />
      ) : (
        <div className="mx-4 overflow-hidden rounded-card">
          {ours.map((e, i) => {
            const f = forms[e.attributes.id];
            const Icon = f ? KIND_ICON[f.kind] : Clock;
            return (
              <div
                key={e.entity_id}
                onClick={() => f && push({ name: "automation", id: f.id })}
                className={`press flex cursor-pointer items-center gap-3 bg-card px-4 py-3.5 ${i ? "border-t border-line" : ""}`}
              >
                <div className={`flex h-10 w-10 shrink-0 items-center justify-center rounded-full ${e.state === "on" ? "bg-accent/15 text-accent" : "bg-card2 text-muted"}`}>
                  <Icon width={20} height={20} />
                </div>
                <div className="min-w-0 flex-1">
                  <div className="truncate font-medium">{e.attributes.friendly_name}</div>
                  <div className="truncate text-[12px] text-muted">{f ? summary(f, roomName, sceneName) : "…"}</div>
                </div>
                <Toggle on={e.state === "on"} onChange={(v) => run(() => autoSvc.turn(conn, e.entity_id, v))} />
              </div>
            );
          })}
        </div>
      )}
    </div>
  );
}
