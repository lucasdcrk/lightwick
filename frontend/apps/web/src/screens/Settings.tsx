import { useEffect, useState } from "react";
import { api, type RemoteCandidate } from "@lightwick/core";
import { Bolt, Chevron, Plus, Remote, Sync } from "../components/Icons";
import { Button, Section, Sheet, TopBar } from "../components/ui";
import { useStore } from "../store";

export function Settings() {
  const { config, conn, push, run, onLogout } = useStore();
  const [candidates, setCandidates] = useState<RemoteCandidate[] | null>(null);
  const [adding, setAdding] = useState(false);
  const [syncing, setSyncing] = useState<string | null>(null);

  useEffect(() => {
    api.remoteCandidates(conn).then(setCandidates).catch(() => setCandidates([]));
  }, [conn, config?.remotes]);

  if (!config) return null;
  const configured = Object.entries(config.remotes);
  const byId = Object.fromEntries((candidates ?? []).map((c) => [c.device_id, c]));
  const free = (candidates ?? []).filter((c) => !config.remotes[c.device_id]);
  const hwRooms = config.rooms.filter((r) => r.hardware.available);
  const hassUrl = conn.options.auth?.data.hassUrl;

  return (
    <div className="pb-28">
      <TopBar title="Settings" />

      <Section
        title="Remotes & switches"
        right={
          <button onClick={() => setAdding(true)} className="press flex items-center gap-1 text-[13px] font-semibold text-accent">
            <Plus width={16} height={16} /> Add
          </button>
        }
      >
        <div className="overflow-hidden rounded-card">
          {configured.length === 0 ? (
            <div className="bg-card px-4 py-5 text-center text-sm text-muted">No remotes set up. Tap Add to pair a switch with a room.</div>
          ) : (
            configured.map(([deviceId, cfg], i) => (
              <div
                key={deviceId}
                onClick={() => push({ name: "remote", deviceId })}
                className={`press flex cursor-pointer items-center gap-3 bg-card px-4 py-3.5 ${i ? "border-t border-line" : ""}`}
              >
                <div className="flex h-10 w-10 items-center justify-center rounded-full bg-card2 text-accent">
                  <Remote width={20} height={20} />
                </div>
                <div className="min-w-0 flex-1">
                  <div className="truncate font-medium">{byId[deviceId]?.name ?? deviceId}</div>
                  <div className="text-[12px] text-muted">
                    {config.rooms.find((r) => r.id === cfg.room_id)?.name ?? cfg.room_id} · {Object.keys(cfg.buttons).length} button
                    {Object.keys(cfg.buttons).length === 1 ? "" : "s"}
                    {cfg.bound ? " · bound" : ""}
                  </div>
                </div>
                <Chevron className="text-muted" />
              </div>
            ))
          )}
        </div>
      </Section>

      <Section title="Instant scenes">
        <div className="overflow-hidden rounded-card">
          {hwRooms.length === 0 ? (
            <div className="bg-card px-4 py-5 text-sm text-muted">
              No Zigbee lights found. With Zigbee2MQTT or ZHA, favourite scenes get stored inside the bulbs and recall in one hop.
            </div>
          ) : (
            hwRooms.map((r, i) => (
              <div key={r.id} className={`flex items-center gap-3 bg-card px-4 py-3.5 ${i ? "border-t border-line" : ""}`}>
                <div className={`flex h-10 w-10 items-center justify-center rounded-full ${r.hardware.synced ? "bg-accent/15 text-accent" : "bg-card2 text-muted"}`}>
                  <Bolt width={18} height={18} />
                </div>
                <div className="min-w-0 flex-1">
                  <div className="font-medium">{r.name}</div>
                  <div className="text-[12px] text-muted">
                    {r.hardware.backend === "z2m" ? "Zigbee2MQTT" : "ZHA"} · {r.hardware.synced ? `${Object.keys(r.hardware.scenes).length} scenes in bulbs` : "Not synced"}
                  </div>
                </div>
                <button
                  disabled={syncing === r.id}
                  onClick={() => {
                    setSyncing(r.id);
                    run(() => api.hardwareSync(conn, r.id)).finally(() => setSyncing(null));
                  }}
                  className="press flex h-9 items-center gap-1.5 rounded-full bg-card2 px-3 text-[13px] font-semibold disabled:opacity-50"
                >
                  <Sync width={15} height={15} className={syncing === r.id ? "animate-spin" : ""} /> {r.hardware.synced ? "Re-sync" : "Sync"}
                </button>
              </div>
            ))
          )}
        </div>
      </Section>

      <Section title="Connection">
        <div className="overflow-hidden rounded-card">
          <div className="bg-card px-4 py-3.5">
            <div className="text-[12px] text-muted">Home Assistant</div>
            <div className="truncate font-medium">{hassUrl}</div>
          </div>
          <div className="flex gap-4 border-t border-line bg-card px-4 py-3.5 text-[13px]">
            <span className={config.backends.z2m ? "text-text" : "text-muted"}>Zigbee2MQTT {config.backends.z2m ? "connected" : "not found"}</span>
            <span className={config.backends.zha ? "text-text" : "text-muted"}>ZHA {config.backends.zha ? "connected" : "not found"}</span>
          </div>
          {onLogout ? (
            <div className="border-t border-line bg-card px-4 py-3">
              <Button kind="danger" full onClick={onLogout}>
                Sign out
              </Button>
            </div>
          ) : null}
        </div>
      </Section>

      {adding ? (
        <Sheet title="Add a remote" onClose={() => setAdding(false)}>
          {candidates === null ? (
            <div className="py-6 text-center text-sm text-muted">Looking for switches…</div>
          ) : free.length === 0 ? (
            <div className="py-6 text-center text-sm text-muted">No unconfigured switches found. Pair the remote with Home Assistant first.</div>
          ) : (
            <div className="overflow-hidden rounded-card">
              {free.map((c, i) => (
                <div
                  key={c.device_id}
                  onClick={() => {
                    setAdding(false);
                    push({ name: "remote", deviceId: c.device_id });
                  }}
                  className={`press flex cursor-pointer items-center gap-3 bg-card2 px-4 py-3.5 ${i ? "border-t border-line" : ""}`}
                >
                  <Remote className="text-accent" />
                  <div className="min-w-0 flex-1">
                    <div className="truncate font-medium">{c.name}</div>
                    <div className="truncate text-[12px] text-muted">
                      {c.model ?? ""} · {c.buttons.length} triggers
                    </div>
                  </div>
                  <Chevron className="text-muted" />
                </div>
              ))}
            </div>
          )}
        </Sheet>
      ) : null}
    </div>
  );
}
