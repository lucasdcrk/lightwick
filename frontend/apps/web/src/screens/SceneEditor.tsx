import { useMemo, useState } from "react";
import { api, colorToRgb, css, type Color, type MainPolicy, type Scene } from "@lightwick/core";
import { Plus, X } from "../components/Icons";
import { Button, ColorWheel, Field, Section, Segmented, Sheet, Slider, TopBar, WhiteSlider, inputCls } from "../components/ui";
import { useStore } from "../store";
import { SceneTile } from "./SceneTile";

type Draft = { id?: string; name: string; main: MainPolicy; palette: Color[]; brightness: number };

const DEFAULT: Draft = { name: "", main: { policy: "off" }, palette: [{ h: 30, s: 80 }, { kelvin: 2400 }], brightness: 60 };

export function SceneEditor({ roomId, sceneId }: { roomId: string; sceneId?: string }) {
  const { config, conn, pop, run } = useStore();
  const existing = config?.scenes.find((s) => s.id === sceneId);
  const [d, setD] = useState<Draft>(() =>
    existing && !existing.states
      ? { id: existing.id, name: existing.name, main: existing.main ?? { policy: "off" }, palette: existing.palette ?? [], brightness: existing.brightness ?? 60 }
      : { ...DEFAULT, ...(existing ? { id: existing.id, name: existing.name } : {}) },
  );
  const [editing, setEditing] = useState<number | null>(null);
  const snapshot = !!existing?.states;
  const preview = useMemo<Scene>(() => ({ group: "custom", builtin: false, ...d, id: "preview", name: d.name || "Preview" }), [d]);

  const save = () =>
    run(async () => {
      const scene = await api.saveScene(conn, { ...d, group: "custom", ...(snapshot ? { states: existing!.states, room_id: roomId } : {}) });
      const favs = config?.favorites[roomId] ?? [];
      if (!favs.includes(scene.id)) await api.setFavorites(conn, roomId, [...favs, scene.id]);
      pop();
    });

  const remove = () =>
    run(async () => {
      await api.deleteScene(conn, existing!.id);
      pop();
    });

  const set = (patch: Partial<Draft>) => setD((x) => ({ ...x, ...patch }));

  return (
    <div className="lw-screen pb-32">
      <TopBar title={existing ? "Edit scene" : "New scene"} onBack={pop} />
      <div className="px-4">
        <div className="mx-auto max-w-sm">
          <SceneTile scene={snapshot ? existing! : preview} />
        </div>
        <div className="mt-4">
          <input className={inputCls} placeholder="Scene name" value={d.name} onChange={(e) => set({ name: e.target.value })} />
        </div>
      </div>

      {snapshot ? (
        <p className="px-4 pt-4 text-sm text-muted">This scene stores each light's exact state. Rename it here, or save a new snapshot from the room.</p>
      ) : (
        <>
          <Section title="Main light">
            <Segmented<MainPolicy["policy"]>
              value={d.main.policy}
              options={[
                { value: "off", label: "Off" },
                { value: "white", label: "White" },
                { value: "palette", label: "Colours" },
              ]}
              onChange={(p) => set({ main: p === "white" ? { policy: "white", kelvin: 4000, brightness: 100 } : { policy: p } })}
            />
            {d.main.policy === "white" ? (
              <div className="mt-3 space-y-3 rounded-card bg-card p-4">
                <Field label={`Temperature · ${d.main.kelvin} K`}>
                  <WhiteSlider kelvin={d.main.kelvin} onCommit={(k) => set({ main: { ...(d.main as Extract<MainPolicy, { policy: "white" }>), kelvin: k } })} />
                </Field>
                <Field label={`Brightness · ${d.main.brightness}%`}>
                  <Slider thin value={d.main.brightness} min={1} onCommit={(b) => set({ main: { ...(d.main as Extract<MainPolicy, { policy: "white" }>), brightness: b } })} />
                </Field>
              </div>
            ) : (
              <p className="mt-2 px-1 text-[13px] text-muted">
                {d.main.policy === "off" ? "Ceiling light stays off; accents carry the mood." : "The main light joins the palette."}
              </p>
            )}
          </Section>

          <Section title="Palette">
            <div className="flex flex-wrap gap-3">
              {d.palette.map((c, i) => (
                <div key={i} className="relative">
                  <button
                    onClick={() => setEditing(i)}
                    className="press h-14 w-14 rounded-full ring-2 ring-white/20"
                    style={{ background: css(colorToRgb(c)) }}
                    aria-label={`Colour ${i + 1}`}
                  />
                  {d.palette.length > 1 ? (
                    <button
                      onClick={() => set({ palette: d.palette.filter((_, j) => j !== i) })}
                      className="absolute -right-1 -top-1 flex h-5 w-5 items-center justify-center rounded-full bg-card2 text-text"
                      aria-label="Remove colour"
                    >
                      <X width={12} height={12} />
                    </button>
                  ) : null}
                </div>
              ))}
              {d.palette.length < 6 ? (
                <button
                  onClick={() => {
                    set({ palette: [...d.palette, { h: (d.palette.length * 60) % 360, s: 80 }] });
                    setEditing(d.palette.length);
                  }}
                  className="press flex h-14 w-14 items-center justify-center rounded-full bg-card2 text-muted"
                  aria-label="Add colour"
                >
                  <Plus />
                </button>
              ) : null}
            </div>
            <div className="mt-4">
              <Field label={`Accent brightness · ${d.brightness}%`}>
                <Slider thin value={d.brightness} min={1} onCommit={(b) => set({ brightness: b })} />
              </Field>
            </div>
          </Section>
        </>
      )}

      <div className="safe-b fixed inset-x-0 bottom-0 z-20 mx-auto flex max-w-3xl gap-2 bg-gradient-to-t from-bg via-bg/95 to-transparent px-4 pt-6">
        {existing ? (
          <Button kind="danger" onClick={remove}>
            Delete
          </Button>
        ) : null}
        {!snapshot ? (
          <Button kind="ghost" full onClick={() => run(() => api.previewScene(conn, roomId, preview))}>
            Preview
          </Button>
        ) : null}
        <Button full disabled={!d.name.trim()} onClick={save}>
          Save
        </Button>
      </div>

      {editing !== null && d.palette[editing] ? (
        <ColorSheet
          color={d.palette[editing]}
          onChange={(c) => set({ palette: d.palette.map((x, i) => (i === editing ? c : x)) })}
          onClose={() => setEditing(null)}
        />
      ) : null}
    </div>
  );
}

export function ColorSheet({ color, onChange, onClose }: { color: Color; onChange: (c: Color) => void; onClose: () => void }) {
  const [mode, setMode] = useState<"color" | "white">("kelvin" in color ? "white" : "color");
  const hs = "h" in color ? color : { h: 30, s: 80 };
  const k = "kelvin" in color ? color.kelvin : 2700;
  return (
    <Sheet title="Colour" onClose={onClose}>
      <Segmented
        value={mode}
        options={[
          { value: "color", label: "Colour" },
          { value: "white", label: "White" },
        ]}
        onChange={setMode}
      />
      <div className="py-6">
        {mode === "color" ? (
          <ColorWheel h={hs.h} s={hs.s} onChange={(h, s) => onChange({ h, s })} onCommit={(h, s) => onChange({ h, s })} />
        ) : (
          <div className="pt-8">
            <WhiteSlider kelvin={k} onCommit={(kelvin) => onChange({ kelvin })} onInput={(kelvin) => onChange({ kelvin })} />
            <div className="mt-2 text-center text-sm text-muted">{k} K</div>
          </div>
        )}
      </div>
      <Button full onClick={onClose}>
        Done
      </Button>
    </Sheet>
  );
}
