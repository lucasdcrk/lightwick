import { useState } from "react";
import { api, automations as autoSvc, brightnessPct, colorToRgb, entityRgb, gradient, lights, tintFromRgb, type Light } from "@lightwick/core";
import { Back, Camera, More, Pause, Play, Plus, Sync } from "../components/Icons";
import { Glow, Pill } from "../components/Pill";
import { IconButton, Row, Section, Sheet, Slider } from "../components/ui";
import { friendly, useStore } from "../store";
import { KIND_ICON, useLightwickAutomations } from "./Automations";
import { SnapshotSheet } from "./Gallery";
import { roomStats } from "./Home";
import { SceneCard } from "./SceneTile";

const ROLE_LABEL = { main: "Main light", accent: "Accent", task: "Task light", ambient: "Ambient" } as const;
const QUICK_COLORS = [{ kelvin: 2200 }, { kelvin: 2700 }, { kelvin: 4000 }, { h: 30, s: 80 }, { h: 340, s: 55 }, { h: 200, s: 60 }] as const;

export function Room({ id }: { id: string }) {
  const { config, entities, conn, pop, push, run } = useStore();
  const [menu, setMenu] = useState(false);
  const [naming, setNaming] = useState(false);
  const [active, setActive] = useState<string | null>(null);
  const [open, setOpen] = useState<string | null>(null);
  const room = config?.rooms.find((r) => r.id === id);
  if (!config || !room) return null;

  const s = roomStats(room, entities);
  const favorites = (config.favorites[id] ?? []).map((sid) => config.scenes.find((x) => x.id === sid)).filter((x): x is NonNullable<typeof x> => !!x);
  const dynamic = config.dynamic[id];
  const current = dynamic?.scene_id ?? active;
  const hw = room.hardware;

  const apply = (sceneId: string) => {
    setActive(sceneId);
    run(() => api.applyScene(conn, id, sceneId, 0.6));
  };

  return (
    <div className="lw-screen relative pb-28">
      <Glow tint={s.on ? s.tint : null} />
      <div className="safe-t relative flex items-center justify-between px-[18px] pb-5 pt-3">
        <button onClick={pop} aria-label="Back" className="press -ml-2 flex h-10 w-10 items-center justify-center text-text">
          <Back width={20} height={20} />
        </button>
        <button onClick={() => setMenu(true)} aria-label="More" className="press -mr-2 flex h-10 w-10 items-center justify-center text-text">
          <More width={20} height={20} />
        </button>
      </div>

      <div className="relative mb-6 flex items-start gap-[14px] px-[18px]">
        <div className="min-w-0 flex-1 pt-3">
          <h1 className="text-[25px] font-medium text-white">{room.name}</h1>
          <div className="mt-1.5 text-[12px] font-medium text-muted">
            {room.lights.length} light{room.lights.length === 1 ? "" : "s"}
            {s.on ? ` · ${s.onIds.length} on · ${s.bri}%` : " · off"}
          </div>
        </div>
        <div
          className="h-[132px] w-[132px] flex-none overflow-hidden rounded-2xl"
          style={{ background: s.on ? gradient(s.onIds.map((i) => entityRgb(entities[i])!).filter(Boolean), 160) : "repeating-linear-gradient(45deg,#1a1a1c,#1a1a1c 8px,#212124 8px,#212124 16px)" }}
        >
          <div className="flex h-full w-full items-end p-3" style={{ background: s.on ? "linear-gradient(to top, rgba(13,13,15,.35), transparent 60%)" : undefined }}>
            <Slider
              thin
              value={s.on ? s.bri : 0}
              color={[255, 255, 255]}
              onCommit={(v) => run(() => (v === 0 ? lights.turnOff(conn, s.ids) : lights.turnOn(conn, s.onIds.length ? s.onIds : s.ids, { brightness_pct: v })))}
            />
          </div>
        </div>
      </div>

      <Section title="My Scenes" right={<button onClick={() => push({ name: "gallery", roomId: id })} className="press text-[13px] font-bold text-white">Gallery</button>}>
        <div className="no-scrollbar -mx-[18px] flex gap-2.5 overflow-x-auto px-[18px] pb-1.5">
          {favorites.map((sc) => (
            <SceneCard key={sc.id} scene={sc} active={current === sc.id} instant={hw.synced && !!hw.scenes[sc.id]} onClick={() => apply(sc.id)} />
          ))}
          <button
            onClick={() => push({ name: "gallery", roomId: id })}
            className="press flex h-[124px] w-[104px] flex-none flex-col items-center justify-center gap-2 rounded-[14px] bg-card text-muted"
          >
            <Plus />
            <span className="text-[11px] font-bold">{favorites.length ? "More" : "Add scenes"}</span>
          </button>
        </div>
        {current && favorites.some((x) => x.id === current) ? <DynamicRow roomId={id} sceneId={current} /> : null}
      </Section>

      <Section title="Lights">
        <div className="flex flex-col gap-3">
          {room.lights.map((l) => (
            <LightPill key={l.entity_id} light={l} open={open === l.entity_id} onOpen={() => setOpen(open === l.entity_id ? null : l.entity_id)} onDetail={() => push({ name: "light", id: l.entity_id })} />
          ))}
        </div>
      </Section>

      <Routines roomId={id} />

      {menu ? (
        <Sheet title={room.name} onClose={() => setMenu(false)}>
          <div className="overflow-hidden rounded-card">
            <Row
              onClick={() => {
                setMenu(false);
                setNaming(true);
              }}
            >
              <Camera className="text-accent" />
              <div className="flex-1">
                <div className="font-medium">Save current lights as a scene</div>
                <div className="text-[13px] text-muted">Keeps exactly what each light shows now.</div>
              </div>
            </Row>
            {hw.available ? (
              <Row
                onClick={() => {
                  setMenu(false);
                  run(() => api.hardwareSync(conn, id));
                }}
              >
                <Sync className="text-accent" />
                <div className="flex-1">
                  <div className="font-medium">{hw.synced ? "Re-sync instant scenes" : "Make scenes instant"}</div>
                  <div className="text-[13px] text-muted">Stores favourites in the Zigbee bulbs. Lights flicker for a few seconds.</div>
                </div>
              </Row>
            ) : null}
          </div>
        </Sheet>
      ) : null}
      {naming ? <SnapshotSheet roomId={id} onClose={() => setNaming(false)} /> : null}
    </div>
  );
}

