// Color-blind safe qualitative palette (Okabe-Ito / Tol inspired)
export const VIZ_PALETTE = [
  "#2563eb", // Ink Blue (Primary)
  "#059669", // Emerald / Pine
  "#d97706", // Amber / Ochre
  "#7c3aed", // Iris / Violet
  "#0891b2", // Cyan / Slate Teal
  "#db2777", // Rose / Crimson
  "#4b5563", // Graphite / Cool Slate
  "#ea580c", // Burnt Orange
];

export interface VizGradientPreset {
  id: string;
  label: string;
  from: string;
  to: string;
}

export const VIZ_GRADIENTS: VizGradientPreset[] = [
  { id: "indigo_cyan", label: "Indigo Cyan", from: "#6366f1", to: "#06b6d4" },
  { id: "emerald_teal", label: "Emerald Mint", from: "#10b981", to: "#14b8a6" },
  { id: "sunset_amber", label: "Sunset Amber", from: "#f59e0b", to: "#ef4444" },
  { id: "violet_pink", label: "Violet Berry", from: "#8b5cf6", to: "#ec4899" },
  { id: "ocean_blue", label: "Ocean Sky", from: "#3b82f6", to: "#0284c7" },
  { id: "monochrome", label: "Monochrome Slate", from: "#475569", to: "#0f172a" },
];
