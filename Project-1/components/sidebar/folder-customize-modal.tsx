"use client";

import * as React from "react";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogDescription } from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { IconSearchPicker } from "@/components/icons/icon-search-picker";
import { FolderIconRenderer } from "@/components/icons/folder-icon-renderer";
import { Sparkles, Dices, RefreshCw } from "lucide-react";
import type { Folder } from "@/server/db/schema";

interface FolderCustomizeModalProps {
  folder: Folder | null;
  open: boolean;
  onOpenChange: (open: boolean) => void;
  onSave: (folderId: string, updates: { name: string; icon: string; color: string }) => void;
}

const HARMONIC_PRESETS = [
  { name: "Vibrant", colors: ["#2563eb", "#7c3aed", "#db2777", "#ea580c", "#16a34a", "#0891b2"] },
  { name: "Pastel", colors: ["#93c5fd", "#c4b5fd", "#f9a8d4", "#fdba74", "#86efac", "#67e8f9"] },
  { name: "Nordic", colors: ["#334155", "#475569", "#0f766e", "#0369a1", "#4338ca", "#581c87"] },
  { name: "Sunset", colors: ["#f43f5e", "#fb7185", "#f97316", "#fb923c", "#f59e0b", "#eab308"] },
  { name: "Forest", colors: ["#065f46", "#047857", "#059669", "#10b981", "#34d399", "#84cc16"] },
  { name: "Neon", colors: ["#00f0ff", "#ff007f", "#7928ca", "#00dfd8", "#ff4b4b", "#ffe600"] },
];

const COLOR_PALETTE = [
  { name: "Blue", value: "#3b82f6" },
  { name: "Indigo", value: "#6366f1" },
  { name: "Violet", value: "#8b5cf6" },
  { name: "Purple", value: "#a855f7" },
  { name: "Pink", value: "#ec4899" },
  { name: "Rose", value: "#f43f5e" },
  { name: "Red", value: "#ef4444" },
  { name: "Orange", value: "#f97316" },
  { name: "Amber", value: "#f59e0b" },
  { name: "Yellow", value: "#eab308" },
  { name: "Lime", value: "#84cc16" },
  { name: "Emerald", value: "#10b981" },
  { name: "Teal", value: "#14b8a6" },
  { name: "Cyan", value: "#06b6d4" },
  { name: "Slate", value: "#64748b" },
  { name: "Zinc", value: "#71717a" },
];

