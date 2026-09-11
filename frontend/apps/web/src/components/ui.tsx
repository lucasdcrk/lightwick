import { useEffect, useRef, useState, type ReactNode } from "react";
import { css, kelvinToRgb, type RGB } from "@lightwick/core";
import { Back, Menu, X } from "./Icons";
import { useStore } from "../store";

/* ---------- layout ---------- */

export function TopBar({ title, onBack, right, subtitle }: { title: string; onBack?: () => void; right?: ReactNode; subtitle?: string }) {
  const { onMenu } = useStore();
  return (
    <header className="safe-t sticky top-0 z-20 flex items-center gap-2 bg-bg/80 px-3 pb-2 backdrop-blur-xl">
      {onBack ? (
        <button onClick={onBack} aria-label="Back" className="press -ml-1 flex h-10 w-10 items-center justify-center rounded-full text-text">
          <Back />
        </button>
      ) : onMenu ? (
        <button onClick={onMenu} aria-label="Menu" className="press -ml-1 flex h-10 w-10 items-center justify-center rounded-full text-text md:hidden">
          <Menu />
        </button>
      ) : null}
      <div className="min-w-0 flex-1">
        <h1 className="truncate text-[22px] font-bold tracking-tight">{title}</h1>
        {subtitle ? <div className="truncate text-xs text-muted">{subtitle}</div> : null}
      </div>
      {right}
    </header>
  );
}

export const Section = ({ title, right, children }: { title: string; right?: ReactNode; children: ReactNode }) => (
  <section className="mt-6 px-4">
    <div className="mb-2 flex items-center justify-between">
      <h2 className="text-[13px] font-semibold uppercase tracking-wider text-muted">{title}</h2>
      {right}
    </div>
    {children}
  </section>
);

export const IconButton = ({ children, onClick, label, active }: { children: ReactNode; onClick?: () => void; label: string; active?: boolean }) => (
  <button
    onClick={onClick}
    aria-label={label}
    className={`press flex h-10 w-10 items-center justify-center rounded-full ${active ? "bg-accent text-black" : "bg-card2 text-text"}`}
  >
    {children}
  </button>
);

export const Button = ({
  children,
  onClick,
  kind = "primary",
  disabled,
  full,
}: {
  children: ReactNode;
  onClick?: () => void;
  kind?: "primary" | "ghost" | "danger";
  disabled?: boolean;
  full?: boolean;
}) => (
  <button
    onClick={onClick}
    disabled={disabled}
    className={`press rounded-2xl px-5 py-3.5 text-[15px] font-semibold disabled:opacity-40 ${full ? "w-full" : ""} ${
      kind === "primary" ? "bg-accent text-black" : kind === "danger" ? "bg-danger/15 text-danger" : "bg-card2 text-text"
    }`}
  >
    {children}
  </button>
);

/* ---------- controls ---------- */

export function Toggle({ on, onChange, size = "md" }: { on: boolean; onChange: (v: boolean) => void; size?: "md" | "lg" }) {
  const w = size === "lg" ? "h-9 w-16" : "h-7 w-12";
  const k = size === "lg" ? "h-7 w-7" : "h-5 w-5";
  const tx = size === "lg" ? "translate-x-7" : "translate-x-5";
  return (
    <button
      role="switch"
      aria-checked={on}
      onClick={(e) => {
        e.stopPropagation();
        onChange(!on);
      }}
      className={`relative shrink-0 rounded-full p-1 transition-colors duration-200 ${w} ${on ? "bg-accent" : "bg-card2"}`}
    >
      <span className={`block rounded-full bg-white shadow transition-transform duration-200 ${k} ${on ? tx : ""}`} />
    </button>
  );
}

