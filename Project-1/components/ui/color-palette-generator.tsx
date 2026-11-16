"use client";

import * as React from "react";
import { Sparkles, RotateCcw, Dices } from "lucide-react";

export interface HarmonicPreset {
  name: string;
  colors: string[];
}

export const HARMONIC_PRESETS: HarmonicPreset[] = [
  {
    name: "Cyberpunk",
    colors: ["#ec4899", "#8b5cf6", "#06b6d4", "#f43f5e", "#a855f7", "#3b82f6"],
  },
  {
    name: "Nordic Forest",
    colors: ["#059669", "#10b981", "#14b8a6", "#047857", "#0d9488", "#065f46"],
  },
  {
    name: "Sunset Haze",
    colors: ["#f97316", "#ef4444", "#f59e0b", "#fb923c", "#f87171", "#d97706"],
  },
  {
    name: "Oceanic",
    colors: ["#0284c7", "#0ea5e9", "#2563eb", "#38bdf8", "#0369a1", "#1d4ed8"],
  },
  {
    name: "Solar Gold",
    colors: ["#eab308", "#facc15", "#ca8a04", "#d97706", "#f59e0b", "#b45309"],
  },
  {
    name: "Monolith Slate",
    colors: ["#64748b", "#475569", "#334155", "#94a3b8", "#1e293b", "#0f172a"],
  },
  {
    name: "Tokyo Neon",
    colors: ["#f43f5e", "#8b5cf6", "#10b981", "#06b6d4", "#e11d48", "#6366f1"],
  },
  {
    name: "Earthy Terracotta",
    colors: ["#ea580c", "#c2410c", "#9a3412", "#b45309", "#78350f", "#dc2626"],
  },
];

export const STANDARD_SWATCHES = [
  "#3b82f6", // Blue
  "#2563eb", // Ink Blue
  "#059669", // Pine Emerald
  "#10b981", // Emerald
  "#0891b2", // Cyan Teal
  "#d97706", // Amber
  "#ea580c", // Burnt Orange
  "#ef4444", // Crimson Red
  "#ec4899", // Rose
  "#7c3aed", // Iris Violet
  "#8b5cf6", // Purple
  "#4b5563", // Slate Cool
  "#64748b", // Slate
  "#f59e0b", // Gold
  "#06b6d4", // Sky Cyan
  "#14b8a6", // Mint Teal
];

export interface ColorPaletteGeneratorProps {
  value: string;
  onChange: (hex: string) => void;
  defaultValue?: string;
  className?: string;
}

export function ColorPaletteGenerator({
  value,
  onChange,
  defaultValue = "#3b82f6",
  className = "",
}: ColorPaletteGeneratorProps) {
  const handleRandomHarmonicColor = () => {
    const all = HARMONIC_PRESETS.flatMap((p) => p.colors);
    const chosen = all[Math.floor(Math.random() * all.length)];
    onChange(chosen);
  };

  const handleResetColor = () => {
    onChange(defaultValue);
  };

  return (
    <div className={`space-y-3 ${className}`}>
      {/* Box 1: Harmonic Palettes Generator */}
      <div className="rounded-xl border border-border bg-card p-3 shadow-xs space-y-2">
        <div className="flex items-center justify-between">
          <span className="text-xs font-semibold text-foreground flex items-center gap-1.5">
            <Dices className="h-3.5 w-3.5 text-primary" />
            <span>Harmonic Palettes Generator</span>
          </span>
          <span className="text-[10px] font-mono text-muted-foreground">
            Click preset to sample
          </span>
        </div>
        <div className="grid grid-cols-2 sm:grid-cols-4 gap-1.5">
          {HARMONIC_PRESETS.map((preset) => (
            <button
              key={preset.name}
              type="button"
              onClick={() => {
                const randomColor =
                  preset.colors[Math.floor(Math.random() * preset.colors.length)];
                onChange(randomColor);
              }}
              className="p-1.5 rounded-lg border border-border bg-secondary/40 hover:bg-secondary flex flex-col gap-1 text-left cursor-pointer transition-colors group"
            >
              <span className="text-[10px] font-medium text-foreground truncate group-hover:text-primary transition-colors">
                {preset.name}
              </span>
              <div className="flex gap-0.5">
                {preset.colors.slice(0, 5).map((col, i) => (
                  <span
                    key={i}
                    className="h-2 flex-1 rounded-xs"
                    style={{ backgroundColor: col }}
                  />
                ))}
              </div>
            </button>
          ))}
        </div>
      </div>

      {/* Box 2: Color Palette Swatches & Actions */}
      <div className="rounded-xl border border-border bg-card p-3 shadow-xs space-y-2.5">
        <div className="flex items-center justify-between">
          <label className="text-xs font-semibold text-foreground">
            Color Palette & Swatches
          </label>
          <div className="flex items-center gap-1.5">
            <button
              type="button"
              onClick={handleRandomHarmonicColor}
              className="h-6 px-2 rounded-md bg-secondary border border-border text-[11px] font-medium text-foreground hover:bg-muted flex items-center gap-1 cursor-pointer transition-colors shadow-2xs"
              title="Generate random harmonious color"
            >
              <Sparkles className="h-3 w-3 text-primary" />
              <span>Generate</span>
            </button>
            <button
              type="button"
              onClick={handleResetColor}
              className="h-6 px-2 rounded-md bg-secondary border border-border text-[11px] font-medium text-foreground hover:bg-muted flex items-center gap-1 cursor-pointer transition-colors shadow-2xs"
              title="Reset color to default"
            >
              <RotateCcw className="h-3 w-3 text-muted-foreground" />
              <span>Reset</span>
            </button>
          </div>
        </div>

        <div className="flex flex-wrap gap-1.5 items-center">
          {STANDARD_SWATCHES.map((hex) => {
            const isSelected = value.toLowerCase() === hex.toLowerCase();
            return (
              <button
                key={hex}
                type="button"
                onClick={() => onChange(hex)}
                style={{ backgroundColor: hex }}
                className={`h-6 w-6 rounded-md cursor-pointer transition-transform hover:scale-110 flex items-center justify-center shrink-0 ${
                  isSelected ? "ring-2 ring-foreground ring-offset-2 scale-105" : ""
                }`}
                title={hex}
              />
            );
          })}

          {/* Custom Hex Picker Input */}
          <div className="flex items-center gap-1.5 ml-auto pl-2 border-l border-border/60">
            <input
              type="color"
              value={value}
              onChange={(e) => onChange(e.target.value)}
              className="h-6 w-6 p-0 border border-border rounded cursor-pointer bg-transparent"
              title="Pick custom hex color"
            />
            <span className="font-mono text-[11px] text-muted-foreground uppercase">
              {value}
            </span>
          </div>
        </div>
      </div>
    </div>
  );
}
