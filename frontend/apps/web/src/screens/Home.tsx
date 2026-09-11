import { brightnessPct, css, entityRgb, gradient, lights, type RGB, type Room } from "@lightwick/core";
import { Power } from "../components/Icons";
import { Empty, IconButton, Toggle, TopBar } from "../components/ui";
import { useStore } from "../store";

export function Home() {
  const { config, entities, conn, push, run } = useStore();
  if (!config) return null;
  const allIds = config.rooms.flatMap((r) => r.lights.map((l) => l.entity_id));
  const anyOn = allIds.some((id) => entities[id]?.state === "on");
  return (
    <div className="pb-28">
      <TopBar
        title="Home"
        right={
          <IconButton label="All off" active={anyOn} onClick={() => run(() => lights.turnOff(conn, allIds))}>
            <Power />
          </IconButton>
        }
      />
      {config.rooms.length === 0 ? (
        <Empty title="No rooms yet" hint="Assign your lights to areas in Home Assistant and they show up here." />
      ) : (
        <div className="grid gap-3 px-4 sm:grid-cols-2">
          {config.rooms.map((room) => (
            <RoomCard key={room.id} room={room} onOpen={() => push({ name: "room", id: room.id })} />
          ))}
        </div>
      )}
    </div>
  );
}

function RoomCard({ room, onOpen }: { room: Room; onOpen: () => void }) {
  const { entities, conn, run } = useStore();
  const ids = room.lights.map((l) => l.entity_id);
  const swatches = ids.map((id) => entityRgb(entities[id])).filter((c): c is RGB => !!c);
  const on = swatches.length;
  const avg = on ? Math.round(ids.reduce((a, id) => a + brightnessPct(entities[id]), 0) / on) : 0;
  const bg = on ? gradient(swatches, 100) : undefined;
  return (
    <div
      onClick={onOpen}
      className={`press relative flex h-[118px] cursor-pointer flex-col justify-between overflow-hidden rounded-card p-4 ${on ? "" : "bg-card"}`}
      style={bg ? { background: bg } : undefined}
    >
      {on ? <div className="absolute inset-0 bg-gradient-to-b from-black/10 to-black/55" /> : null}
      <div className="relative flex items-start justify-between">
        <div className="min-w-0">
          <div className="truncate text-[19px] font-bold leading-tight">{room.name}</div>
          <div className={`mt-0.5 text-[13px] ${on ? "text-white/80" : "text-muted"}`}>
            {on ? `${on} of ${ids.length} on · ${avg}%` : ids.length ? `${ids.length} light${ids.length > 1 ? "s" : ""} off` : "No lights"}
          </div>
        </div>
        <Toggle on={on > 0} onChange={(v) => run(() => lights.set(conn, ids, v))} />
      </div>
      <div className="relative flex gap-1.5">
        {ids.slice(0, 8).map((id) => {
          const c = entityRgb(entities[id]);
          return <span key={id} className="h-2 w-2 rounded-full" style={{ background: c ? css(c) : "rgba(255,255,255,.15)" }} />;
        })}
      </div>
    </div>
  );
}