function LightPill({ light, open, onOpen, onDetail }: { light: Light; open: boolean; onOpen: () => void; onDetail: () => void }) {
  const { entities, conn, run } = useStore();
  const e = entities[light.entity_id];
  const on = e?.state === "on";
  const rgb = entityRgb(e);
  const tint = tintFromRgb(rgb);
  const modes: string[] = e?.attributes.supported_color_modes ?? [];
  const canColor = modes.some((m) => ["hs", "rgb", "xy", "rgbw", "rgbww"].includes(m));
  const canWhite = modes.includes("color_temp") || canColor;
  return (
    <div>
      <Pill
        on={on}
        tint={tint}
        brightness={brightnessPct(e)}
        name={friendly(entities, light.entity_id)}
        subtitle={`${brightnessPct(e)}% · ${ROLE_LABEL[light.role]}`}
        onToggle={() => run(() => lights.set(conn, light.entity_id, !on))}
        onTap={on ? onOpen : () => run(() => lights.turnOn(conn, light.entity_id))}
        onBrightness={(p) => run(() => lights.turnOn(conn, light.entity_id, { brightness_pct: p }))}
      />
      {open && on ? (
        <div className="lw-fade flex items-center gap-2.5 px-1.5 pb-1 pt-3">
          <span className="mr-0.5 text-[11px] font-bold text-muted">Color</span>
          {QUICK_COLORS.filter((c) => ("kelvin" in c ? canWhite : canColor)).map((c, i) => {
            const t = tintFromRgb(colorToRgb(c));
            const selected = "kelvin" in c ? e?.attributes.color_mode === "color_temp" && Math.abs((e.attributes.color_temp_kelvin ?? 0) - c.kelvin) < 150 : !!e?.attributes.hs_color && Math.abs(e.attributes.hs_color[0] - c.h) < 12;
            return (
              <button
                key={i}
                aria-label="Set colour"
                onClick={() => run(() => lights.turnOn(conn, light.entity_id, "kelvin" in c ? { color_temp_kelvin: c.kelvin } : { hs_color: [c.h, c.s] }))}
                className="press h-[30px] w-[30px] rounded-full"
                style={{ background: `linear-gradient(135deg,${t.g1},${t.g2})`, boxShadow: selected ? `0 0 0 2px #0d0d0f,0 0 0 4px ${t.g1}` : "none" }}
              />
            );
          })}
          <button onClick={onDetail} className="press ml-auto rounded-full bg-card px-3 py-1.5 text-[11px] font-bold text-text">
            More…
          </button>
        </div>
      ) : null}
    </div>
  );
}

