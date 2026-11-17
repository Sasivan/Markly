"use client";

import * as React from "react";
import { createPortal } from "react-dom";
import { Palette, Pipette, Check, Copy, RefreshCw, Sparkles, X, Dices } from "lucide-react";
import { Button } from "@/components/ui/button";

export interface UniversalColorPickerProps {
  color?: string;
  value?: string;
  onChange: (color: string) => void;
  label?: string;
  showFormatSwitcher?: boolean;
  compact?: boolean;
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

// 2. Harmonic Generator Columns
export interface HarmonicColumn {
  name: string;
  colors: string[];
}

export const HARMONIC_COLUMNS: HarmonicColumn[] = [
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
    name: "Terracotta",
    colors: ["#ea580c", "#c2410c", "#9a3412", "#b45309", "#78350f", "#dc2626"],
  },
  {
    name: "Electric Indigo",
    colors: ["#4f46e5", "#6366f1", "#818cf8", "#a5b4fc", "#3730a3", "#312e81"],
  },
  {
    name: "Pastel Bloom",
    colors: ["#f472b6", "#818cf8", "#34d399", "#fb923c", "#fbbf24", "#c084fc"],
  },
];

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
  compact = true,
}: UniversalColorPickerProps) {
  const activeColor = color || value || "#3b82f6";
  const [isOpen, setIsOpen] = React.useState(false);
  const [format, setFormat] = React.useState<"hex" | "rgb" | "hsl">("hex");
  const [copied, setCopied] = React.useState(false);
  const [activeTab, setActiveTab] = React.useState<"swatches" | "generator" | "custom" | "gradient">("swatches");

  // Portal trigger and popover refs
  const triggerRef = React.useRef<HTMLButtonElement>(null);
  const popoverRef = React.useRef<HTMLDivElement>(null);
  const [coords, setCoords] = React.useState<{ top: number; left: number }>({ top: 0, left: 0 });

  // Custom Resizable dimensions state (persisted or interactive)
  const [popupWidth, setPopupWidth] = React.useState<number>(330);
  const [popupHeight, setPopupHeight] = React.useState<number>(380);
  const [isResizing, setIsResizing] = React.useState<"width" | "height" | "both" | "e" | "w" | "s" | "n" | "se" | "sw" | "ne" | "nw" | null>(null);

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

  const handleRollRandomColor = (e?: React.MouseEvent) => {
    e?.stopPropagation();
    const all = HARMONIC_COLUMNS.flatMap((col) => col.colors);
    const chosen = all[Math.floor(Math.random() * all.length)];
    recordColorChoice(chosen);
  };

  const handleRollColumn = (col: HarmonicColumn, e?: React.MouseEvent) => {
    e?.stopPropagation();
    const chosen = col.colors[Math.floor(Math.random() * col.colors.length)];
    recordColorChoice(chosen);
  };

  // Synchronously compute fixed screen coordinates so the popup floats completely OUT of parent modals
  const calculateCoords = React.useCallback(() => {
    if (!triggerRef.current || typeof window === "undefined") return null;
    const rect = triggerRef.current.getBoundingClientRect();
    const pad = 8;

    let top = rect.bottom + 4;
    if (top + popupHeight > window.innerHeight - pad) {
      if (rect.top - popupHeight - 4 > pad) {
        top = rect.top - popupHeight - 4;
      } else {
        top = Math.max(pad, window.innerHeight - popupHeight - pad);
      }
    }

    let left = rect.left;
    if (left + popupWidth > window.innerWidth - pad) {
      left = Math.max(pad, window.innerWidth - popupWidth - pad);
    }

    return { top, left };
  }, [popupWidth, popupHeight]);

  const updateCoords = React.useCallback(() => {
    const c = calculateCoords();
    if (c) setCoords(c);
  }, [calculateCoords]);

  const handleClose = React.useCallback(() => {
    setIsOpen(false);
    setCoords({ top: 0, left: 0 });
  }, []);

  const handleToggle = (e?: React.MouseEvent) => {
    e?.stopPropagation();
    if (!isOpen) {
      const c = calculateCoords();
      if (c) setCoords(c);
      setIsOpen(true);
    } else {
      handleClose();
    }
  };

  React.useLayoutEffect(() => {
    if (isOpen) {
      updateCoords();
      window.addEventListener("resize", updateCoords);
      window.addEventListener("scroll", updateCoords, true);
      return () => {
        window.removeEventListener("resize", updateCoords);
        window.removeEventListener("scroll", updateCoords, true);
      };
    }
  }, [isOpen, updateCoords]);

  // Close when clicking outside
  React.useEffect(() => {
    function handleClickOutside(event: MouseEvent) {
      const target = event.target as Node;
      if (
        popoverRef.current &&
        !popoverRef.current.contains(target) &&
        triggerRef.current &&
        !triggerRef.current.contains(target)
      ) {
        handleClose();
      }
    }
    if (isOpen) {
      document.addEventListener("mousedown", handleClickOutside);
      return () => document.removeEventListener("mousedown", handleClickOutside);
    }
  }, [isOpen, handleClose]);

  // Escape key handler
  React.useEffect(() => {
    function handleKeyDown(e: KeyboardEvent) {
      if (e.key === "Escape") {
        handleClose();
      }
    }
    if (isOpen) {
      document.addEventListener("keydown", handleKeyDown);
      return () => document.removeEventListener("keydown", handleKeyDown);
    }
  }, [isOpen, handleClose]);

  // Resizing handler for the portaled popup window
  const startPopupResize = (
    direction: "width" | "height" | "both" | "e" | "w" | "s" | "n" | "se" | "sw" | "ne" | "nw",
    startEvent: React.MouseEvent
  ) => {
    startEvent.preventDefault();
    startEvent.stopPropagation();
    setIsResizing(direction);

    const startX = startEvent.clientX;
    const startY = startEvent.clientY;
    const initialW = popupWidth;
    const initialH = popupHeight;
    const initialCoords = { ...coords };

    const prevCursor = document.body.style.cursor;
    const prevSelect = document.body.style.userSelect;
    document.body.style.userSelect = "none";
    if (direction === "width" || direction === "e" || direction === "w") {
      document.body.style.cursor = "ew-resize";
    } else if (direction === "height" || direction === "s" || direction === "n") {
      document.body.style.cursor = "ns-resize";
    } else if (direction === "ne" || direction === "sw") {
      document.body.style.cursor = "nesw-resize";
    } else {
      document.body.style.cursor = "nwse-resize";
    }

    const onMouseMove = (moveEvent: MouseEvent) => {
      // Horizontal resize
      if (
        direction === "width" ||
        direction === "both" ||
        direction === "e" ||
        direction === "se" ||
        direction === "ne"
      ) {
        const deltaX = moveEvent.clientX - startX;
        setPopupWidth(Math.min(700, Math.max(260, initialW + deltaX)));
      } else if (direction === "w" || direction === "sw" || direction === "nw") {
        const deltaX = startX - moveEvent.clientX;
        const newW = Math.min(700, Math.max(260, initialW + deltaX));
        const appliedDelta = newW - initialW;
        setPopupWidth(newW);
        setCoords((prev) => ({ ...prev, left: initialCoords.left - appliedDelta }));
      }

      // Vertical resize
      if (
        direction === "height" ||
        direction === "both" ||
        direction === "s" ||
        direction === "se" ||
        direction === "sw"
      ) {
        const deltaY = moveEvent.clientY - startY;
        setPopupHeight(Math.min(750, Math.max(260, initialH + deltaY)));
      } else if (direction === "n" || direction === "ne" || direction === "nw") {
        const deltaY = startY - moveEvent.clientY;
        const newH = Math.min(750, Math.max(260, initialH + deltaY));
        const appliedDelta = newH - initialH;
        setPopupHeight(newH);
        setCoords((prev) => ({ ...prev, top: initialCoords.top - appliedDelta }));
      }
    };

    const onMouseUp = () => {
      setIsResizing(null);
      document.body.style.cursor = prevCursor;
      document.body.style.userSelect = prevSelect;
      window.removeEventListener("mousemove", onMouseMove);
      window.removeEventListener("mouseup", onMouseUp);
    };

    window.addEventListener("mousemove", onMouseMove);
    window.addEventListener("mouseup", onMouseUp);
  };

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
    <div className="relative inline-flex items-center">
      {/* Universal Trigger Button */}
      <button
        ref={triggerRef}
        type="button"
        onClick={handleToggle}
        className={`${compact ? "h-8 w-8 justify-center" : "h-8 px-2 justify-between gap-1.5"} rounded-lg border border-border bg-card hover:bg-secondary flex items-center cursor-pointer transition-colors group shadow-2xs`}
        title={label}
      >
        <span
          className="h-4 w-4 rounded-full border border-black/20 dark:border-white/20 shadow-xs shrink-0 transition-transform group-hover:scale-110"
          style={{ backgroundColor: activeColor }}
        />
        {!compact && <Palette className="h-3.5 w-3.5 text-muted-foreground group-hover:text-foreground" />}
      </button>

      {/* Portaled Resizable Window that pops completely OUT of any modal container */}
      {isOpen &&
        coords.top > 0 &&
        typeof document !== "undefined" &&
        createPortal(
          <div
            ref={popoverRef}
            style={{
              position: "fixed",
              top: `${coords.top}px`,
              left: `${coords.left}px`,
              width: `${popupWidth}px`,
              height: `${popupHeight}px`,
              zIndex: 99999,
              animation: "none",
              transition: "none",
              transform: "none",
              transformOrigin: "top left",
            }}
            className="rounded-2xl border border-border bg-card/95 backdrop-blur-md shadow-2xl p-3 flex flex-col justify-between select-none text-foreground !animate-none !transition-none"
          >
            {/* Header & Tabs */}
            <div className="flex items-center justify-between border-b border-border/60 pb-2 mb-2 flex-shrink-0">
              <div className="flex items-center gap-2">
                <span
                  className="h-4 w-4 rounded-full border border-black/20 dark:border-white/20 shadow-xs shrink-0"
                  style={{ backgroundColor: activeColor }}
                  title={activeColor}
                />
                <span className="text-[10px] font-mono text-muted-foreground uppercase bg-secondary px-1.5 py-0.5 rounded border border-border/50">
                  {activeColor}
                </span>
              </div>
              <div className="flex items-center gap-0.5 bg-secondary/80 p-0.5 rounded-lg border border-border/50 text-[10px] font-medium overflow-x-auto">
                <button
                  type="button"
                  onClick={() => setActiveTab("swatches")}
                  className={`px-1.5 py-0.5 rounded cursor-pointer transition-colors whitespace-nowrap ${
                    activeTab === "swatches" ? "bg-card text-foreground font-semibold shadow-2xs" : "text-muted-foreground"
                  }`}
                >
                  Palettes
                </button>
                <button
                  type="button"
                  onClick={() => setActiveTab("generator")}
                  className={`px-1.5 py-0.5 rounded cursor-pointer transition-colors whitespace-nowrap flex items-center gap-1 ${
                    activeTab === "generator" ? "bg-card text-foreground font-semibold shadow-2xs" : "text-muted-foreground"
                  }`}
                >
                  <Dices className="h-2.5 w-2.5 text-primary" />
                  <span>Columns</span>
                </button>
                <button
                  type="button"
                  onClick={() => setActiveTab("custom")}
                  className={`px-1.5 py-0.5 rounded cursor-pointer transition-colors whitespace-nowrap ${
                    activeTab === "custom" ? "bg-card text-foreground font-semibold shadow-2xs" : "text-muted-foreground"
                  }`}
                >
                  Sliders
                </button>
                <button
                  type="button"
                  onClick={() => setActiveTab("gradient")}
                  className={`px-1.5 py-0.5 rounded cursor-pointer transition-colors whitespace-nowrap ${
                    activeTab === "gradient" ? "bg-card text-foreground font-semibold shadow-2xs" : "text-muted-foreground"
                  }`}
                >
                  Gradients
                </button>
              </div>

              <div className="flex items-center gap-1 flex-shrink-0 ml-1">
                {/* Random Harmonious Roll Button */}
                <button
                  type="button"
                  onClick={handleRollRandomColor}
                  title="Roll random harmonious color (Dices)"
                  className="h-6 w-6 rounded hover:bg-secondary flex items-center justify-center text-primary hover:text-foreground cursor-pointer transition-colors"
                >
                  <Dices className="h-3.5 w-3.5" />
                </button>

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
              <div className="space-y-2.5 overflow-y-auto flex-1 pr-1">
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

            {/* TAB 2: Random Harmonic Generator Columns */}
            {activeTab === "generator" && (
              <div className="space-y-2 overflow-y-auto flex-1 pr-1">
                <div className="flex items-center justify-between">
                  <span className="text-[10px] font-semibold text-muted-foreground uppercase tracking-wider">
                    Harmonic Columns
                  </span>
                  <button
                    type="button"
                    onClick={handleRollRandomColor}
                    className="text-[10px] px-2 py-0.5 rounded-md bg-primary/10 hover:bg-primary/20 text-primary border border-primary/20 flex items-center gap-1 cursor-pointer transition-colors"
                  >
                    <Dices className="h-3 w-3" />
                    <span>Shuffle Color</span>
                  </button>
                </div>

                <div className="grid grid-cols-2 gap-2">
                  {HARMONIC_COLUMNS.map((col) => (
                    <div
                      key={col.name}
                      className="p-2 rounded-xl border border-border bg-secondary/30 flex flex-col gap-1.5 group/col hover:border-primary/40 transition-colors"
                    >
                      <div className="flex items-center justify-between">
                        <span className="text-[11px] font-semibold text-foreground truncate">
                          {col.name}
                        </span>
                        <button
                          type="button"
                          onClick={(e) => handleRollColumn(col, e)}
                          title={`Roll random color from ${col.name}`}
                          className="p-1 rounded hover:bg-secondary text-muted-foreground hover:text-primary cursor-pointer transition-colors"
                        >
                          <Dices className="h-2.5 w-2.5" />
                        </button>
                      </div>

                      {/* Swatch Column */}
                      <div className="grid grid-cols-6 gap-1">
                        {col.colors.map((hex, i) => {
                          const isMatch = activeColor.toLowerCase() === hex.toLowerCase();
                          return (
                            <button
                              key={`${hex}_${i}`}
                              type="button"
                              onClick={() => recordColorChoice(hex)}
                              className="h-4 rounded-sm border border-black/15 dark:border-white/15 cursor-pointer transition-transform hover:scale-125 relative flex items-center justify-center"
                              style={{ backgroundColor: hex }}
                              title={hex}
                            >
                              {isMatch && <Check className="h-2 w-2 text-white drop-shadow" />}
                            </button>
                          );
                        })}
                      </div>
                    </div>
                  ))}
                </div>
              </div>
            )}

            {/* TAB 3: Custom HSL Sliders & Native Hex Input */}
            {activeTab === "custom" && (
              <div className="space-y-3 py-1 overflow-y-auto flex-1 pr-1">
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

            {/* TAB 4: Curated Visual Gradients */}
            {activeTab === "gradient" && (
              <div className="space-y-2 overflow-y-auto flex-1 pr-1">
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
            <div className="mt-2 pt-2 border-t border-border/60 flex items-center justify-between gap-1.5 text-xs flex-shrink-0">
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
              <div className="mt-1.5 pt-1.5 border-t border-border/40 flex items-center gap-1 flex-shrink-0">
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

            {/* Right Edge (East) */}
            <div
              onMouseDown={(e) => startPopupResize("e", e)}
              className="absolute top-2 -right-1.5 bottom-2 w-3 cursor-ew-resize z-30 flex items-center justify-center opacity-0 hover:opacity-100 transition-opacity"
              title="Drag right edge to resize width"
            >
              <div className="w-1 h-8 rounded-full bg-primary" />
            </div>

            {/* Left Edge (West) */}
            <div
              onMouseDown={(e) => startPopupResize("w", e)}
              className="absolute top-2 -left-1.5 bottom-2 w-3 cursor-ew-resize z-30 flex items-center justify-center opacity-0 hover:opacity-100 transition-opacity"
              title="Drag left edge to resize width"
            >
              <div className="w-1 h-8 rounded-full bg-primary" />
            </div>

            {/* Bottom Edge (South) */}
            <div
              onMouseDown={(e) => startPopupResize("s", e)}
              className="absolute -bottom-1.5 left-2 right-2 h-3 cursor-ns-resize z-30 flex items-center justify-center opacity-0 hover:opacity-100 transition-opacity"
              title="Drag bottom edge to resize height"
            >
              <div className="h-1 w-12 rounded-full bg-primary" />
            </div>

            {/* Top Edge (North) */}
            <div
              onMouseDown={(e) => startPopupResize("n", e)}
              className="absolute -top-1.5 left-2 right-2 h-3 cursor-ns-resize z-30 flex items-center justify-center opacity-0 hover:opacity-100 transition-opacity"
              title="Drag top edge to resize height"
            >
              <div className="h-1 w-12 rounded-full bg-primary" />
            </div>

            {/* Bottom-Right Corner (South-East) */}
            <div
              onMouseDown={(e) => startPopupResize("se", e)}
              className="absolute -bottom-1 -right-1 w-5 h-5 cursor-nwse-resize z-30 flex items-end justify-end p-0.5 opacity-60 hover:opacity-100 transition-opacity"
              title="Drag corner to freely resize color picker"
            >
              <svg className="w-3 h-3 text-muted-foreground hover:text-primary transition-colors" viewBox="0 0 16 16" fill="currentColor">
                <circle cx="14" cy="14" r="1.5" />
                <circle cx="9" cy="14" r="1.5" />
                <circle cx="14" cy="9" r="1.5" />
              </svg>
            </div>

            {/* Bottom-Left Corner (South-West) */}
            <div
              onMouseDown={(e) => startPopupResize("sw", e)}
              className="absolute -bottom-1 -left-1 w-5 h-5 cursor-nesw-resize z-30 flex items-end justify-start p-0.5 opacity-60 hover:opacity-100 transition-opacity"
              title="Drag corner to freely resize color picker"
            >
              <svg className="w-3 h-3 text-muted-foreground hover:text-primary transition-colors" viewBox="0 0 16 16" fill="currentColor">
                <circle cx="2" cy="14" r="1.5" />
                <circle cx="7" cy="14" r="1.5" />
                <circle cx="2" cy="9" r="1.5" />
              </svg>
            </div>

            {/* Top-Right Corner (North-East) */}
            <div
              onMouseDown={(e) => startPopupResize("ne", e)}
              className="absolute -top-1 -right-1 w-5 h-5 cursor-nesw-resize z-30 flex items-start justify-end p-0.5 opacity-60 hover:opacity-100 transition-opacity"
              title="Drag corner to freely resize color picker"
            >
              <svg className="w-3 h-3 text-muted-foreground hover:text-primary transition-colors" viewBox="0 0 16 16" fill="currentColor">
                <circle cx="14" cy="2" r="1.5" />
                <circle cx="9" cy="2" r="1.5" />
                <circle cx="14" cy="7" r="1.5" />
              </svg>
            </div>

            {/* Top-Left Corner (North-West) */}
            <div
              onMouseDown={(e) => startPopupResize("nw", e)}
              className="absolute -top-1 -left-1 w-5 h-5 cursor-nwse-resize z-30 flex items-start justify-start p-0.5 opacity-60 hover:opacity-100 transition-opacity"
              title="Drag corner to freely resize color picker"
            >
              <svg className="w-3 h-3 text-muted-foreground hover:text-primary transition-colors" viewBox="0 0 16 16" fill="currentColor">
                <circle cx="2" cy="2" r="1.5" />
                <circle cx="7" cy="2" r="1.5" />
                <circle cx="2" cy="7" r="1.5" />
              </svg>
            </div>
          </div>,
          document.body
        )}
    </div>
  );
}
