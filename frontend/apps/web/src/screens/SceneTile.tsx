import { gradient, luminance, sceneSwatches, type Scene } from "@lightwick/core";
import type { ReactNode } from "react";

/** Gradient tile that previews a scene's palette. */
export function SceneTile({
  scene,
  onClick,
  active,
  size = "md",
  badge,
  corner,
}: {
  scene: Scene;
  onClick?: () => void;
  active?: boolean;
  size?: "sm" | "md";
  badge?: ReactNode;
  corner?: ReactNode;
}) {
  const sw = sceneSwatches(scene);
  const dark = luminance(sw[sw.length - 1]) < 0.55;
  return (
    <div
      onClick={onClick}
      className={`press relative shrink-0 cursor-pointer overflow-hidden rounded-2xl ${size === "sm" ? "h-[76px] w-[124px]" : "aspect-[3/2] w-full"} ${
        active ? "ring-[3px] ring-white" : ""
      }`}
      style={{ background: gradient(sw, 120) }}
    >
      <div className="absolute inset-0 bg-gradient-to-t from-black/45 to-transparent" />
      {corner ? <div className="absolute right-2 top-2">{corner}</div> : null}
      <div className={`absolute bottom-2 left-3 right-3 flex items-end justify-between gap-2 ${dark ? "text-white" : "text-white"}`}>
        <div className={`truncate font-semibold drop-shadow ${size === "sm" ? "text-[13px]" : "text-[15px]"}`}>{scene.name}</div>
        {badge}
      </div>
    </div>
  );
}
