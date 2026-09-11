import type { Connection } from "@lightwick/core";
import { Clock, Gear, Home as HomeIcon } from "./components/Icons";
import { StoreProvider, useStore, type Tab } from "./store";
import { AutomationEditor } from "./screens/AutomationEditor";
import { Automations } from "./screens/Automations";
import { Gallery } from "./screens/Gallery";
import { Home } from "./screens/Home";
import { LightSheet } from "./screens/LightSheet";
import { RemoteSetup } from "./screens/RemoteSetup";
import { Room } from "./screens/Room";
import { SceneEditor } from "./screens/SceneEditor";
import { Settings } from "./screens/Settings";

export function App({ conn, onLogout, onMenu }: { conn: Connection; onLogout?: () => void; onMenu?: () => void }) {
  return (
    <StoreProvider conn={conn} onLogout={onLogout} onMenu={onMenu}>
      <Shell />
    </StoreProvider>
  );
}

const TABS: { id: Tab; label: string; Icon: typeof HomeIcon }[] = [
  { id: "home", label: "Home", Icon: HomeIcon },
  { id: "automations", label: "Automations", Icon: Clock },
  { id: "settings", label: "Settings", Icon: Gear },
];

function Shell() {
  const { config, tab, setTab, stack, pop } = useStore();
  const top = stack[stack.length - 1];
  const sheet = top?.name === "light" ? top : null;
  const screen = sheet ? stack[stack.length - 2] : top;

  if (!config) {
    return (
      <div className="lw-root flex min-h-dvh items-center justify-center text-muted">
        <div className="lw-fade">Connecting…</div>
      </div>
    );
  }

  return (
    <div className="lw-root">
      <div className="mx-auto max-w-3xl">
        {screen ? (
          <StackScreen screen={screen} />
        ) : tab === "home" ? (
          <Home />
        ) : tab === "automations" ? (
          <Automations />
        ) : (
          <Settings />
        )}
      </div>

      {!screen ? (
        <nav className="safe-b fixed inset-x-0 bottom-0 z-30 border-t border-line bg-bg/85 backdrop-blur-xl">
          <div className="mx-auto flex max-w-3xl">
            {TABS.map(({ id, label, Icon }) => (
              <button
                key={id}
                onClick={() => setTab(id)}
                className={`flex flex-1 flex-col items-center gap-0.5 py-2 text-[11px] font-medium ${tab === id ? "text-accent" : "text-muted"}`}
              >
                <Icon width={24} height={24} strokeWidth={tab === id ? 2.4 : 2} />
                {label}
              </button>
            ))}
          </div>
        </nav>
      ) : null}

      {sheet ? <LightSheet id={sheet.id} onClose={pop} /> : null}
    </div>
  );
}

function StackScreen({ screen }: { screen: NonNullable<ReturnType<typeof useStore>["stack"][number]> }) {
  switch (screen.name) {
    case "room":
      return <Room id={screen.id} />;
    case "gallery":
      return <Gallery roomId={screen.roomId} />;
    case "editor":
      return <SceneEditor roomId={screen.roomId} sceneId={screen.sceneId} />;
    case "automation":
      return <AutomationEditor id={screen.id} />;
    case "remote":
      return <RemoteSetup deviceId={screen.deviceId} />;
    default:
      return null;
  }
}
