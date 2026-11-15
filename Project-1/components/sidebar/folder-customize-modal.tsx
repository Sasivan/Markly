"use client";

import * as React from "react";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogDescription } from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { IconSearchPicker } from "@/components/icons/icon-search-picker";
import { FolderIconRenderer } from "@/components/icons/folder-icon-renderer";
import { Sparkles, Dices, RefreshCw, Columns2, Rows2, RotateCcw } from "lucide-react";
import type { Folder } from "@/server/db/schema";
import { useResizableModal, ModalResizeHandles } from "@/lib/use-resizable-modal";

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

  // Adaptive Resizable Modal state with custom width & height persisted
  const {
    format: modalFormat,
    toggleFormat: toggleModalFormat,
    modalStyle,
    hasCustomSize,
    handleRestoreDefaults,
    startResize,
  } = useResizableModal({
    modalId: "folder_customize",
    defaultVerticalWidth: 560,
    defaultHorizontalWidth: 960,
    defaultVerticalHeight: 680,
    defaultHorizontalHeight: 650,
  });

  const handleResetColor = () => {
    setSelectedColor(folder?.color || "#3b82f6");
  };

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
      <DialogContent
        style={modalStyle}
        className="relative flex flex-col bg-card border-border p-5 text-foreground overflow-hidden max-w-[95vw] max-h-[92vh]"
      >
        <ModalResizeHandles onStartResize={startResize} />

        <DialogHeader className="pb-2 border-b border-border/60">
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-3">
              <div
                className="h-10 w-10 rounded-lg flex items-center justify-center text-xl flex-shrink-0 border border-border"
                style={{ backgroundColor: `${selectedColor}20` }}
              >
                <FolderIconRenderer icon={selectedIcon} className="h-5 w-5" color={selectedColor} />
              </div>
              <div>
                <DialogTitle className="text-base font-semibold text-foreground">
                  Customize folder
                </DialogTitle>
                <DialogDescription className="text-xs text-muted-foreground">
                  Search icons and customize folder appearance
                </DialogDescription>
              </div>
            </div>

            <div className="flex items-center gap-1.5 shrink-0 ml-3">
              {/* Restore size button */}
              {hasCustomSize && (
                <button
                  type="button"
                  onClick={handleRestoreDefaults}
                  title="Restore default modal size"
                  className="p-1.5 rounded-md hover:bg-secondary text-muted-foreground hover:text-foreground cursor-pointer transition-colors border border-border/60"
                >
                  <RotateCcw className="h-3.5 w-3.5" />
                </button>
              )}

              {/* Layout format toggle button */}
              <div className="flex items-center bg-secondary/80 p-0.5 rounded-lg border border-border text-[11px] font-medium">
                <button
                  type="button"
                  onClick={() => toggleModalFormat("vertical")}
                  title="Vertical stacked layout"
                  className={`p-1.5 rounded-md transition-colors cursor-pointer ${
                    modalFormat === "vertical"
                      ? "bg-card text-foreground shadow-2xs font-semibold"
                      : "text-muted-foreground hover:text-foreground"
                  }`}
                >
                  <Rows2 className="h-3.5 w-3.5" />
                </button>
                <button
                  type="button"
                  onClick={() => toggleModalFormat("horizontal")}
                  title="Horizontal side-by-side layout"
                  className={`p-1.5 rounded-md transition-colors cursor-pointer ${
                    modalFormat === "horizontal"
                      ? "bg-card text-foreground shadow-2xs font-semibold"
                      : "text-muted-foreground hover:text-foreground"
                  }`}
                >
                  <Columns2 className="h-3.5 w-3.5" />
                </button>
              </div>
            </div>
          </div>
        </DialogHeader>

        <form onSubmit={handleSubmit} className="flex flex-col flex-1 min-h-0 overflow-hidden text-xs">
          <div className="overflow-y-auto flex-1 pr-1.5 py-3">
            {modalFormat === "horizontal" ? (
              <div className="grid grid-cols-1 md:grid-cols-2 gap-5">
                {/* Left Column: Folder Name, Harmonic Generator, Live Preview */}
                <div className="space-y-4">
                  {/* Live preview */}
                  <div className="p-3 rounded-xl border border-border bg-secondary/30 flex items-center gap-3">
                    <div
                      className="h-10 w-10 rounded-lg flex items-center justify-center text-xl shrink-0 border border-border shadow-2xs"
                      style={{ backgroundColor: `${selectedColor}20` }}
                    >
                      <FolderIconRenderer icon={selectedIcon} className="h-5 w-5" color={selectedColor} />
                    </div>
                    <div className="min-w-0">
                      <div className="text-xs font-semibold text-foreground truncate">
                        {name || folder.name || "Folder Preview"}
                      </div>
                      <div className="text-[11px] font-mono text-muted-foreground truncate">
                        {selectedIcon} • {selectedColor}
                      </div>
                    </div>
                  </div>

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

                  {/* Harmonic Palettes Generator */}
                  <div className="space-y-2 pt-1">
                    <span className="text-[11px] font-medium text-muted-foreground flex items-center gap-1">
                      <Dices className="h-3 w-3 text-primary" />
                      <span>Harmonic Palettes Generator</span>
                    </span>
                    <div className="grid grid-cols-2 gap-1.5">
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

                {/* Right Column: Icon Picker & Color Swatches */}
                <div className="space-y-4">
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
                        <button
                          type="button"
                          onClick={handleResetColor}
                          className="h-6 px-2 rounded-md bg-secondary border border-border text-[11px] font-medium text-foreground hover:bg-muted flex items-center gap-1 cursor-pointer transition-colors shadow-2xs"
                          title="Reset color to original"
                        >
                          <RotateCcw className="h-3 w-3 text-muted-foreground" />
                          <span>Reset</span>
                        </button>
                        <button
                          type="button"
                          onClick={handleResetColor}
                          className="h-6 px-2 rounded-md bg-secondary border border-border text-[11px] font-medium text-foreground hover:bg-muted flex items-center gap-1 cursor-pointer transition-colors shadow-2xs"
                          title="Reset color to original"
                        >
                          <RotateCcw className="h-3 w-3 text-muted-foreground" />
                          <span>Reset</span>
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
                  </div>
                </div>
              </div>
            ) : (
              /* Vertical Stacked Layout */
              <div className="space-y-4">
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
                      <button
                        type="button"
                        onClick={handleResetColor}
                        className="h-6 px-2 rounded-md bg-secondary border border-border text-[11px] font-medium text-foreground hover:bg-muted flex items-center gap-1 cursor-pointer transition-colors shadow-2xs"
                        title="Reset color to original"
                      >
                        <RotateCcw className="h-3 w-3 text-muted-foreground" />
                        <span>Reset</span>
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
              </div>
            )}
          </div>

          <div className="flex items-center justify-end gap-2 pt-3 border-t border-border/60 mt-2">
            <Button
              type="button"
              variant="outline"
              size="sm"
              onClick={() => onOpenChange(false)}
              className="text-xs h-8 cursor-pointer"
            >
              Cancel
            </Button>
            <Button
              type="submit"
              variant="default"
              size="sm"
              disabled={saving || !name.trim()}
              className="text-xs h-8 cursor-pointer"
            >
              {saving ? "Saving..." : "Save changes"}
            </Button>
          </div>
        </form>
      </DialogContent>
    </Dialog>
  );
}
