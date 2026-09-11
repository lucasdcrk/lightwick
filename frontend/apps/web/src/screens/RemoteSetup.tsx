import { useEffect, useState } from "react";
import { api, type ButtonAction, type RemoteCandidate } from "@lightwick/core";
import { Button, Field, Select, Toggle, TopBar } from "../components/ui";
import { useStore } from "../store";

const ACTIONS: { value: string; label: string }[] = [
  { value: "", label: "Nothing" },
  { value: "toggle", label: "Toggle room" },
  { value: "on", label: "Room on" },
  { value: "off", label: "Room off" },
  { value: "dim_up", label: "Brighter" },
  { value: "dim_down", label: "Dimmer" },
  { value: "cycle", label: "Next scene" },
  { value: "scene", label: "Scene…" },
];

/** "action|on_press_release" -> "On press release" */
const pretty = (key: string) => {
  const [type, sub] = key.split("|");
  const s = (sub && sub !== "None" ? sub : type).replace(/_/g, " ");
  return s[0].toUpperCase() + s.slice(1);
};

/** Sensible defaults for a fresh remote: match common button names. */
function guess(button: string): ButtonAction | undefined {
  const b = button.toLowerCase();
  if (/(^|[|_])(on|toggle)_(press|short)/.test(b) || /button_1_(single|press|short)/.test(b)) return { action: "toggle" };
  if (/off_(press|short)/.test(b)) return { action: "off" };
  if (/(up|brightness_up|dim_up)_(press|short|hold)/.test(b)) return { action: "dim_up" };
  if (/(down|brightness_down|dim_down)_(press|short|hold)/.test(b)) return { action: "dim_down" };
  if (/(hue|scene|on_hold|button_2_(single|press))/.test(b)) return { action: "cycle" };
  return undefined;
}

export function RemoteSetup({ deviceId }: { deviceId: string }) {
  const { config, conn, pop, run } = useStore();
  const existing = config?.remotes[deviceId];
  const [candidate, setCandidate] = useState<RemoteCandidate | null>(null);
  const [roomId, setRoomId] = useState(existing?.room_id ?? "");
  const [buttons, setButtons] = useState<Record<string, ButtonAction>>(existing?.buttons ?? {});
  const [bind, setBind] = useState(existing?.bind ?? false);

  useEffect(() => {
    api.remoteCandidates(conn).then((list) => {
      const c = list.find((x) => x.device_id === deviceId) ?? null;
      setCandidate(c);
      if (c && !existing) {
        setRoomId(c.area_id && config?.rooms.some((r) => r.id === c.area_id) ? c.area_id : "");
        setButtons(Object.fromEntries(c.buttons.map((b) => [b, guess(b)]).filter(([, a]) => a) as [string, ButtonAction][]));
      }
    });
  }, [conn, deviceId]); // eslint-disable-line react-hooks/exhaustive-deps

  if (!config) return null;
  const room = config.rooms.find((r) => r.id === roomId);
  const favs = room ? (config.favorites[room.id] ?? []) : [];
  const scenes = config.scenes.filter((s) => favs.includes(s.id) || (s.builtin && !s.room_id));
  const canBind = !!candidate?.backend && !!room && room.hardware.backend === candidate.backend;
  const used = Object.values(buttons).filter((a) => a.action).length;

  const setButton = (key: string, action: string, scene_id?: string) =>
    setButtons((b) => {
      const next = { ...b };
      if (!action) delete next[key];
      else next[key] = action === "scene" ? { action, scene_id: scene_id ?? scenes[0]?.id ?? "" } : { action: action as ButtonAction["action"] };
      return next;
    });

  return (
    <div className="lw-screen pb-32">
      <TopBar title={candidate?.name ?? "Remote"} subtitle={candidate?.model ?? undefined} onBack={pop} />
      <div className="space-y-4 px-4">
        <Field label="Controls this room">
          <Select value={roomId} onChange={setRoomId}>
            <option value="">Choose a room</option>
            {config.rooms.map((r) => (
              <option key={r.id} value={r.id}>
                {r.name}
              </option>
            ))}
          </Select>
        </Field>

        <div>
          <div className="mb-1.5 text-[13px] font-medium text-muted">Buttons</div>
          <div className="overflow-hidden rounded-card">
            {candidate === null ? (
              <div className="bg-card px-4 py-5 text-sm text-muted">Loading buttons…</div>
            ) : (
              candidate.buttons.map((key, i) => {
                const a = buttons[key];
                return (
                  <div key={key} className={`bg-card px-4 py-3 ${i ? "border-t border-line" : ""}`}>
                    <div className="flex items-center gap-3">
                      <div className="min-w-0 flex-1 truncate text-[15px] font-medium">{pretty(key)}</div>
                      <select
                        value={a?.action ?? ""}
                        onChange={(e) => setButton(key, e.target.value)}
                        className={`rounded-lg px-3 py-1.5 text-[13px] font-semibold outline-none ${a ? "bg-accent/15 text-accent" : "bg-card2 text-muted"}`}
                      >
                        {ACTIONS.map((o) => (
                          <option key={o.value} value={o.value}>
                            {o.label}
                          </option>
                        ))}
                      </select>
                    </div>
                    {a?.action === "scene" ? (
                      <div className="mt-2">
                        <Select value={a.scene_id ?? ""} onChange={(v) => setButton(key, "scene", v)}>
                          {scenes.map((s) => (
                            <option key={s.id} value={s.id}>
                              {s.name}
                            </option>
                          ))}
                        </Select>
                      </div>
                    ) : null}
                  </div>
                );
              })
            )}
          </div>
        </div>

        {candidate?.backend ? (
          <div className="flex items-center gap-3 rounded-card bg-card px-4 py-3.5">
            <div className="flex-1">
              <div className="font-medium">Bind directly to the bulbs</div>
              <div className="text-[12px] text-muted">
                {canBind
                  ? "On/off and dimming keep working when Home Assistant is down. Sync instant scenes first."
                  : "Needs the room's instant scenes synced on the same Zigbee network."}
              </div>
            </div>
            <Toggle on={bind && canBind} onChange={setBind} />
          </div>
        ) : null}
      </div>

      <div className="safe-b fixed inset-x-0 bottom-0 z-20 mx-auto flex max-w-3xl gap-2 bg-gradient-to-t from-bg via-bg/95 to-transparent px-4 pt-6">
        {existing ? (
          <Button kind="danger" onClick={() => run(async () => (await api.deleteRemote(conn, deviceId), pop()))}>
            Remove
          </Button>
        ) : null}
        <Button full disabled={!roomId || used === 0} onClick={() => run(async () => (await api.setRemote(conn, deviceId, roomId, buttons, bind && canBind), pop()))}>
          Save
        </Button>
      </div>
    </div>
  );
}