/** Native range with a coloured fill. Emits `onInput` live and `onCommit` when the finger lifts. */
export function Slider({
  value,
  min = 0,
  max = 100,
  step = 1,
  color,
  gradientCss,
  thin,
  onInput,
  onCommit,
}: {
  value: number;
  min?: number;
  max?: number;
  step?: number;
  color?: RGB;
  gradientCss?: string;
  thin?: boolean;
  onInput?: (v: number) => void;
  onCommit: (v: number) => void;
}) {
  const [local, setLocal] = useState(value);
  const dragging = useRef(false);
  useEffect(() => {
    if (!dragging.current) setLocal(value);
  }, [value]);
  const pct = ((local - min) / (max - min)) * 100;
  const style: Record<string, string> = { "--fill": `${pct}%` };
  if (color) style["--c"] = css(color);
  if (gradientCss) style["--g"] = gradientCss;
  return (
    <input
      type="range"
      className={`lw-range ${thin ? "thin" : ""} ${gradientCss ? "gradient" : ""}`}
      style={style}
      min={min}
      max={max}
      step={step}
      value={local}
      onPointerDown={() => (dragging.current = true)}
      onChange={(e) => {
        // React's onChange fires on every input event; commit happens on release below
        const v = Number(e.target.value);
        setLocal(v);
        onInput?.(v);
      }}
      onPointerUp={(e) => {
        dragging.current = false;
        onCommit(Number((e.target as HTMLInputElement).value));
      }}
      onKeyUp={(e) => onCommit(Number((e.target as HTMLInputElement).value))}
      onClick={(e) => e.stopPropagation()}
    />
  );
}

export function Segmented<T extends string>({ value, options, onChange }: { value: T; options: { value: T; label: string }[]; onChange: (v: T) => void }) {
  return (
    <div className="flex rounded-xl bg-card2 p-1">
      {options.map((o) => (
        <button
          key={o.value}
          onClick={() => onChange(o.value)}
          className={`flex-1 rounded-lg py-2 text-[13px] font-semibold transition-colors ${value === o.value ? "bg-bg text-text shadow" : "text-muted"}`}
        >
          {o.label}
        </button>
      ))}
    </div>
  );
}

export const Field = ({ label, children }: { label: string; children: ReactNode }) => (
  <label className="block">
    <div className="mb-1.5 text-[13px] font-medium text-muted">{label}</div>
    {children}
  </label>
);

export const inputCls = "w-full rounded-xl bg-card2 px-4 py-3 text-[15px] text-text outline-none placeholder:text-muted focus:ring-2 focus:ring-accent/60";

export const Select = ({ value, onChange, children }: { value: string; onChange: (v: string) => void; children: ReactNode }) => (
  <select value={value} onChange={(e) => onChange(e.target.value)} className={`${inputCls} appearance-none`}>
    {children}
  </select>
);

export const Row = ({ children, onClick, className = "" }: { children: ReactNode; onClick?: () => void; className?: string }) => (
  <div
    onClick={onClick}
    className={`flex items-center gap-3 bg-card px-4 py-3.5 first:rounded-t-card last:rounded-b-card ${onClick ? "press cursor-pointer" : ""} ${className}`}
  >
    {children}
  </div>
);

export const Divider = () => <div className="mx-4 h-px bg-line" />;

/* ---------- sheet ---------- */

export function Sheet({ title, onClose, children, tall }: { title?: string; onClose: () => void; children: ReactNode; tall?: boolean }) {
  useEffect(() => {
    const onKey = (e: KeyboardEvent) => e.key === "Escape" && onClose();
    window.addEventListener("keydown", onKey);
    return () => window.removeEventListener("keydown", onKey);
  }, [onClose]);
  return (
    <div className="fixed inset-0 z-50 flex items-end justify-center sm:items-center" onClick={onClose}>
      <div className="lw-fade absolute inset-0 bg-black/60" />
      <div
        onClick={(e) => e.stopPropagation()}
        className={`lw-sheet safe-b relative w-full max-w-lg rounded-t-3xl bg-card sm:rounded-3xl ${tall ? "h-[92dvh] sm:h-auto sm:max-h-[90vh]" : "max-h-[92dvh]"} flex flex-col overflow-hidden`}
      >
        <div className="mx-auto mt-2 h-1 w-10 rounded-full bg-line sm:hidden" />
        {title ? (
          <div className="flex items-center justify-between px-5 pt-3">
            <h2 className="text-lg font-bold">{title}</h2>
            <button onClick={onClose} aria-label="Close" className="press flex h-9 w-9 items-center justify-center rounded-full bg-card2">
              <X width={18} height={18} />
            </button>
          </div>
        ) : null}
        <div className="flex-1 overflow-y-auto px-5 pb-4 pt-3">{children}</div>
      </div>
    </div>
  );
}

