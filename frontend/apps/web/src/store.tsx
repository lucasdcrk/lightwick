import { createContext, useCallback, useContext, useEffect, useMemo, useState, type ReactNode } from "react";
import { api, subscribeEntities, type Config, type Connection, type HassEntities } from "@lightwick/core";

export type Screen =
  | { name: "room"; id: string }
  | { name: "gallery"; roomId: string }
  | { name: "editor"; roomId: string; sceneId?: string }
  | { name: "light"; id: string }
  | { name: "automation"; id?: string }
  | { name: "remote"; deviceId: string };

export type Tab = "home" | "automations" | "settings";

type Store = {
  conn: Connection;
  config: Config | null;
  entities: HassEntities;
  refresh: () => Promise<void>;
  tab: Tab;
  setTab: (t: Tab) => void;
  stack: Screen[];
  push: (s: Screen) => void;
  pop: () => void;
  toast: (msg: string) => void;
  /** Run an action, toast on failure. */
  run: (fn: () => Promise<unknown>) => Promise<void>;
  onLogout?: () => void;
  /** HA panel only: opens the HA sidebar on narrow screens. */
  onMenu?: () => void;
};

const Ctx = createContext<Store | null>(null);

export function StoreProvider({ conn, onLogout, onMenu, children }: { conn: Connection; onLogout?: () => void; onMenu?: () => void; children: ReactNode }) {
  const [config, setConfig] = useState<Config | null>(null);
  const [entities, setEntities] = useState<HassEntities>({});
  const [tab, setTab] = useState<Tab>("home");
  const [stack, setStack] = useState<Screen[]>([]);
  const [msg, setMsg] = useState<string | null>(null);

  const refresh = useCallback(async () => setConfig(await api.config(conn)), [conn]);

  useEffect(() => {
    refresh();
    const unsubEntities = subscribeEntities(conn, setEntities);
    const unsubConfig = api.onConfigChange(conn, refresh);
    return () => {
      unsubEntities();
      unsubConfig();
    };
  }, [conn, refresh]);

  useEffect(() => {
    if (!msg) return;
    const t = setTimeout(() => setMsg(null), 3500);
    return () => clearTimeout(t);
  }, [msg]);

  const value = useMemo<Store>(
    () => ({
      conn,
      config,
      entities,
      refresh,
      tab,
      setTab: (t) => {
        setTab(t);
        setStack([]);
      },
      stack,
      push: (s) => setStack((st) => [...st, s]),
      pop: () => setStack((st) => st.slice(0, -1)),
      toast: setMsg,
      run: async (fn) => {
        try {
          await fn();
        } catch (e) {
          setMsg(e instanceof Error ? e.message : String(e));
        }
      },
      onLogout,
      onMenu,
    }),
    [conn, config, entities, refresh, tab, stack, onLogout, onMenu],
  );

  return (
    <Ctx.Provider value={value}>
      {children}
      {msg && (
        <div className="lw-fade fixed left-1/2 top-4 z-[100] max-w-[90vw] -translate-x-1/2 rounded-full bg-card2 px-4 py-2 text-sm shadow-lg">
          {msg}
        </div>
      )}
    </Ctx.Provider>
  );
}

export function useStore(): Store {
  const s = useContext(Ctx);
  if (!s) throw new Error("useStore outside provider");
  return s;
}

export const friendly = (entities: HassEntities, id: string) =>
  entities[id]?.attributes.friendly_name ?? id.split(".")[1]?.replace(/_/g, " ") ?? id;
