import { brightnessPct, entityRgb, lights, tintFromRgb, type RGB, type Room } from "@lightwick/core";
import { Glow, Pill } from "../components/Pill";
import { Empty, TopBar } from "../components/ui";
import { useStore } from "../store";

export function roomStats(room: Room, entities: ReturnType<typeof useStore>["entities"]) {
  const ids = room.lights.map((l) => l.entity_id);
  const onIds = ids.filter((id) => entities[id]?.state === "on");
  const bri = onIds.length ? Math.round(onIds.reduce((a, id) => a + brightnessPct(entities[id]), 0) / onIds.length) : 0;
  const rgb = onIds.map((id) => entityRgb(entities[id])).find((c): c is RGB => !!c) ?? null;
  return { ids, onIds, on: onIds.length > 0, bri, tint: tintFromRgb(rgb) };
}

export function Home() {
  const { config, entities, conn, push, run } = useStore();
  if (!config) return null;
  const stats = config.rooms.map((r) => roomStats(r, entities));
  const total = stats.reduce((a, s) => a + s.ids.length, 0);
  const totalOn = stats.reduce((a, s) => a + s.onIds.length, 0);
  const glowTint = stats.find((s) => s.on)?.tint ?? null;

  return (
    <div className="relative pb-28">
      <Glow tint={glowTint} />
      <TopBar title="My Home" subtitle={`${totalOn} of ${total} lights on`} large />
      {config.rooms.length === 0 ? (
        <Empty title="No rooms yet" hint="Assign your lights to areas in Home Assistant and they show up here." />
      ) : (
        <div className="relative flex flex-col gap-3 px-[18px]">
          {config.rooms.map((room, i) => {
            const s = stats[i];
            return (
              <Pill
                key={room.id}
                on={s.on}
                tint={s.tint}
                brightness={s.bri}
                name={room.name}
                subtitle={`${s.bri}% · ${s.onIds.length} of ${s.ids.length} on`}
                onToggle={() => run(() => lights.set(conn, s.ids, !s.on))}
                onTap={() => push({ name: "room", id: room.id })}
                onBrightness={(p) => run(() => lights.turnOn(conn, s.onIds.length ? s.onIds : s.ids, { brightness_pct: p }))}
              />
            );
          })}
        </div>
      )}
    </div>
  );
}
