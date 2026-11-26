/**
 * WebGL palette. three.js materials cannot read CSS variables, so this mirrors
 * src/styles/tokens.css ("Ice & Violet"). Keep both in sync.
 */
export const palette = {
  /** tokens.css --bg */
  bg: "#080d1e",
  /** tokens.css --ice */
  ice: "#b7e4ff",
  /** tokens.css --violet */
  violet: "#a78bfa",
  /** tokens.css --text */
  text: "#f5f9ff",
  /** Derived tints (ice/violet lifted toward white) for lights and glass. */
  iceLight: "#dff3ff",
  iceAttenuation: "#d2f3ff",
  violetAttenuation: "#d9ceff",
  /** Refraction base where the alpha canvas is empty (pale, cyan-shifted ice). */
  glassBackground: "#b0e2fa",
  /** Environment-map fill behind the lightformers; only seen in grazing reflections. */
  envFill: "#34557a",
} as const;

/** CSS rgba() strings for the 2D backdrop canvas, built from the palette RGB values. */
export const rgba = {
  ice: (a: number) => `rgba(183,228,255,${a})`,
  violet: (a: number) => `rgba(167,139,250,${a})`,
  text: (a: number) => `rgba(245,249,255,${a})`,
  bg: (a: number) => `rgba(8,13,30,${a})`,
};