export function FolderCustomizeModal({
  folder,
  open,
  onOpenChange,
  onSave,
}: FolderCustomizeModalProps) {
  const [name, setName] = React.useState("");
  const [selectedIcon, setSelectedIcon] = React.useState("Folder");
  const [selectedColor, setSelectedColor] = React.useState("#3b82f6");
  const [saving, setSaving] = React.useState(false);

  const handleRandomHarmonicColor = () => {
    // Generate aesthetic harmonious color
    const hue = Math.floor(Math.random() * 360);
    const sat = 75;
    const light = 55;
    const a = (sat * Math.min(light, 100 - light)) / 100;
    const f = (n: number) => {
      const k = (n + hue / 30) % 12;
      const color = light / 100 - (a / 100) * Math.max(Math.min(k - 3, 9 - k, 1), -1);
      return Math.round(255 * color).toString(16).padStart(2, "0");
    };
    const hex = `#${f(0)}${f(8)}${f(4)}`;
    setSelectedColor(hex);
  };

  React.useEffect(() => {
    if (folder) {
      setName(folder.name);
      setSelectedIcon(folder.icon || "Folder");
      setSelectedColor(folder.color || "#3b82f6");
    }
  }, [folder]);

  if (!folder) return null;

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!name.trim()) return;

    setSaving(true);
    try {
      await onSave(folder.id, {
        name: name.trim(),
        icon: selectedIcon,
        color: selectedColor,
      });
      onOpenChange(false);
    } finally {
      setSaving(false);
    }
  };

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-w-md p-5 max-h-[85vh] overflow-y-auto">
        <DialogHeader>
          <div className="flex items-center gap-3">
            <div
              className="h-10 w-10 rounded-lg flex items-center justify-center text-xl flex-shrink-0 border border-border"
              style={{ backgroundColor: `${selectedColor}20` }}
            >
              <FolderIconRenderer icon={selectedIcon} className="h-5 w-5" color={selectedColor} />
            </div>
            <div>
              <DialogTitle className="text-base font-medium text-foreground">
                Customize folder
              </DialogTitle>
              <DialogDescription className="text-xs text-muted-foreground">
                Search icons and customize folder appearance
              </DialogDescription>
            </div>
          </div>
        </DialogHeader>

        <form onSubmit={handleSubmit} className="space-y-4 mt-4 text-xs">
          <div className="space-y-1.5">
            <label className="font-medium text-foreground">
              Folder name
            </label>
            <Input
              type="text"
              value={name}
              onChange={(e) => setName(e.target.value)}
              className="h-8 text-xs bg-background border border-border"
              autoFocus
            />
          </div>

          <div className="space-y-1.5">
            <label className="font-medium text-foreground">
              Search & select icon
            </label>
            <IconSearchPicker
              selectedIcon={selectedIcon}
              onSelectIcon={setSelectedIcon}
            />
          </div>

          <div className="space-y-2">
            <div className="flex items-center justify-between">
              <label className="font-medium text-foreground">
                Color palette & badge
              </label>
              <div className="flex items-center gap-2">
                <button
                  type="button"
                  onClick={handleRandomHarmonicColor}
                  className="h-6 px-2 rounded-md bg-secondary border border-border text-[11px] font-medium text-foreground hover:bg-muted flex items-center gap-1 cursor-pointer transition-colors shadow-2xs"
                  title="Generate random harmonious color"
                >
                  <Sparkles className="h-3 w-3 text-primary" />
                  <span>Generate</span>
                </button>
                <label className="flex items-center gap-1 text-xs text-muted-foreground hover:text-foreground cursor-pointer">
                  <span>Custom:</span>
                  <input
                    type="color"
                    value={selectedColor.startsWith("#") && selectedColor.length === 7 ? selectedColor : "#3b82f6"}
                    onChange={(e) => setSelectedColor(e.target.value)}
                    className="h-5 w-5 rounded border-0 cursor-pointer p-0 bg-transparent"
                    title="Pick custom color"
                  />
                </label>
                <input
                  type="text"
                  value={selectedColor}
                  onChange={(e) => setSelectedColor(e.target.value)}
                  className="h-6 w-16 text-xs font-mono px-1.5 rounded border border-border bg-background text-foreground"
                  placeholder="#3b82f6"
                />
              </div>
            </div>

            {/* Standard Swatches */}
            <div className="grid grid-cols-8 gap-2 p-2.5 rounded-lg border border-border bg-muted/30">
              {COLOR_PALETTE.map((c) => (
                <button
                  type="button"
                  key={c.value}
                  onClick={() => setSelectedColor(c.value)}
                  className={`h-6 w-6 rounded-full cursor-pointer transition-colors ${
                    selectedColor.toLowerCase() === c.value.toLowerCase()
                      ? "ring-2 ring-primary ring-offset-2 ring-offset-background"
                      : "opacity-85 hover:opacity-100"
                  }`}
                  style={{ backgroundColor: c.value }}
                  title={c.name}
                />
              ))}
            </div>

            {/* Harmonic Palettes Generator */}
            <div className="space-y-1.5 pt-1">
              <span className="text-[11px] font-medium text-muted-foreground flex items-center gap-1">
                <Dices className="h-3 w-3 text-primary" />
                <span>Harmonic Palettes Generator</span>
              </span>
              <div className="grid grid-cols-3 gap-1.5">
                {HARMONIC_PRESETS.map((preset) => (
                  <button
                    key={preset.name}
                    type="button"
                    onClick={() => {
                      const randomColor = preset.colors[Math.floor(Math.random() * preset.colors.length)];
                      setSelectedColor(randomColor);
                    }}
                    className="p-1.5 rounded-lg border border-border bg-secondary/40 hover:bg-secondary flex flex-col gap-1 text-left cursor-pointer transition-colors"
                  >
                    <span className="text-[10px] font-medium text-foreground">{preset.name}</span>
                    <div className="flex gap-0.5">
                      {preset.colors.slice(0, 5).map((col, i) => (
                        <span key={i} className="h-2 flex-1 rounded-xs" style={{ backgroundColor: col }} />
                      ))}
                    </div>
                  </button>
                ))}
              </div>
            </div>
          </div>

          <div className="flex items-center justify-end gap-2 pt-3 border-t border-border/60">
            <Button
              type="button"
              variant="outline"
              size="sm"
              onClick={() => onOpenChange(false)}
              className="text-xs h-8"
            >
              Cancel
            </Button>
            <Button
              type="submit"
              variant="default"
              size="sm"
              disabled={saving || !name.trim()}
              className="text-xs h-8"
            >
              {saving ? "Saving..." : "Save changes"}
            </Button>
          </div>
        </form>
      </DialogContent>
    </Dialog>
  );
}
