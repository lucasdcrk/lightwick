import type { SVGProps } from "react";

const base = (props: SVGProps<SVGSVGElement>) => ({
  width: 22,
  height: 22,
  viewBox: "0 0 24 24",
  fill: "none",
  stroke: "currentColor",
  strokeWidth: 2,
  strokeLinecap: "round" as const,
  strokeLinejoin: "round" as const,
  ...props,
});

export const Back = (p: SVGProps<SVGSVGElement>) => <svg {...base(p)}><path d="M15 6l-6 6 6 6" /></svg>;
export const Chevron = (p: SVGProps<SVGSVGElement>) => <svg {...base(p)}><path d="M9 6l6 6-6 6" /></svg>;
export const Plus = (p: SVGProps<SVGSVGElement>) => <svg {...base(p)}><path d="M12 5v14M5 12h14" /></svg>;
export const X = (p: SVGProps<SVGSVGElement>) => <svg {...base(p)}><path d="M6 6l12 12M18 6L6 18" /></svg>;
export const Check = (p: SVGProps<SVGSVGElement>) => <svg {...base(p)}><path d="M5 12l5 5L20 7" /></svg>;
export const Trash = (p: SVGProps<SVGSVGElement>) => <svg {...base(p)}><path d="M4 7h16M10 11v6M14 11v6M6 7l1 13h10l1-13M9 7V4h6v3" /></svg>;
export const More = (p: SVGProps<SVGSVGElement>) => <svg {...base(p)}><circle cx="5" cy="12" r="1.5" fill="currentColor" /><circle cx="12" cy="12" r="1.5" fill="currentColor" /><circle cx="19" cy="12" r="1.5" fill="currentColor" /></svg>;
export const Heart = ({ filled, ...p }: SVGProps<SVGSVGElement> & { filled?: boolean }) => (
  <svg {...base(p)} fill={filled ? "currentColor" : "none"}><path d="M12 21s-7-4.5-9-9a5 5 0 0 1 9-3 5 5 0 0 1 9 3c-2 4.5-9 9-9 9z" /></svg>
);
export const Play = (p: SVGProps<SVGSVGElement>) => <svg {...base(p)} fill="currentColor"><path d="M7 5v14l11-7z" /></svg>;
export const Pause = (p: SVGProps<SVGSVGElement>) => <svg {...base(p)} fill="currentColor"><path d="M7 5h4v14H7zM13 5h4v14h-4z" /></svg>;
export const Home = (p: SVGProps<SVGSVGElement>) => <svg {...base(p)}><path d="M3 11l9-8 9 8v10a1 1 0 0 1-1 1h-5v-7h-6v7H4a1 1 0 0 1-1-1z" /></svg>;
export const Clock = (p: SVGProps<SVGSVGElement>) => <svg {...base(p)}><circle cx="12" cy="12" r="9" /><path d="M12 7v5l3 2" /></svg>;
export const Gear = (p: SVGProps<SVGSVGElement>) => <svg {...base(p)}><circle cx="12" cy="12" r="3" /><path d="M19.4 15a1.7 1.7 0 0 0 .3 1.8l.1.1a2 2 0 1 1-2.8 2.8l-.1-.1a1.7 1.7 0 0 0-1.8-.3 1.7 1.7 0 0 0-1 1.5V21a2 2 0 1 1-4 0v-.1a1.7 1.7 0 0 0-1.1-1.5 1.7 1.7 0 0 0-1.8.3l-.1.1a2 2 0 1 1-2.8-2.8l.1-.1a1.7 1.7 0 0 0 .3-1.8 1.7 1.7 0 0 0-1.5-1H3a2 2 0 1 1 0-4h.1a1.7 1.7 0 0 0 1.5-1.1 1.7 1.7 0 0 0-.3-1.8l-.1-.1a2 2 0 1 1 2.8-2.8l.1.1a1.7 1.7 0 0 0 1.8.3H9a1.7 1.7 0 0 0 1-1.5V3a2 2 0 1 1 4 0v.1a1.7 1.7 0 0 0 1 1.5 1.7 1.7 0 0 0 1.8-.3l.1-.1a2 2 0 1 1 2.8 2.8l-.1.1a1.7 1.7 0 0 0-.3 1.8V9a1.7 1.7 0 0 0 1.5 1H21a2 2 0 1 1 0 4h-.1a1.7 1.7 0 0 0-1.5 1z" /></svg>;
export const Sun = (p: SVGProps<SVGSVGElement>) => <svg {...base(p)}><circle cx="12" cy="12" r="4" /><path d="M12 2v2M12 20v2M2 12h2M20 12h2M4.9 4.9l1.4 1.4M17.7 17.7l1.4 1.4M4.9 19.1l1.4-1.4M17.7 6.3l1.4-1.4" /></svg>;
export const Moon = (p: SVGProps<SVGSVGElement>) => <svg {...base(p)}><path d="M21 13A8 8 0 1 1 11 3a6 6 0 0 0 10 10z" /></svg>;
export const Motion = (p: SVGProps<SVGSVGElement>) => <svg {...base(p)}><circle cx="14" cy="4" r="2" /><path d="M8 22l3-8-3-2 4-6 4 2 3-1M12 14l3 2 2 6" /></svg>;
export const Away = (p: SVGProps<SVGSVGElement>) => <svg {...base(p)}><path d="M3 11l9-8 9 8M5 10v10h5v-6h4v6h5V10" /><path d="M2 21h20" /></svg>;
export const Remote = (p: SVGProps<SVGSVGElement>) => <svg {...base(p)}><rect x="7" y="2" width="10" height="20" rx="3" /><circle cx="12" cy="8" r="1.5" fill="currentColor" /><path d="M10 13h4M10 17h4" /></svg>;
export const Sync = (p: SVGProps<SVGSVGElement>) => <svg {...base(p)}><path d="M21 12a9 9 0 0 1-15.5 6.2M3 12a9 9 0 0 1 15.5-6.2M18 3v5h-5M6 21v-5h5" /></svg>;
export const Bolt = (p: SVGProps<SVGSVGElement>) => <svg {...base(p)} fill="currentColor" stroke="none"><path d="M13 2L4 14h6l-1 8 9-12h-6z" /></svg>;
export const Bulb = (p: SVGProps<SVGSVGElement>) => <svg {...base(p)}><path d="M9 18h6M10 21h4M12 3a6 6 0 0 0-4 10.5c.7.7 1 1.5 1 2.5h6c0-1 .3-1.8 1-2.5A6 6 0 0 0 12 3z" /></svg>;
export const Palette = (p: SVGProps<SVGSVGElement>) => <svg {...base(p)}><path d="M12 3a9 9 0 0 0 0 18c1 0 1.5-.6 1.5-1.4 0-.5-.2-.8-.5-1.2-.3-.3-.5-.7-.5-1.2 0-.8.7-1.5 1.5-1.5H16a5 5 0 0 0 5-5c0-4.4-4-7.7-9-7.7z" /><circle cx="7.5" cy="11.5" r="1" fill="currentColor" /><circle cx="10.5" cy="7.5" r="1" fill="currentColor" /><circle cx="15" cy="7.5" r="1" fill="currentColor" /></svg>;
export const Camera = (p: SVGProps<SVGSVGElement>) => <svg {...base(p)}><path d="M4 8h3l2-3h6l2 3h3v11H4z" /><circle cx="12" cy="13" r="3" /></svg>;
export const Power = (p: SVGProps<SVGSVGElement>) => <svg {...base(p)}><path d="M12 3v9M6.3 6.3a8 8 0 1 0 11.4 0" /></svg>;
export const Menu = (p: SVGProps<SVGSVGElement>) => <svg {...base(p)}><path d="M4 7h16M4 12h16M4 17h16" /></svg>;
