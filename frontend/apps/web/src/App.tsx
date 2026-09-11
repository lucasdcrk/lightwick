import { useEffect, useState } from "react";
import { fetchRooms, setLights, subscribeEntities, type Connection, type HassEntities, type Room } from "@lightwick/core";

export function App({ conn }: { conn: Connection }) {
  const [rooms, setRooms] = useState<Room[]>([]);
  const [entities, setEntities] = useState<HassEntities>({});

  useEffect(() => {
    fetchRooms(conn).then(setRooms);
    return subscribeEntities(conn, setEntities);
  }, [conn]);

  return (
    <main className="grid gap-3 p-4 sm:grid-cols-2 lg:grid-cols-3">
      {rooms.map((room) => {
        const on = room.lights.filter((id) => entities[id]?.state === "on").length;
        return (
          <button
            key={room.id}
            onClick={() => setLights(conn, room.lights, on === 0)}
            className={`rounded-2xl p-5 text-left shadow transition ${on ? "bg-amber-200" : "bg-neutral-200"}`}
          >
            <div className="text-lg font-semibold">{room.name}</div>
            <div className="text-sm opacity-70">
              {on}/{room.lights.length} on
            </div>
          </button>
        );
      })}
    </main>
  );
}