function DynamicRow({ roomId, sceneId }: { roomId: string; sceneId: string }) {
  const { config, conn, run } = useStore();
  const dyn = config?.dynamic[roomId];
  const running = dyn?.scene_id === sceneId;
  const [interval, setInterval_] = useState(dyn?.interval ?? 20);
  return (
    <div className="mt-3 flex items-center gap-3 rounded-2xl bg-card px-4 py-3">
      <IconButton label={running ? "Stop dynamic scene" : "Play dynamic scene"} active={running} onClick={() => run(() => api.setDynamic(conn, roomId, running ? null : sceneId, interval, Math.min(interval / 2, 8)))}>
        {running ? <Pause width={18} height={18} /> : <Play width={18} height={18} />}
      </IconButton>
      <div className="flex-1">
        <div className="flex justify-between text-[12px]">
          <span className="font-bold">Dynamic</span>
          <span className="text-muted">{interval < 10 ? "Fast" : interval < 40 ? "Gentle" : "Slow"}</span>
        </div>
        <Slider
          thin
          value={120 - interval}
          min={0}
          max={118}
          onInput={(v) => setInterval_(120 - v)}
          onCommit={(v) => {
            const next = 120 - v;
            setInterval_(next);
            if (running) run(() => api.setDynamic(conn, roomId, sceneId, next, Math.min(next / 2, 8)));
          }}
        />
      </div>
    </div>
  );
}

function Routines({ roomId }: { roomId: string }) {
  const { conn, push, run, setTab } = useStore();
  const all = useLightwickAutomations();
  const ours = all.filter((a) => a.form && (a.form.kind === "away" || a.form.target.room_id === roomId));
  if (ours.length === 0) return null;
  return (
    <Section title="My Routines" right={<button onClick={() => setTab("automations")} className="press text-[13px] font-bold text-white">Edit</button>}>
      <div className="grid grid-cols-2 gap-2.5">
        {ours.map(({ entity, form }) => {
          const on = entity.state === "on";
          const Icon = KIND_ICON[form!.kind];
          const when =
            form!.kind === "schedule" ? form!.at : form!.kind === "sunset" ? `Sunset ${form!.offset >= 0 ? "+" : "−"}${Math.abs(form!.offset)}m` : form!.kind === "motion" ? "On motion" : "When away";
          return (
            <button
              key={entity.entity_id}
              onClick={() => run(() => autoSvc.turn(conn, entity.entity_id, !on))}
              onContextMenu={(ev) => {
                ev.preventDefault();
                push({ name: "automation", id: form!.id });
              }}
              className="press flex items-center gap-3 rounded-[14px] px-4 py-[15px] text-left"
              style={{ background: on ? "#1f1d1a" : "#151517", border: `1px solid ${on ? "#f4b89a" : "transparent"}`, color: on ? "#f8d8c0" : "#8a8886", transition: "border-color 150ms, color 150ms" }}
            >
              <Icon width={16} height={16} />
              <div className="min-w-0">
                <div className="truncate text-[12px] font-bold">{entity.attributes.friendly_name}</div>
                <div className="mt-0.5 text-[13px] opacity-75">{when}</div>
              </div>
            </button>
          );
        })}
      </div>
    </Section>
  );
}

