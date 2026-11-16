"use client";

import * as React from "react";
import { Palette, Pipette, Check, Copy, RefreshCw, Sparkles, X } from "lucide-react";
import { Button } from "@/components/ui/button";

export interface UniversalColorPickerProps {
  color?: string;
  value?: string;
  onChange: (color: string) => void;
  label?: string;
  showFormatSwitcher?: boolean;
}

// 1. Standardized Curated Palettes from Open Source Systems (Tailwind, Observable/D3, Material)
export const OPEN_SOURCE_PALETTES = {
  tailwind: [
    { name: "Blue", hex: "#3b82f6" },
    { name: "Indigo", hex: "#6366f1" },
    { name: "Violet", hex: "#8b5cf6" },
    { name: "Purple", hex: "#a855f7" },
    { name: "Fuchsia", hex: "#d946ef" },
    { name: "Pink", hex: "#ec4899" },
    { name: "Rose", hex: "#f43f5e" },
    { name: "Red", hex: "#ef4444" },
    { name: "Orange", hex: "#f97316" },
    { name: "Amber", hex: "#f59e0b" },
    { name: "Yellow", hex: "#eab308" },
    { name: "Lime", hex: "#84cc16" },
    { name: "Green", hex: "#22c55e" },
    { name: "Emerald", hex: "#10b981" },
    { name: "Teal", hex: "#14b8a6" },
    { name: "Cyan", hex: "#06b6d4" },
    { name: "Sky", hex: "#0ea5e9" },
    { name: "Slate", hex: "#64748b" },
  ],
  d3Observable: [
    { name: "Tableau Blue", hex: "#4e79a7" },
    { name: "Tableau Orange", hex: "#f28e2c" },
    { name: "Tableau Red", hex: "#e15759" },
    { name: "Tableau Teal", hex: "#76b7b2" },
    { name: "Tableau Green", hex: "#59a14f" },
    { name: "Tableau Yellow", hex: "#edc949" },
    { name: "Tableau Purple", hex: "#af7aa1" },
    { name: "Tableau Pink", hex: "#ff9da7" },
    { name: "Tableau Brown", hex: "#9c755f" },
    { name: "Tableau Gray", hex: "#bab0ab" },
  ],
  materialVibrant: [
    { name: "Deep Purple", hex: "#673ab7" },
    { name: "Light Blue", hex: "#03a9f4" },
    { name: "Deep Orange", hex: "#ff5722" },
    { name: "Light Green", hex: "#8bc34a" },
    { name: "Blue Grey", hex: "#607d8b" },
    { name: "Neon Cyan", hex: "#00e5ff" },
    { name: "Neon Lime", hex: "#aeea00" },
    { name: "Crimson", hex: "#d50000" },
  ],
};

// Conversions
function hexToRgb(hex: string): { r: number; g: number; b: number } {
  let clean = hex.replace("#", "").trim();
  if (clean.length === 3) clean = clean.split("").map((c) => c + c).join("");
  const num = parseInt(clean, 16);
  return {
    r: (num >> 16) & 255,
    g: (num >> 8) & 255,
    b: num & 255,
  };
}

function rgbToHsl(r: number, g: number, b: number): { h: number; s: number; l: number } {
  r /= 255;
  g /= 255;
  b /= 255;
  const max = Math.max(r, g, b);
  const min = Math.min(r, g, b);
  let h = 0;
  let s = 0;
  const l = (max + min) / 2;

  if (max !== min) {
    const d = max - min;
    s = l > 0.5 ? d / (2 - max - min) : d / (max + min);
    switch (max) {
      case r:
        h = (g - b) / d + (g < b ? 6 : 0);
        break;
      case g:
        h = (b - r) / d + 2;
        break;
      case b:
        h = (r - g) / d + 4;
        break;
    }
    h /= 6;
  }
  return { h: Math.round(h * 360), s: Math.round(s * 100), l: Math.round(l * 100) };
}

function hslToHex(h: number, s: number, l: number): string {
  l /= 100;
  const a = (s * Math.min(l, 1 - l)) / 100;
  const f = (n: number) => {
    const k = (n + h / 30) % 12;
    const color = l - a * Math.max(Math.min(k - 3, 9 - k, 1), -1);
    return Math.round(255 * color).toString(16).padStart(2, "0");
  };
  return `#${f(0)}${f(8)}${f(4)}`;
}

