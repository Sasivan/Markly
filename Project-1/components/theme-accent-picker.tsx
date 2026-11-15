"use client";

import * as React from "react";
import { Check, Palette } from "lucide-react";

export type ThemeAccent = "blue" | "slate" | "emerald" | "indigo" | "amber";

interface AccentOption {
  id: ThemeAccent;
  name: string;
  colorHex: string;
}

export const ACCENT_OPTIONS: AccentOption[] = [
  { id: "blue", name: "Markly Blue", colorHex: "#2563eb" },
  { id: "emerald", name: "Emerald", colorHex: "#059669" },
  { id: "indigo", name: "Indigo", colorHex: "#4f46e5" },
  { id: "amber", name: "Amber", colorHex: "#d97706" },
  { id: "slate", name: "Slate", colorHex: "#475569" },
];

export function ThemeAccentPicker() {
  const [currentAccent, setCurrentAccent] = React.useState<ThemeAccent>("blue");
  const [isOpen, setIsOpen] = React.useState(false);
  const containerRef = React.useRef<HTMLDivElement>(null);

  React.useEffect(() => {
    try {
      const saved = localStorage.getItem("markly_accent") as ThemeAccent | null;
      if (saved && ACCENT_OPTIONS.some((a) => a.id === saved)) {
        setCurrentAccent(saved);
        document.documentElement.setAttribute("data-accent", saved);
      } else {
        document.documentElement.setAttribute("data-accent", "blue");
      }
    } catch {
      // localStorage may fail in restricted iframes
    }
  }, []);

  React.useEffect(() => {
    function handleClickOutside(e: MouseEvent) {
      if (containerRef.current && !containerRef.current.contains(e.target as Node)) {
        setIsOpen(false);
      }
    }
    if (isOpen) {
      document.addEventListener("mousedown", handleClickOutside);
      return () => document.removeEventListener("mousedown", handleClickOutside);
    }
  }, [isOpen]);

  const selectAccent = (accent: ThemeAccent) => {
    setCurrentAccent(accent);
    setIsOpen(false);
    try {
      localStorage.setItem("markly_accent", accent);
      document.documentElement.setAttribute("data-accent", accent);
      window.dispatchEvent(new CustomEvent("markly-accent-changed", { detail: { accent } }));
    } catch {
      // ignore
    }
  };

  const activeColor = ACCENT_OPTIONS.find((a) => a.id === currentAccent) || ACCENT_OPTIONS[0];

  return (
    <div ref={containerRef} className="relative inline-block">
      <button
        type="button"
        onClick={() => setIsOpen((prev) => !prev)}
        className="h-8 w-8 rounded-lg border border-border bg-card flex items-center justify-center text-muted-foreground hover:text-foreground hover:bg-secondary transition-colors cursor-pointer"
        title={`Change accent color (Current: ${activeColor.name})`}
        aria-label="Change accent color"
      >
        <span
          className="h-3.5 w-3.5 rounded-full border border-background shadow-xs transition-colors"
          style={{ backgroundColor: activeColor.colorHex }}
        />
      </button>

      {isOpen && (
        <div className="absolute right-0 top-full mt-1.5 w-44 rounded-lg border border-border bg-popover p-1.5 shadow-md z-50 animate-in fade-in-50 duration-150">
          <div className="px-2 py-1 text-xs font-medium text-muted-foreground">
            Theme Accent
          </div>
          <div className="space-y-0.5">
            {ACCENT_OPTIONS.map((opt) => {
              const isSelected = opt.id === currentAccent;
              return (
                <button
                  key={opt.id}
                  type="button"
                  onClick={() => selectAccent(opt.id)}
                  className={`w-full flex items-center justify-between px-2 py-1.5 text-xs rounded-md cursor-pointer transition-colors ${
                    isSelected
                      ? "bg-secondary text-foreground font-medium"
                      : "text-muted-foreground hover:bg-secondary hover:text-foreground"
                  }`}
                >
                  <div className="flex items-center gap-2">
                    <span
                      className="h-3 w-3 rounded-full flex-shrink-0 border border-border"
                      style={{ backgroundColor: opt.colorHex }}
                    />
                    <span>{opt.name}</span>
                  </div>
                  {isSelected && <Check className="h-3.5 w-3.5 text-primary flex-shrink-0" />}
                </button>
              );
            })}
          </div>
        </div>
      )}
    </div>
  );
}
