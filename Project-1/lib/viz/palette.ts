// Qualitative palette aligned with the Markly warm-stone / graphite chart tokens.
// These are concrete hex values (not CSS variables) because canvas/SVG renderers
// need resolvable colours; they mirror --chart-1…5 in light mode and stay legible
// on both light and dark surfaces.
export const VIZ_PALETTE = [
  "#2f5fb3", // Ink blue (chart-1)
  "#4c7a63", // Pine (chart-2)
  "#9a7b3f", // Ochre (chart-3)
  "#8d5a68", // Clay rose (chart-4)
  "#5c6270", // Graphite blue (chart-5)
  "#a9542f", // Burnt sienna
  "#69704f", // Olive
  "#7a5f8d", // Muted violet
];

export interface VizGradientPreset {
  id: string;
  label: string;
  from: string;
  to: string;
}

export const VIZ_GRADIENTS: VizGradientPreset[] = [
  { id: "indigo_cyan", label: "Ink Blue", from: "#2f5fb3", to: "#7793bd" },
  { id: "emerald_teal", label: "Pine", from: "#3d6350", to: "#6f9482" },
  { id: "sunset_amber", label: "Ochre", from: "#8a6a30", to: "#c2a066" },
  { id: "violet_pink", label: "Clay Rose", from: "#7d4e5c", to: "#b08a95" },
  { id: "ocean_blue", label: "Deep Water", from: "#35567a", to: "#6d8caa" },
  { id: "monochrome", label: "Graphite", from: "#4a4a46", to: "#7c7c76" },
];
