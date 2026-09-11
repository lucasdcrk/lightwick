import { useEffect, useState } from "react";
import { createRoot } from "react-dom/client";
import { Capacitor } from "@capacitor/core";
import { Preferences } from "@capacitor/preferences";
import { connectSession, connectWithToken, localStorageSessions, type Connection, type Session, type SessionStorage } from "@lightwick/core";
import { App } from "./App";
import { Login } from "./screens/Login";
import "./app.css";

// Standalone shell: web dev server and the mobile app. Auth = dev token from .env, else a saved session, else the login screen.
const nativeStorage: SessionStorage = {
  async load() {
    const { value } = await Preferences.get({ key: "session" });
    return value ? (JSON.parse(value) as Session) : null;
  },
  async save(s) {
    s ? await Preferences.set({ key: "session", value: JSON.stringify(s) }) : await Preferences.remove({ key: "session" });
  },
};
const storage = Capacitor.isNativePlatform() ? nativeStorage : localStorageSessions();
const devUrl = import.meta.env.VITE_HA_URL as string | undefined;
const devToken = import.meta.env.VITE_HA_TOKEN as string | undefined;

function Boot() {
  const [conn, setConn] = useState<Connection | null>(null);
  const [session, setSession] = useState<Session | null | undefined>(undefined);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    (async () => {
      if (devUrl && devToken && !devToken.startsWith("paste")) {
        setConn(await connectWithToken(devUrl, devToken));
        return;
      }
      const saved = await storage.load();
      setSession(saved);
      if (saved) {
        try {
          setConn(await connectSession(saved, storage));
        } catch (e) {
          setError(e instanceof Error ? e.message : String(e));
          setSession(null);
        }
      }
    })();
  }, []);

  const logout = async () => {
    conn?.close();
    await storage.save(null);
    setConn(null);
    setSession(null);
  };

  if (conn) return <App conn={conn} onLogout={logout} />;
  if (session === undefined || session) {
    return (
      <div className="lw-root flex min-h-dvh items-center justify-center text-muted">
        <div className="lw-fade">{error ?? "Connecting…"}</div>
      </div>
    );
  }
  return (
    <Login
      initial={session ?? undefined}
      onLogin={async (s) => {
        await storage.save(s);
        setSession(s);
        setConn(await connectSession(s, storage));
      }}
    />
  );
}

createRoot(document.getElementById("root")!).render(<Boot />);
