import { useState } from "react";
import { api, brightnessPct, entityRgb, lights, type Role } from "@lightwick/core";
import { ColorWheel, Field, Segmented, Select, Sheet, Slider, Toggle, WhiteSlider } from "../components/ui";
import { friendly, useStore } from "../store";

const COLOR_MODES = ["hs", "rgb", "xy", "rgbw", "rgbww"];

export function LightSheet({ id, onClose }: { id: string; onClose: () => void }) {
  const { config, entities, conn, run } = useStore();
  const e = entities[id];
  const light = config?.rooms.flatMap((r) => r.lights).find((l) => l.entity_id === id);
  const modes: string[] = e?.attributes.supported_color_modes ?? [];
  const hasColor = modes.some((m) => COLOR_MODES.includes(m));
  const hasWhite = modes.includes("color_temp");
  const [mode, setMode] = useState<"color" | "white">(e?.attributes.color_mode === "color_temp" || !hasColor ? "white" : "color");
  if (!e || !light) return null;

  const on = e.state === "on";
  const rgb = entityRgb(e);
  const hs: [number, number] = e.attributes.hs_color ?? [30, 80];
  const kelvin: number = e.attributes.color_temp_kelvin ?? 2700;
  const effects: string[] = e.attributes.effect_list ?? [];
  const set = (data: Record<string, unknown>) => run(() => lights.turnOn(conn, id, data));

  return (
    <Sheet title={friendly(entities, id)} onClose={onClose}>
      <div className="flex items-center gap-3">
        <div className="flex-1">
          <Slider value={brightnessPct(e)} color={rgb ?? [255, 181, 71]} onCommit={(v) => run(() => (v === 0 ? lights.turnOff(conn, id) : lights.turnOn(conn, id, { brightness_pct: v })))} />
        </div>
        <Toggle size="lg" on={on} onChange={(v) => run(() => lights.set(conn, id, v))} />
      </div>

      {hasColor || hasWhite ? (
        <div className="mt-5">
          {hasColor && hasWhite ? (
            <Segmented
              value={mode}
              options={[
                { value: "color", label: "Colour" },
                { value: "white", label: "White" },
              ]}
              onChange={setMode}
            />
          ) : null}
          <div className="py-5">
            {mode === "color" && hasColor ? (
              <ColorWheel h={hs[0]} s={hs[1]} onCommit={(h, s) => set({ hs_color: [h, s] })} />
            ) : (
              <div className="pt-4">
                <WhiteSlider
                  kelvin={Math.min(Math.max(kelvin, e.attributes.min_color_temp_kelvin ?? 2000), e.attributes.max_color_temp_kelvin ?? 6500)}
                  onCommit={(k) => set({ color_temp_kelvin: k })}
                />
                <div className="mt-2 text-center text-sm text-muted">{kelvin} K</div>
              </div>
            )}
          </div>
        </div>
      ) : null}

      {effects.length ? (
        <div className="mt-2">
          <Field label="Effect">
            <Select value={e.attributes.effect ?? ""} onChange={(v) => set({ effect: v || "off" })}>
              <option value="">None</option>
              {effects.map((fx) => (
                <option key={fx} value={fx}>
                  {fx}
                </option>
              ))}
            </Select>
          </Field>
        </div>
      ) : null}

      <div className="mt-5">
        <Field label="Role in the room">
          <Segmented<Role>
            value={light.role}
            options={[
              { value: "main", label: "Main" },
              { value: "accent", label: "Accent" },
              { value: "task", label: "Task" },
              { value: "ambient", label: "Ambient" },
            ]}
            onChange={(r) => run(() => api.setRole(conn, id, r))}
          />
        </Field>
        <p className="mt-2 text-[13px] leading-snug text-muted">
          {light.role === "main"
            ? "Ceiling light. Scenes turn it off or keep it white; it never joins the colour palette unless a scene says so."
            : light.role === "accent"
              ? "Lamps and strips. Scenes paint these with the palette."
              : light.role === "task"
                ? "Desk or reading light. Follows the main light's white setting."
                : "Background glow. Takes the palette at half brightness."}
        </p>
      </div>
    </Sheet>
  );
}
