import { useRef, useState, type ReactNode } from "react";
import type { Tint } from "@lightwick/core";

/**
 * The design's tinted "pill" row: a gradient surface whose depth follows brightness.
 * Drag left/right across it to dim, tap to open, switch on the right toggles.
 */
export function Pill({
  on,
  tint,
  brightness,
  subtitle,
  name,
  onToggle,
  onTap,
  onBrightness,
  glow = true,
  trailing,
}: {
  on: boolean;
  tint: Tint;
  brightness: number;
  subtitle: string;
  name: string;
  onToggle: () => void;
  onTap?: () => void;
  onBrightness?: (pct: number) => void;
  glow?: boolean;
  trailing?: ReactNode;
}) {
  const [live, setLive] = useState<number | null>(null);
  const drag = useRef<{ x: number; moved: boolean; rect: DOMRect } | null>(null);
  const bri = live ?? brightness;
  const dim = (0.45 * (1 - bri / 100)).toFixed(2);
  const alpha = glow && on ? (0.12 + 0.22 * (bri / 100)).toFixed(2) : "0";

  const pct = (x: number, rect: DOMRect) => Math.max(1, Math.min(100, Math.round(((x - rect.left) / rect.width) * 100)));

  return (
    <div
      onPointerDown={(e) => {
        if ((e.target as HTMLElement).closest("[data-stop]")) return;
        drag.current = { x: e.clientX, moved: false, rect: e.currentTarget.getBoundingClientRect() };
        e.currentTarget.setPointerCapture(e.pointerId);
      }}
      onPointerMove={(e) => {
        const d = drag.current;
        if (!d || !on || !onBrightness) return;
        if (Math.abs(e.clientX - d.x) > 6) {
          d.moved = true;
          setLive(pct(e.clientX, d.rect));
        }
      }}
      onPointerUp={(e) => {
        const d = drag.current;
        drag.current = null;
        if (!d) return;
        if (d.moved && onBrightness) {
          onBrightness(pct(e.clientX, d.rect));
          setTimeout(() => setLive(null), 600);
        } else if (!d.moved) {
          onTap ? onTap() : onToggle();
        }
      }}
      onPointerCancel={() => {
        drag.current = null;
        setLive(null);
      }}
      className="press flex touch-pan-y select-none items-center gap-3 rounded-2xl px-[18px] py-4"
      style={{
        cursor: "pointer",
        background: on
          ? `linear-gradient(rgba(13,13,15,${dim}),rgba(13,13,15,${dim})),linear-gradient(100deg,${tint.g1},${tint.g2})`
          : "var(--color-card)",
        boxShadow: on ? `0 0 34px rgba(${tint.glow},${alpha})` : "none",
        transition: "box-shadow 200ms, background 200ms",
      }}
    >
      <div className="min-w-0 flex-1">
        <div className="text-[11.5px] font-bold" style={{ color: on ? tint.sub : "#9a9896" }}>
          {on ? (live !== null ? `${live}%` : subtitle) : "Power Off"}
        </div>
        <div className="mt-[3px] truncate text-[16px] font-medium" style={{ color: on ? tint.ink : "#e8e6e3" }}>
          {name}
        </div>
      </div>
      {trailing}
      <Switch on={on} onToggle={onToggle} />
    </div>
  );
}

export function Switch({ on, onToggle }: { on: boolean; onToggle: () => void }) {
  return (
    <div
      data-stop
      role="switch"
      aria-checked={on}
      onClick={(e) => {
        e.stopPropagation();
        onToggle();
      }}
      className="box-border h-7 w-[46px] flex-none cursor-pointer rounded-full p-[2px] transition-colors"
      style={{ background: on ? "rgba(30,20,10,.75)" : "#3a3a3d" }}
    >
      <div
        className="h-6 w-6 rounded-full transition-transform"
        style={{ background: on ? "#fff" : "#6b6a68", transform: on ? "translateX(18px)" : "translateX(0)" }}
      />
    </div>
  );
}

/** Soft radial glow anchored to the bottom of a screen, tinted by whatever is lit. */
export const Glow = ({ tint }: { tint: Tint | null }) => (
  <div
    className="pointer-events-none fixed inset-x-0 bottom-[-60px] z-0 h-[340px]"
    style={{ background: tint ? `radial-gradient(90% 130% at 50% 108%, rgba(${tint.glow},.22), rgba(0,0,0,0) 65%)` : "none", transition: "background 400ms" }}
  />
);
