import { useState } from "react";
import { login, type Session } from "@lightwick/core";
import { Button, Field, inputCls } from "../components/ui";

export function Login({ onLogin, initial }: { onLogin: (s: Session) => void; initial?: Partial<Session> }) {
  const [internal, setInternal] = useState(initial?.internalUrl ?? "http://homeassistant.local:8123");
  const [external, setExternal] = useState(initial?.externalUrl ?? "");
  const [user, setUser] = useState("");
  const [pass, setPass] = useState("");
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const submit = async () => {
    setBusy(true);
    setError(null);
    try {
      // Log in wherever we can reach; tokens work on both URLs.
      let tokens: Session["tokens"] | null = null;
      let lastErr: unknown;
      for (const url of [internal, external].filter((u) => u.trim())) {
        try {
          tokens = await login(url, user, pass);
          break;
        } catch (e) {
          lastErr = e;
          if (e instanceof Error && /password/.test(e.message)) break;
        }
      }
      if (!tokens) throw lastErr ?? new Error("Could not reach Home Assistant");
      onLogin({ internalUrl: internal.trim().replace(/\/+$/, ""), externalUrl: external.trim().replace(/\/+$/, "") || undefined, tokens });
    } catch (e) {
      setError(e instanceof Error ? e.message : String(e));
    } finally {
      setBusy(false);
    }
  };

  return (
    <div className="lw-root safe-t safe-b flex min-h-dvh flex-col justify-center px-6">
      <div className="mx-auto w-full max-w-sm">
        <div className="mb-8">
          <div className="mb-3 h-12 w-12 rounded-2xl bg-accent" />
          <h1 className="text-3xl font-bold tracking-tight">Lightwick</h1>
          <p className="mt-1 text-muted">Sign in to your Home Assistant.</p>
        </div>
        <form
          className="space-y-4"
          onSubmit={(e) => {
            e.preventDefault();
            submit();
          }}
        >
          <Field label="Home URL (on your Wi-Fi)">
            <input className={inputCls} inputMode="url" autoCapitalize="none" value={internal} onChange={(e) => setInternal(e.target.value)} />
          </Field>
          <Field label="Remote URL (optional, used away from home)">
            <input className={inputCls} inputMode="url" autoCapitalize="none" placeholder="https://xyz.ui.nabu.casa" value={external} onChange={(e) => setExternal(e.target.value)} />
          </Field>
          <Field label="Username">
            <input className={inputCls} autoCapitalize="none" autoComplete="username" value={user} onChange={(e) => setUser(e.target.value)} />
          </Field>
          <Field label="Password">
            <input className={inputCls} type="password" autoComplete="current-password" value={pass} onChange={(e) => setPass(e.target.value)} />
          </Field>
          {error ? <div className="rounded-xl bg-danger/15 px-4 py-3 text-sm text-danger">{error}</div> : null}
          <Button full disabled={busy || !internal.trim() || !user || !pass}>{busy ? "Signing in…" : "Sign in"}</Button>
        </form>
      </div>
    </div>
  );
}
