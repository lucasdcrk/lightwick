import { useState } from "react";
import { api, brightnessPct, css, entityRgb, lights, type Light, type RGB } from "@lightwick/core";
import { Bolt, Camera, Chevron, More, Palette, Pause, Play, Plus, Sync } from "../components/Icons";
import { Empty, IconButton, Row, Section, Sheet, Slider, Toggle, TopBar } from "../components/ui";
import { friendly, useStore } from "../store";
import { SceneTile } from "./SceneTile";
import { SnapshotSheet } from "./Gallery";

const ROLE_LABEL = { main: "Main", accent: "Accent", task: "Task", ambient: "Ambient" } as const;

export function Room({ id }: { id: string }) {
  const { config, entities, conn, pop, push, run } = useStore();
  const [menu, setMenu] = useState(false);
  const [naming, setNaming] = useState(false);
  const [active, setActive] = useState<string | null>(null);
  const room = config?.rooms.find((r) => r.id === id);
  if (!config || !room) return null;

  const ids = room.lights.map((l) => l.entity_id);
  const onIds = ids.filter((i) => entities[i]?.state === "on");
  const avg = onIds.length ? Math.round(onIds.reduce((a, i) => a + brightnessPct(entities[i]), 0) / onIds.length) : 0;
  const swatches = onIds.map((i) => entityRgb(entities[i])).filter((c): c is RGB => !!c);
  const favorites = (config.favorites[id] ?? []).map((sid) => config.scenes.find((s) => s.id === sid)).filter((s): s is NonNullable<typeof s> => !!s);
  const dynamic = config.dynamic[id];
  const current = dynamic?.scene_id ?? active;
  const hw = room.hardware;

  const apply = (sceneId: string) => {
    setActive(sceneId);
    run(() => api.applyScene(conn, id, sceneId, 0.6));
  };

  return (
    <div className="lw-screen pb-28">
      <TopBar
        title={room.name}
        onBack={pop}
        subtitle={onIds.length ? `${onIds.length} of ${ids.length} on` : "Off"}
        right={
          <IconButton label="More" onClick={() => setMenu(true)}>
            <More />
          </IconButton>
        }
      />

      <div className="px-4">
        <div className="flex items-center gap-3">
          <div className="flex-1">
            <Slider
              value={onIds.length ? avg : 0}
              color={swatches[0] ?? [255, 181, 71]}
              onCommit={(v) => run(() => (v === 0 ? lights.turnOff(conn, ids) : lights.turnOn(conn, onIds.length ? onIds : ids, { brightness_pct: v })))}
            />
          </div>
          <Toggle size="lg" on={onIds.length > 0} onChange={(v) => run(() => lights.set(conn, ids, v))} />
        </div>
      </div>

      <Section
        title="Scenes"
        right={
          <button onClick={() => push({ name: "gallery", roomId: id })} className="press flex items-center gap-0.5 text-[13px] font-semibold text-accent">
            Gallery <Chevron width={16} height={16} />
          </button>
        }
      >
        {favorites.length === 0 ? (
          <div onClick={() => push({ name: "gallery", roomId: id })} className="press flex cursor-pointer items-center gap-3 rounded-card bg-card p-4">
            <div className="flex h-11 w-11 items-center justify-center rounded-full bg-card2 text-accent">
              <Palette />
            </div>
            <div>
              <div className="font-semibold">Pick your scenes</div>
              <div className="text-[13px] text-muted">Browse the gallery and add favourites to this room.</div>
            </div>
          </div>
        ) : (
          <div className="no-scrollbar -mx-4 flex gap-2.5 overflow-x-auto px-4 pb-1">
            {favorites.map((s) => (
              <SceneTile
                key={s.id}
                scene={s}
                size="sm"
                active={current === s.id}
                onClick={() => apply(s.id)}
                badge={hw.synced && hw.scenes[s.id] ? <Bolt width={14} height={14} className="text-white/90" /> : undefined}
              />
            ))}
            <div
              onClick={() => push({ name: "gallery", roomId: id })}
              className="press flex h-[76px] w-[76px] shrink-0 cursor-pointer items-center justify-center rounded-2xl bg-card text-muted"
            >
              <Plus />
            </div>
          </div>
        )}
        {current && favorites.some((s) => s.id === current) ? (
          <DynamicRow roomId={id} sceneId={current} />
        ) : null}
      </Section>

      <Section title="Lights">
        {room.lights.length === 0 ? (
          <Empty title="No lights in this room" />
        ) : (
          <div className="overflow-hidden rounded-card">
            {room.lights.map((l, i) => (
              <LightRow key={l.entity_id} light={l} last={i === room.lights.length - 1} onOpen={() => push({ name: "light", id: l.entity_id })} />
            ))}
          </div>
        )}
      </Section>

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
                  <div className="text-[13px] text-muted">
                    Stores favourites in the Zigbee bulbs ({hw.backend === "z2m" ? "Zigbee2MQTT" : "ZHA"}). Lights flicker for a few seconds.
                  </div>
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

function DynamicRow({ roomId, sceneId }: { roomId: string; sceneId: string }) {
  const { config, conn, run } = useStore();
  const dyn = config?.dynamic[roomId];
  const running = dyn?.scene_id === sceneId;
  const [interval, setInterval_] = useState(dyn?.interval ?? 20);
  return (
    <div className="mt-3 flex items-center gap-3 rounded-card bg-card px-4 py-3">
      <IconButton
        label={running ? "Stop dynamic scene" : "Play dynamic scene"}
        active={running}
        onClick={() => run(() => api.setDynamic(conn, roomId, running ? null : sceneId, interval, Math.min(interval / 2, 8)))}
      >
        {running ? <Pause width={18} height={18} /> : <Play width={18} height={18} />}
      </IconButton>
      <div className="flex-1">
        <div className="flex justify-between text-[13px]">
          <span className="font-medium">Dynamic</span>
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

function LightRow({ light, last, onOpen }: { light: Light; last: boolean; onOpen: () => void }) {
  const { entities, conn, run } = useStore();
  const e = entities[light.entity_id];
  const rgb = entityRgb(e);
  const on = e?.state === "on";
  return (
    <div className={`bg-card ${last ? "" : "border-b border-line"}`}>
      <div onClick={onOpen} className="press flex cursor-pointer items-center gap-3 px-4 pt-3.5 pb-2">
        <span
          className="h-9 w-9 shrink-0 rounded-full transition-colors"
          style={{ background: rgb ? css(rgb) : "var(--color-card2)", boxShadow: rgb ? `0 0 14px ${css(rgb, 0.55)}` : undefined }}
        />
        <div className="min-w-0 flex-1">
          <div className="truncate font-medium">{friendly(entities, light.entity_id)}</div>
          <div className="text-[12px] text-muted">
            {ROLE_LABEL[light.role]}
            {light.backend ? ` · ${light.backend === "z2m" ? "Zigbee2MQTT" : "ZHA"}` : ""}
            {e?.state === "unavailable" ? " · Unavailable" : ""}
          </div>
        </div>
        <Toggle on={on} onChange={(v) => run(() => lights.set(conn, light.entity_id, v))} />
      </div>
      <div className="px-4 pb-3.5">
        <Slider
          thin
          value={brightnessPct(e)}
          color={rgb ?? [255, 181, 71]}
          onCommit={(v) => run(() => (v === 0 ? lights.turnOff(conn, light.entity_id) : lights.turnOn(conn, light.entity_id, { brightness_pct: v })))}
        />
      </div>
    </div>
  );
}
