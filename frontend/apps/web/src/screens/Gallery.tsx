import { useState } from "react";
import { api, type Scene } from "@lightwick/core";
import { Camera, Heart, Plus } from "../components/Icons";
import { Button, Sheet, TopBar, inputCls } from "../components/ui";
import { useStore } from "../store";
import { SceneTile } from "./SceneTile";

const GROUP_LABEL: Record<string, string> = {
  natural: "Natural",
  warm: "Warm",
  cool: "Cool",
  nature: "Nature",
  vivid: "Vivid",
  night: "Night",
  holiday: "Holiday",
  custom: "Mine",
};

export function Gallery({ roomId }: { roomId: string }) {
  const { config, conn, pop, push, run } = useStore();
  const [group, setGroup] = useState<string>("all");
  const [active, setActive] = useState<string | null>(null);
  const [naming, setNaming] = useState(false);
  const room = config?.rooms.find((r) => r.id === roomId);
  if (!config || !room) return null;

  const favs = config.favorites[roomId] ?? [];
  const groups = ["all", ...config.scene_groups, "custom"];
  const scenes = config.scenes.filter((s) => (!s.room_id || s.room_id === roomId) && (group === "all" || s.group === group));

  const toggleFav = (s: Scene) => {
    const next = favs.includes(s.id) ? favs.filter((f) => f !== s.id) : [...favs, s.id];
    run(() => api.setFavorites(conn, roomId, next));
  };

  return (
    <div className="lw-screen pb-32">
      <TopBar title="Scenes" subtitle={room.name} onBack={pop} />
      <div className="no-scrollbar sticky top-[62px] z-10 flex gap-2 overflow-x-auto bg-bg/80 px-4 py-2 backdrop-blur-xl">
        {groups.map((g) => (
          <button
            key={g}
            onClick={() => setGroup(g)}
            className={`press shrink-0 rounded-full px-4 py-1.5 text-[13px] font-semibold ${group === g ? "bg-text text-bg" : "bg-card2 text-text"}`}
          >
            {g === "all" ? "All" : GROUP_LABEL[g] ?? g}
          </button>
        ))}
      </div>

      <div className="grid grid-cols-2 gap-3 px-4 pt-2 sm:grid-cols-3">
        {scenes.map((s) => (
          <SceneTile
            key={s.id}
            scene={s}
            active={active === s.id}
            onClick={() => {
              setActive(s.id);
              run(() => api.applyScene(conn, roomId, s.id, 0.6));
            }}
            corner={
              <button
                aria-label={favs.includes(s.id) ? "Remove from room" : "Add to room"}
                onClick={(e) => {
                  e.stopPropagation();
                  toggleFav(s);
                }}
                className={`press flex h-8 w-8 items-center justify-center rounded-full bg-black/30 backdrop-blur ${favs.includes(s.id) ? "text-accent" : "text-white"}`}
              >
                <Heart width={16} height={16} filled={favs.includes(s.id)} />
              </button>
            }
            badge={
              !s.builtin ? (
                <button
                  onClick={(e) => {
                    e.stopPropagation();
                    push({ name: "editor", roomId, sceneId: s.id });
                  }}
                  className="press rounded-full bg-black/30 px-2 py-0.5 text-[11px] font-semibold text-white backdrop-blur"
                >
                  Edit
                </button>
              ) : undefined
            }
          />
        ))}
        {scenes.length === 0 ? <div className="col-span-full py-10 text-center text-sm text-muted">Nothing here yet.</div> : null}
      </div>

      <div className="safe-b fixed inset-x-0 bottom-0 z-20 mx-auto flex max-w-3xl gap-2 bg-gradient-to-t from-bg via-bg/95 to-transparent px-4 pt-6">
        <Button kind="ghost" full onClick={() => setNaming(true)}>
          <span className="inline-flex items-center gap-2">
            <Camera width={18} height={18} /> Save current
          </span>
        </Button>
        <Button full onClick={() => push({ name: "editor", roomId })}>
          <span className="inline-flex items-center gap-2">
            <Plus width={18} height={18} /> New scene
          </span>
        </Button>
      </div>

      {naming ? <SnapshotSheet roomId={roomId} onClose={() => setNaming(false)} /> : null}
    </div>
  );
}

export function SnapshotSheet({ roomId, onClose }: { roomId: string; onClose: () => void }) {
  const { conn, run } = useStore();
  const [name, setName] = useState("");
  return (
    <Sheet title="Save current lights" onClose={onClose}>
      <p className="mb-3 text-sm text-muted">Saves exactly what every light in the room shows right now.</p>
      <input autoFocus className={inputCls} placeholder="Scene name" value={name} onChange={(e) => setName(e.target.value)} />
      <div className="mt-4">
        <Button
          full
          disabled={!name.trim()}
          onClick={() => {
            run(() => api.snapshotScene(conn, roomId, name.trim()));
            onClose();
          }}
        >
          Save
        </Button>
      </div>
    </Sheet>
  );
}
