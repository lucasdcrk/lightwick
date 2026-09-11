import type { HassEntity } from "home-assistant-js-websocket";
import type { Color, Scene } from "./types";

export type RGB = [number, number, number];

const clamp = (v: number, lo = 0, hi = 255) => Math.max(lo, Math.min(hi, v));

/** Tanner Helland's approximation, good enough for swatches. */
export function kelvinToRgb(kelvin: number): RGB {
  const t = clamp(kelvin, 1000, 12000) / 100;
  const r = t <= 66 ? 255 : 329.698727446 * Math.pow(t - 60, -0.1332047592);
  const g = t <= 66 ? 99.4708025861 * Math.log(t) - 161.1195681661 : 288.1221695283 * Math.pow(t - 60, -0.0755148492);
  const b = t >= 66 ? 255 : t <= 19 ? 0 : 138.5177312231 * Math.log(t - 10) - 305.0447927307;
  return [clamp(r), clamp(g), clamp(b)].map(Math.round) as RGB;
}

export function hsToRgb(h: number, s: number, v = 100): RGB {
  const c = (v / 100) * (s / 100);
  const x = c * (1 - Math.abs(((h / 60) % 2) - 1));
  const m = v / 100 - c;
  const [r, g, b] =
    h < 60 ? [c, x, 0] : h < 120 ? [x, c, 0] : h < 180 ? [0, c, x] : h < 240 ? [0, x, c] : h < 300 ? [x, 0, c] : [c, 0, x];
  return [r, g, b].map((n) => Math.round((n + m) * 255)) as RGB;
}

export const css = (rgb: RGB, alpha = 1) => `rgba(${rgb[0]},${rgb[1]},${rgb[2]},${alpha})`;

export const colorToRgb = (c: Color): RGB => ("kelvin" in c ? kelvinToRgb(c.kelvin) : hsToRgb(c.h, c.s));

/** Colour a light is showing right now, or null when off/unknown. */
export function entityRgb(e: HassEntity | undefined): RGB | null {
  if (!e || e.state !== "on") return null;
  const a = e.attributes;
  if (a.color_mode === "color_temp" && a.color_temp_kelvin) return kelvinToRgb(a.color_temp_kelvin);
  if (a.rgb_color) return a.rgb_color as RGB;
  if (a.hs_color) return hsToRgb(a.hs_color[0], a.hs_color[1]);
  return kelvinToRgb(2700);
}

export const brightnessPct = (e: HassEntity | undefined) =>
  e?.state === "on" ? Math.round(((e.attributes.brightness ?? 255) / 255) * 100) : 0;

/** Palette a scene will paint, main light included, for previews. */
export function sceneSwatches(scene: Scene): RGB[] {
  if (scene.states) {
    const out = Object.values(scene.states)
      .filter((s): s is NonNullable<typeof s> => !!s)
      .map((s) => (s.color_temp_kelvin ? kelvinToRgb(s.color_temp_kelvin) : s.hs_color ? hsToRgb(...s.hs_color) : kelvinToRgb(2700)));
    return out.length ? out : [[40, 40, 48]];
  }
  const out = (scene.palette ?? []).map(colorToRgb);
  if (scene.main?.policy === "white") out.unshift(kelvinToRgb(scene.main.kelvin));
  return out.length ? out : [kelvinToRgb(2700)];
}

export function gradient(swatches: RGB[], angle = 135): string {
  if (swatches.length === 1) return css(swatches[0]);
  const stops = swatches.map((c, i) => `${css(c)} ${Math.round((i / (swatches.length - 1)) * 100)}%`);
  return `linear-gradient(${angle}deg, ${stops.join(", ")})`;
}

/** Perceived lightness 0..1, to pick text colour over a swatch. */
export const luminance = ([r, g, b]: RGB) => (0.2126 * r + 0.7152 * g + 0.0722 * b) / 255;