export function UniversalColorPicker({
  color,
  value,
  onChange,
  label = "Pick color",
  showFormatSwitcher = true,
}: UniversalColorPickerProps) {
  const activeColor = color || value || "#3b82f6";
  const [isOpen, setIsOpen] = React.useState(false);
  const [format, setFormat] = React.useState<"hex" | "rgb" | "hsl">("hex");
  const [copied, setCopied] = React.useState(false);
  const [activeTab, setActiveTab] = React.useState<"swatches" | "custom" | "gradient">("swatches");
  const popoverRef = React.useRef<HTMLDivElement>(null);

  // Derived formats
  const rgb = React.useMemo(() => {
    try {
      return hexToRgb(activeColor);
    } catch {
      return { r: 59, g: 130, b: 246 };
    }
  }, [activeColor]);

  const hsl = React.useMemo(() => {
    return rgbToHsl(rgb.r, rgb.g, rgb.b);
  }, [rgb]);

  // Recent Swatches
  const [recentSwatches, setRecentSwatches] = React.useState<string[]>(() => {
    if (typeof window !== "undefined") {
      try {
        const stored = localStorage.getItem("markly_recent_color_swatches");
        if (stored) return JSON.parse(stored);
      } catch {}
    }
    return ["#3b82f6", "#10b981", "#f59e0b", "#ec4899", "#8b5cf6", "#06b6d4"];
  });

  const recordColorChoice = (c: string) => {
    onChange(c);
    setRecentSwatches((prev) => {
      const filtered = prev.filter((item) => item.toLowerCase() !== c.toLowerCase());
      const next = [c, ...filtered].slice(0, 8);
      try {
        localStorage.setItem("markly_recent_color_swatches", JSON.stringify(next));
      } catch {}
      return next;
    });
  };

  // Close when clicking outside
  React.useEffect(() => {
    function handleClickOutside(event: MouseEvent) {
      if (popoverRef.current && !popoverRef.current.contains(event.target as Node)) {
        setIsOpen(false);
      }
    }
    if (isOpen) {
      document.addEventListener("mousedown", handleClickOutside);
      return () => document.removeEventListener("mousedown", handleClickOutside);
    }
  }, [isOpen]);

  const copyColor = () => {
    let text = activeColor;
    if (format === "rgb") text = `rgb(${rgb.r}, ${rgb.g}, ${rgb.b})`;
    if (format === "hsl") text = `hsl(${hsl.h}, ${hsl.s}%, ${hsl.l}%)`;
    navigator.clipboard.writeText(text);
    setCopied(true);
    setTimeout(() => setCopied(false), 1500);
  };

  // EyeDropper API (Chromium open source feature)
  const handleEyeDropper = async () => {
    if (typeof window !== "undefined" && "EyeDropper" in window) {
      try {
        const eyeDropper = new (window as any).EyeDropper();
        const res = await eyeDropper.open();
        if (res?.sRGBHex) {
          recordColorChoice(res.sRGBHex);
        }
      } catch {}
    }
  };

  return (
    <div className="relative inline-flex items-center" ref={popoverRef}>
      {/* Universal Trigger Button */}
      <button
        type="button"
        onClick={() => setIsOpen(!isOpen)}
        className="h-8 px-2 rounded-lg border border-border bg-card hover:bg-secondary flex items-center gap-1.5 cursor-pointer transition-colors group shadow-2xs"
        title={label}
      >
        <span
          className="h-4 w-4 rounded-full border border-black/20 dark:border-white/20 shadow-xs shrink-0 transition-transform group-hover:scale-110"
          style={{ backgroundColor: activeColor }}
        />
        <Palette className="h-3.5 w-3.5 text-muted-foreground group-hover:text-foreground" />
      </button>

      {/* Standardized Open-Source Color Selection Dialog */}
      {isOpen && (
        <div className="absolute left-0 top-full mt-1.5 w-72 rounded-2xl border border-border bg-card shadow-2xl p-3 z-50 animate-in fade-in zoom-in-95 duration-150 select-none">
          {/* Header & Tabs */}
          <div className="flex items-center justify-between border-b border-border/60 pb-2 mb-2.5">
            <div className="flex items-center gap-1 bg-secondary/80 p-0.5 rounded-lg border border-border/50 text-[10px] font-medium">
              <button
                type="button"
                onClick={() => setActiveTab("swatches")}
                className={`px-2 py-0.5 rounded cursor-pointer transition-colors ${
                  activeTab === "swatches" ? "bg-card text-foreground font-semibold shadow-2xs" : "text-muted-foreground"
                }`}
              >
                Palettes
              </button>
              <button
                type="button"
                onClick={() => setActiveTab("custom")}
                className={`px-2 py-0.5 rounded cursor-pointer transition-colors ${
                  activeTab === "custom" ? "bg-card text-foreground font-semibold shadow-2xs" : "text-muted-foreground"
                }`}
              >
                Sliders
              </button>
              <button
                type="button"
                onClick={() => setActiveTab("gradient")}
                className={`px-2 py-0.5 rounded cursor-pointer transition-colors ${
                  activeTab === "gradient" ? "bg-card text-foreground font-semibold shadow-2xs" : "text-muted-foreground"
                }`}
              >
                Gradients
              </button>
            </div>

            <div className="flex items-center gap-1">
              {typeof window !== "undefined" && "EyeDropper" in window && (
                <button
                  type="button"
                  onClick={handleEyeDropper}
                  title="Pick pixel from screen (EyeDropper API)"
                  className="h-6 w-6 rounded hover:bg-secondary flex items-center justify-center text-muted-foreground hover:text-foreground cursor-pointer"
                >
                  <Pipette className="h-3 w-3" />
                </button>
              )}
              <button
                type="button"
                onClick={() => setIsOpen(false)}
                className="h-6 w-6 rounded hover:bg-secondary flex items-center justify-center text-muted-foreground hover:text-foreground cursor-pointer"
              >
                <X className="h-3.5 w-3.5" />
              </button>
            </div>
          </div>

          {/* TAB 1: Open-Source Curated Palettes */}
          {activeTab === "swatches" && (
            <div className="space-y-2.5">
              <div>
                <span className="text-[10px] font-semibold text-muted-foreground uppercase tracking-wider block mb-1">
                  Tailwind System Palettes
                </span>
                <div className="grid grid-cols-6 gap-1.5">
                  {OPEN_SOURCE_PALETTES.tailwind.map((item) => (
                    <button
                      key={item.hex}
                      type="button"
                      onClick={() => recordColorChoice(item.hex)}
                      className="h-6 w-full rounded-md border border-black/15 dark:border-white/15 flex items-center justify-center cursor-pointer transition-transform hover:scale-110 active:scale-95 relative"
                      style={{ backgroundColor: item.hex }}
                      title={item.name}
                    >
                      {activeColor.toLowerCase() === item.hex.toLowerCase() && (
                        <Check className="h-3 w-3 text-white drop-shadow-md" />
                      )}
                    </button>
                  ))}
                </div>
              </div>

              <div>
                <span className="text-[10px] font-semibold text-muted-foreground uppercase tracking-wider block mb-1">
                  Observable / D3 Visual Schemes
                </span>
                <div className="grid grid-cols-5 gap-1.5">
                  {OPEN_SOURCE_PALETTES.d3Observable.map((item) => (
                    <button
                      key={item.hex}
                      type="button"
                      onClick={() => recordColorChoice(item.hex)}
                      className="h-5 w-full rounded-md border border-black/15 dark:border-white/15 flex items-center justify-center cursor-pointer transition-transform hover:scale-110 relative"
                      style={{ backgroundColor: item.hex }}
                      title={item.name}
                    >
                      {activeColor.toLowerCase() === item.hex.toLowerCase() && (
                        <Check className="h-2.5 w-2.5 text-white drop-shadow-md" />
                      )}
                    </button>
                  ))}
                </div>
              </div>
            </div>
          )}

          {/* TAB 2: Custom HSL Sliders & Native Hex Input */}
          {activeTab === "custom" && (
            <div className="space-y-3 py-1">
              {/* Hue Range Slider */}
              <div className="space-y-1">
                <div className="flex items-center justify-between text-[11px] text-muted-foreground">
                  <span>Hue: {hsl.h}°</span>
                </div>
                <input
                  type="range"
                  min={0}
                  max={360}
                  value={hsl.h}
                  onChange={(e) => {
                    const nextHex = hslToHex(Number(e.target.value), hsl.s, hsl.l);
                    recordColorChoice(nextHex);
                  }}
                  className="w-full h-2 rounded-lg appearance-none cursor-pointer"
                  style={{
                    background:
                      "linear-gradient(to right, #ff0000 0%, #ffff00 17%, #00ff00 33%, #00ffff 50%, #0000ff 67%, #ff00ff 83%, #ff0000 100%)",
                  }}
                />
              </div>

              {/* Saturation Range Slider */}
              <div className="space-y-1">
                <div className="flex items-center justify-between text-[11px] text-muted-foreground">
                  <span>Saturation: {hsl.s}%</span>
                </div>
                <input
                  type="range"
                  min={0}
                  max={100}
                  value={hsl.s}
                  onChange={(e) => {
                    const nextHex = hslToHex(hsl.h, Number(e.target.value), hsl.l);
                    recordColorChoice(nextHex);
                  }}
                  className="w-full h-2 rounded-lg appearance-none cursor-pointer bg-secondary"
                />
              </div>

              {/* Lightness Range Slider */}
              <div className="space-y-1">
                <div className="flex items-center justify-between text-[11px] text-muted-foreground">
                  <span>Lightness: {hsl.l}%</span>
                </div>
                <input
                  type="range"
                  min={10}
                  max={90}
                  value={hsl.l}
                  onChange={(e) => {
                    const nextHex = hslToHex(hsl.h, hsl.s, Number(e.target.value));
                    recordColorChoice(nextHex);
                  }}
                  className="w-full h-2 rounded-lg appearance-none cursor-pointer bg-secondary"
                />
              </div>
            </div>
          )}

          {/* TAB 3: Curated Visual Gradients */}
          {activeTab === "gradient" && (
            <div className="space-y-2">
              <span className="text-[10px] font-semibold text-muted-foreground uppercase tracking-wider block mb-1">
                Harmonic Gradient Pairs
              </span>
              <div className="grid grid-cols-2 gap-1.5">
                {[
                  { name: "Oceanic", from: "#0ea5e9", to: "#3b82f6" },
                  { name: "Emerald", from: "#10b981", to: "#059669" },
                  { name: "Sunset", from: "#f59e0b", to: "#ef4444" },
                  { name: "Neon Violet", from: "#8b5cf6", to: "#ec4899" },
                  { name: "Cyberpunk", from: "#06b6d4", to: "#8b5cf6" },
                  { name: "Amber Gold", from: "#fbbf24", to: "#d97706" },
                ].map((g) => (
                  <button
                    key={g.name}
                    type="button"
                    onClick={() => recordColorChoice(g.from)}
                    className="h-7 rounded-lg border border-border flex items-center px-2 cursor-pointer transition-transform hover:scale-102"
                    style={{ background: `linear-gradient(135deg, ${g.from}, ${g.to})` }}
                  >
                    <span className="text-[10px] font-semibold text-white drop-shadow">{g.name}</span>
                  </button>
                ))}
              </div>
            </div>
          )}

          {/* Multi-Format Output Bar (Hex / RGB / HSL) */}
          <div className="mt-3 pt-2.5 border-t border-border/60 flex items-center justify-between gap-1.5 text-xs">
            {showFormatSwitcher && (
              <button
                type="button"
                onClick={() => setFormat(format === "hex" ? "rgb" : format === "rgb" ? "hsl" : "hex")}
                className="px-1.5 py-0.5 rounded bg-secondary text-[10px] font-mono text-muted-foreground hover:text-foreground cursor-pointer uppercase border border-border/50"
                title="Switch color format"
              >
                {format}
              </button>
            )}

            <input
              type="text"
              value={
                format === "hex"
                  ? activeColor
                  : format === "rgb"
                  ? `rgb(${rgb.r}, ${rgb.g}, ${rgb.b})`
                  : `hsl(${hsl.h}, ${hsl.s}%, ${hsl.l}%)`
              }
              onChange={(e) => {
                const val = e.target.value.trim();
                if (val.startsWith("#") && (val.length === 4 || val.length === 7)) {
                  recordColorChoice(val);
                }
              }}
              className="flex-1 h-7 px-2 font-mono text-[11px] rounded-md border border-border bg-background text-foreground"
            />

            <button
              type="button"
              onClick={copyColor}
              className="h-7 w-7 rounded-md border border-border hover:bg-secondary flex items-center justify-center text-muted-foreground hover:text-foreground cursor-pointer transition-colors"
              title="Copy color code"
            >
              {copied ? <Check className="h-3 w-3 text-emerald-500" /> : <Copy className="h-3 w-3" />}
            </button>
          </div>

          {/* Recent Swatches */}
          {recentSwatches.length > 0 && (
            <div className="mt-2 pt-2 border-t border-border/40 flex items-center gap-1">
              <span className="text-[9px] font-mono text-muted-foreground uppercase mr-1">Recent:</span>
              <div className="flex items-center gap-1">
                {recentSwatches.map((sw, i) => (
                  <button
                    key={`${sw}_${i}`}
                    type="button"
                    onClick={() => recordColorChoice(sw)}
                    className="h-4 w-4 rounded-full border border-black/20 dark:border-white/20 cursor-pointer transition-transform hover:scale-125"
                    style={{ backgroundColor: sw }}
                  />
                ))}
              </div>
            </div>
          )}
        </div>
      )}
    </div>
  );
}