/* ---------- colour wheel + white slider ---------- */

export function ColorWheel({ h, s, onChange, onCommit }: { h: number; s: number; onChange?: (h: number, s: number) => void; onCommit: (h: number, s: number) => void }) {
  const ref = useRef<HTMLDivElement>(null);
  const [local, setLocal] = useState({ h, s });
  useEffect(() => setLocal({ h, s }), [h, s]);
  const pick = (e: React.PointerEvent) => {
    const r = ref.current!.getBoundingClientRect();
    const x = e.clientX - r.left - r.width / 2;
    const y = e.clientY - r.top - r.height / 2;
    const hue = ((Math.atan2(y, x) * 180) / Math.PI + 90 + 360) % 360;
    const sat = Math.min(100, (Math.hypot(x, y) / (r.width / 2)) * 100);
    return { h: Math.round(hue), s: Math.round(sat) };
  };
  const rad = ((local.h - 90) * Math.PI) / 180;
  const dist = local.s / 100;
  return (
    <div
      ref={ref}
      className="relative mx-auto aspect-square w-full max-w-[280px] touch-none rounded-full"
      style={{
        background: "radial-gradient(circle, #fff 0%, rgba(255,255,255,0) 70%), conic-gradient(from 0deg, red, yellow, lime, cyan, blue, magenta, red)",
      }}
      onPointerDown={(e) => {
        (e.target as HTMLElement).setPointerCapture(e.pointerId);
        const v = pick(e);
        setLocal(v);
        onChange?.(v.h, v.s);
      }}
      onPointerMove={(e) => {
        if (e.buttons !== 1) return;
        const v = pick(e);
        setLocal(v);
        onChange?.(v.h, v.s);
      }}
      onPointerUp={(e) => {
        const v = pick(e);
        setLocal(v);
        onCommit(v.h, v.s);
      }}
    >
      <div
        className="pointer-events-none absolute h-7 w-7 -translate-x-1/2 -translate-y-1/2 rounded-full border-[3px] border-white shadow-lg"
        style={{ left: `${50 + Math.cos(rad) * dist * 50}%`, top: `${50 + Math.sin(rad) * dist * 50}%`, background: `hsl(${local.h} ${local.s}% 50%)` }}
      />
    </div>
  );
}

export const KELVIN_MIN = 2000;
export const KELVIN_MAX = 6500;
const kelvinStops = [2000, 2700, 3500, 4500, 5500, 6500].map((k, i, a) => `${css(kelvinToRgb(k))} ${(i / (a.length - 1)) * 100}%`).join(", ");
export const kelvinGradient = `linear-gradient(90deg, ${kelvinStops})`;

export const WhiteSlider = ({ kelvin, onCommit, onInput }: { kelvin: number; onCommit: (k: number) => void; onInput?: (k: number) => void }) => (
  <Slider value={kelvin} min={KELVIN_MIN} max={KELVIN_MAX} step={50} gradientCss={kelvinGradient} onCommit={onCommit} onInput={onInput} />
);

export const Empty = ({ title, hint }: { title: string; hint?: string }) => (
  <div className="px-6 py-16 text-center">
    <div className="text-lg font-semibold">{title}</div>
    {hint ? <div className="mt-1 text-sm text-muted">{hint}</div> : null}
  </div>
);
