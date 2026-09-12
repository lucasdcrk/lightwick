import { gradient, sceneSwatches, soften, tintFromRgb, type Scene } from "@lightwick/core";
import type { ReactNode } from "react";
import { Bolt, Check } from "../components/Icons";

/** Gallery tile: wide gradient preview with the scene name, used in the scene browser. */
export function SceneTile({ scene, onClick, active, badge, corner }: { scene: Scene; onClick?: () => void; active?: boolean; badge?: ReactNode; corner?: ReactNode }) {
  const sw = sceneSwatches(scene);
  const t = tintFromRgb(sw[0]);
  return (
    <div
      onClick={onClick}
      className={`press relative aspect-[3/2] w-full cursor-pointer overflow-hidden rounded-[14px] ${active ? "ring-[3px] ring-white" : ""}`}
      style={{ background: gradient(sw.map((c) => soften(c)), 160), boxShadow: active ? `0 0 26px rgba(${t.glow},.35)` : "none" }}
    >
      {corner ? <div className="absolute right-2 top-2">{corner}</div> : null}
      <div className="absolute bottom-2.5 left-3 right-3 flex items-end justify-between gap-2">
        <div className="truncate text-[12px] font-bold" style={{ color: t.ink }}>
          {scene.name}
        </div>
        {badge}
      </div>
    </div>
  );
}

/** Room card, 104×124, as in the design: gradient, check mark when active, name at the bottom. */
export function SceneCard({ scene, active, instant, onClick }: { scene: Scene; active?: boolean; instant?: boolean; onClick: () => void }) {
  const sw = sceneSwatches(scene);
  const t = tintFromRgb(sw[0]);

  return (
    <div
      onClick={onClick}
      className="press relative flex h-[124px] w-[104px] flex-none cursor-pointer flex-col items-center justify-center gap-2 rounded-[14px]"
      style={{ background: gradient(sw.map((c) => soften(c)), 160), boxShadow: active ? `0 0 26px rgba(${t.glow},.35)` : "none", transition: "box-shadow 200ms" }}
    >
      {active ? (
        <div className="flex h-[34px] w-[34px] items-center justify-center rounded-full bg-white/35">
          <Check width={14} height={14} className="text-white" strokeWidth={3} />
        </div>
      ) : null}
      {instant ? <Bolt width={12} height={12} className="absolute right-2 top-2" style={{ color: t.ink, opacity: 0.6 }} /> : null}
      <span className="absolute inset-x-0 bottom-2.5 truncate px-2 text-center text-[11px] font-bold" style={{ color: t.ink }}>
        {scene.name}
      </span>
    </div>
  );
}
