import { useEffect, useState } from "react";
import { Button, Field, Segmented, Select, Slider, TopBar, inputCls } from "../components/ui";
import { useStore } from "../store";
import { DAYS, blank, fromConfig, load, remove, save, type Form, type Kind, type Target } from "../automations";
import { KIND_ICON, KIND_LABEL } from "./Automations";

const KINDS: { kind: Kind; hint: string }[] = [
  { kind: "schedule", hint: "At a time, on chosen days" },
  { kind: "sunset", hint: "Around sunset, every day" },
  { kind: "motion", hint: "When a sensor sees movement" },
  { kind: "away", hint: "When everyone has left" },
];

export function AutomationEditor({ id }: { id?: string }) {
  const { config, entities, conn, pop, run } = useStore();
  const [f, setF] = useState<Form | null>(id ? null : null);
  const [picking, setPicking] = useState(!id);

  useEffect(() => {
    if (id) load(conn, id).then((c) => setF(fromConfig(id, c)));
  }, [id, conn]);

  if (!config) return null;

  if (picking) {
    return (
      <div className="lw-screen pb-28">
        <TopBar title="New automation" onBack={pop} />
        <div className="mx-4 overflow-hidden rounded-card">
          {KINDS.map(({ kind, hint }, i) => {
            const Icon = KIND_ICON[kind];
            return (
              <div
                key={kind}
                onClick={() => {
                  setF(blank(kind));
                  setPicking(false);
                }}
                className={`press flex cursor-pointer items-center gap-3 bg-card px-4 py-4 ${i ? "border-t border-line" : ""}`}
              >
                <div className="flex h-10 w-10 items-center justify-center rounded-full bg-accent/15 text-accent">
                  <Icon width={20} height={20} />
                </div>
                <div>
                  <div className="font-medium">{KIND_LABEL[kind]}</div>
                  <div className="text-[13px] text-muted">{hint}</div>
                </div>
              </div>
            );
          })}
        </div>
      </div>
    );
  }
  if (!f) return null;

  const set = (patch: Partial<Form>) => setF({ ...f, ...patch } as Form);
  const valid = f.name.trim() && (f.kind === "away" || (f.target.room_id && (f.kind !== "motion" || f.sensor)));
  const sensors = Object.values(entities).filter(
    (e) => e.entity_id.startsWith("binary_sensor.") && ["motion", "occupancy", "presence"].includes(e.attributes.device_class ?? ""),
  );

  return (
    <div className="lw-screen pb-32">
      <TopBar title={id ? "Edit automation" : KIND_LABEL[f.kind]} onBack={pop} />
      <div className="space-y-4 px-4">
        <Field label="Name">
          <input className={inputCls} value={f.name} placeholder={KIND_LABEL[f.kind]} onChange={(e) => set({ name: e.target.value })} />
        </Field>

        {f.kind === "schedule" ? (
          <>
            <Field label="Time">
              <input type="time" className={inputCls} value={f.at} onChange={(e) => set({ at: e.target.value })} />
            </Field>
            <Field label="Days">
              <div className="flex gap-1.5">
                {DAYS.map((d) => {
                  const on = f.days.includes(d);
                  return (
                    <button
                      key={d}
                      onClick={() => set({ days: on ? f.days.filter((x) => x !== d) : DAYS.filter((x) => x === d || f.days.includes(x)) })}
                      className={`press h-10 flex-1 rounded-xl text-[13px] font-semibold ${on ? "bg-accent text-black" : "bg-card2 text-muted"}`}
                    >
                      {d[0].toUpperCase() + d[1]}
                    </button>
                  );
                })}
              </div>
            </Field>
          </>
        ) : null}

        {f.kind === "sunset" ? (
          <Field label={f.offset === 0 ? "At sunset" : `${Math.abs(f.offset)} min ${f.offset < 0 ? "before" : "after"} sunset`}>
            <Slider thin value={f.offset} min={-120} max={120} step={5} onCommit={(v) => set({ offset: v })} />
          </Field>
        ) : null}

        {f.kind === "motion" ? (
          <>
            <Field label="Motion sensor">
              <Select value={f.sensor} onChange={(v) => set({ sensor: v })}>
                <option value="">Choose a sensor</option>
                {sensors.map((s) => (
                  <option key={s.entity_id} value={s.entity_id}>
                    {s.attributes.friendly_name ?? s.entity_id}
                  </option>
                ))}
              </Select>
            </Field>
            <Field label={`Turn off after ${f.offAfter} min without motion`}>
              <Slider thin value={f.offAfter} min={1} max={60} onCommit={(v) => set({ offAfter: v })} />
            </Field>
            <Segmented
              value={f.onlyDark ? "dark" : "always"}
              options={[
                { value: "dark", label: "Only after dark" },
                { value: "always", label: "Any time" },
              ]}
              onChange={(v) => set({ onlyDark: v === "dark" })}
            />
          </>
        ) : null}

        {f.kind !== "away" ? <TargetFields target={f.target} onChange={(target) => set({ target })} /> : null}
        {f.kind === "away" ? <p className="text-sm text-muted">Turns every light off when the last person leaves home (the home zone drops to zero people).</p> : null}
      </div>

      <div className="safe-b fixed inset-x-0 bottom-0 z-20 mx-auto flex max-w-3xl gap-2 bg-gradient-to-t from-bg via-bg/95 to-transparent px-4 pt-6">
        {id ? (
          <Button kind="danger" onClick={() => run(async () => (await remove(conn, id!), pop()))}>
            Delete
          </Button>
        ) : null}
        <Button full disabled={!valid} onClick={() => run(async () => (await save(conn, f), pop()))}>
          Save
        </Button>
      </div>
    </div>
  );
}

function TargetFields({ target, onChange }: { target: Target; onChange: (t: Target) => void }) {
  const { config } = useStore();
  const favs = target.room_id ? (config?.favorites[target.room_id] ?? []) : [];
  const scenes = config?.scenes.filter((s) => favs.includes(s.id) || (!s.room_id && s.builtin)) ?? [];
  return (
    <>
      <Field label="Room">
        <Select value={target.room_id} onChange={(room_id) => onChange({ ...target, room_id })}>
          <option value="">Choose a room</option>
          {config?.rooms.map((r) => (
            <option key={r.id} value={r.id}>
              {r.name}
            </option>
          ))}
        </Select>
      </Field>
      <Field label="Then">
        <Select value={target.scene_id} onChange={(scene_id) => onChange({ ...target, scene_id })}>
          <option value="off">Turn off</option>
          {scenes.map((s) => (
            <option key={s.id} value={s.id}>
              {s.name}
            </option>
          ))}
        </Select>
      </Field>
    </>
  );
}
