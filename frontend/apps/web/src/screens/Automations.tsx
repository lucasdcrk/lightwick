import { useEffect, useState } from "react";
import { automations as autoSvc, type HassEntity } from "@lightwick/core";
import { Away, Clock, Motion, Plus, Sun } from "../components/Icons";
import { Empty, IconButton, Toggle, TopBar } from "../components/ui";
import { useStore } from "../store";
import { fromConfig, isOurs, load, summary, type Form, type Kind } from "../automations";

export const KIND_ICON: Record<Kind, typeof Clock> = { schedule: Clock, sunset: Sun, motion: Motion, away: Away };
export const KIND_LABEL: Record<Kind, string> = { schedule: "Schedule", sunset: "Sunset", motion: "Motion", away: "Away" };

/** Lightwick-owned automation entities with their parsed forms (forms load async). */
export function useLightwickAutomations(): { entity: HassEntity; form: Form | null }[] {
  const { entities, conn } = useStore();
  const [forms, setForms] = useState<Record<string, Form | null>>({});
  const ours = Object.values(entities).filter((e) => e.entity_id.startsWith("automation.") && isOurs(e.attributes.id));
  const key = ours.map((e) => e.attributes.id).join(",");
  useEffect(() => {
    let alive = true;
    Promise.all(ours.map(async (e) => [e.attributes.id, fromConfig(e.attributes.id, await load(conn, e.attributes.id))] as const)).then((rows) => {
      if (alive) setForms(Object.fromEntries(rows));
    });
    return () => {
      alive = false;
    };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [key, conn]);
  return ours.map((entity) => ({ entity, form: forms[entity.attributes.id] ?? null }));
}

export function Automations() {
  const { config, conn, push, run } = useStore();
  const ours = useLightwickAutomations();
  const roomName = (id: string) => config?.rooms.find((r) => r.id === id)?.name ?? id;
  const sceneName = (id: string) => config?.scenes.find((s) => s.id === id)?.name ?? id;

  return (
    <div className="pb-28">
      <TopBar
        title="Routines"
        large
        subtitle={ours.length ? `${ours.filter((a) => a.entity.state === "on").length} of ${ours.length} active` : "Nothing automated yet"}
        right={
          <IconButton label="New automation" onClick={() => push({ name: "automation" })}>
            <Plus />
          </IconButton>
        }
      />
      {ours.length === 0 ? (
        <Empty title="No routines yet" hint="Schedules, sunset, motion and away rules. Saved as real Home Assistant automations." />
      ) : (
        <div className="flex flex-col gap-3 px-[18px]">
          {ours.map(({ entity, form }) => {
            const Icon = form ? KIND_ICON[form.kind] : Clock;
            const on = entity.state === "on";
            return (
              <div
                key={entity.entity_id}
                onClick={() => form && push({ name: "automation", id: form.id })}
                className="press flex cursor-pointer items-center gap-3 rounded-[14px] px-4 py-[15px]"
                style={{ background: on ? "#1f1d1a" : "#151517", border: `1px solid ${on ? "#f4b89a" : "transparent"}`, color: on ? "#f8d8c0" : "#8a8886" }}
              >
                <Icon width={18} height={18} />
                <div className="min-w-0 flex-1">
                  <div className="truncate text-[13px] font-bold">{entity.attributes.friendly_name}</div>
                  <div className="truncate text-[12px] opacity-75">{form ? summary(form, roomName, sceneName) : "…"}</div>
                </div>
                <Toggle on={on} onChange={(v) => run(() => autoSvc.turn(conn, entity.entity_id, v))} />
              </div>
            );
          })}
        </div>
      )}
    </div>
  );
}
