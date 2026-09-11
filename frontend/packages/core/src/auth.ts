import { Auth, createConnection, createLongLivedTokenAuth, type AuthData, type Connection } from "home-assistant-js-websocket";

/** What the app keeps between launches. Internal URL is tried first, external is the fallback. */
export type Session = { internalUrl: string; externalUrl?: string; tokens: Omit<AuthData, "hassUrl"> };

export type SessionStorage = { load(): Promise<Session | null>; save(s: Session | null): Promise<void> };

export const connectWithToken = (url: string, token: string) =>
  createConnection({ auth: createLongLivedTokenAuth(url, token) });

const trim = (u: string) => u.trim().replace(/\/+$/, "");

/** HA's own login flow (same one the HA frontend uses). client_id is the HA URL, so no OAuth redirect dance. */
export async function login(url: string, username: string, password: string): Promise<Session["tokens"]> {
  const hassUrl = trim(url);
  const clientId = `${hassUrl}/`;
  const post = async (path: string, body: unknown) => {
    const res = await fetch(`${hassUrl}${path}`, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify(body),
    });
    if (!res.ok) throw new Error(`${path}: ${res.status}`);
    return res.json();
  };
  const flow = await post("/auth/login_flow", { client_id: clientId, handler: ["homeassistant", null], redirect_uri: clientId });
  const step = await post(`/auth/login_flow/${flow.flow_id}`, { client_id: clientId, username, password });
  if (step.type !== "create_entry") {
    // ponytail: no MFA step yet; add a second form when someone needs it
    throw new Error(step.errors?.base === "invalid_auth" ? "Wrong username or password" : `Login step "${step.step_id}" not supported`);
  }
  const form = new URLSearchParams({ grant_type: "authorization_code", code: step.result, client_id: clientId });
  const res = await fetch(`${hassUrl}/auth/token`, { method: "POST", body: form });
  if (!res.ok) throw new Error(`token: ${res.status}`);
  const t = await res.json();
  return { clientId, access_token: t.access_token, refresh_token: t.refresh_token, expires_in: t.expires_in, expires: Date.now() + t.expires_in * 1000 };
}

/** True when HA answers on that URL within `ms`. 401 counts as reachable. */
export async function reachable(url: string, ms = 2500): Promise<boolean> {
  const ctrl = new AbortController();
  const timer = setTimeout(() => ctrl.abort(), ms);
  try {
    const res = await fetch(`${trim(url)}/api/`, { signal: ctrl.signal });
    return res.status === 401 || res.ok;
  } catch {
    return false;
  } finally {
    clearTimeout(timer);
  }
}

/** Pick internal or external URL, build an auto-refreshing connection, and persist refreshed tokens. */
export async function connectSession(session: Session, storage: SessionStorage): Promise<Connection> {
  const urls = [session.internalUrl, session.externalUrl].filter((u): u is string => !!u).map(trim);
  let hassUrl = urls[0];
  for (const u of urls) {
    if (await reachable(u)) {
      hassUrl = u;
      break;
    }
  }
  const auth = new Auth({ ...session.tokens, hassUrl }, (data) => {
    storage.save({ ...session, tokens: { ...session.tokens, ...data } });
  });
  return createConnection({ auth });
}

export const localStorageSessions = (key = "lightwick.session"): SessionStorage => ({
  async load() {
    try {
      const raw = localStorage.getItem(key);
      return raw ? (JSON.parse(raw) as Session) : null;
    } catch {
      return null;
    }
  },
  async save(s) {
    try {
      s ? localStorage.setItem(key, JSON.stringify(s)) : localStorage.removeItem(key);
    } catch {
      /* storage unavailable */
    }
  },
});
