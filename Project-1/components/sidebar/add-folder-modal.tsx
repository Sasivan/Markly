"use client";

import * as React from "react";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogDescription } from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { IconSearchPicker } from "@/components/icons/icon-search-picker";
import { FolderIconRenderer } from "@/components/icons/folder-icon-renderer";
import { Sparkles, Columns2, Rows2, RotateCcw } from "lucide-react";
import type { Folder } from "@/server/db/schema";
import { useResizableModal, ModalResizeHandles } from "@/lib/use-resizable-modal";

interface AddFolderModalProps {
  parentId?: string | null;
  parentFolder?: Folder | null;
  open: boolean;
  onOpenChange: (open: boolean) => void;
  onConfirm: (name: string, icon: string, color: string, parentId?: string | null) => Promise<void>;
}

export const COLOR_PALETTE = [
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

export function AddFolderModal({
  parentId,
  parentFolder,
  open,
  onOpenChange,
  onConfirm,
}: AddFolderModalProps) {
  const [name, setName] = React.useState("");
  const [icon, setIcon] = React.useState("Folder");
  const [color, setColor] = React.useState("#3b82f6");
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
    modalId: "folder_add",
    defaultVerticalWidth: 560,
    defaultHorizontalWidth: 960,
    defaultVerticalHeight: 680,
    defaultHorizontalHeight: 650,
  });

  const handleResetColor = () => {
    setColor("#3b82f6");
  };

  const handleRandomHarmonicColor = () => {
    const hue = Math.floor(Math.random() * 360);
    const sat = 75;
    const light = 55;
    const a = (sat * Math.min(light, 100 - light)) / 100;
    const f = (n: number) => {
      const k = (n + hue / 30) % 12;
      const c = light / 100 - (a / 100) * Math.max(Math.min(k - 3, 9 - k, 1), -1);
      return Math.round(255 * c).toString(16).padStart(2, "0");
    };
    const hex = `#${f(0)}${f(8)}${f(4)}`;
    setColor(hex);
  };

  React.useEffect(() => {
    if (open) {
      setName("");
      setIcon("Folder");
      setColor("#3b82f6");
    }
  }, [open]);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!name.trim()) return;

    setSaving(true);
    try {
      await onConfirm(name.trim(), icon, color, parentId || null);
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
                style={{ backgroundColor: `${color}20` }}
              >
                <FolderIconRenderer icon={icon} className="h-5 w-5" color={color} />
              </div>
              <div>
                <DialogTitle className="text-base font-semibold text-foreground">
                  {parentFolder ? `New subfolder in "${parentFolder.name}"` : "Create new folder"}
                </DialogTitle>
                <DialogDescription className="text-xs text-muted-foreground">
                  Choose a name, search icons, and pick a color accent
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
                {/* Left Column: Name & Live Preview */}
                <div className="space-y-4">
                  {/* Live preview */}
                  <div className="p-3 rounded-xl border border-border bg-secondary/30 flex items-center gap-3">
                    <div
                      className="h-10 w-10 rounded-lg flex items-center justify-center text-xl shrink-0 border border-border shadow-2xs"
                      style={{ backgroundColor: `${color}20` }}
                    >
                      <FolderIconRenderer icon={icon} className="h-5 w-5" color={color} />
                    </div>
                    <div className="min-w-0">
                      <div className="text-xs font-semibold text-foreground truncate">
                        {name || "New Folder Preview"}
                      </div>
                      <div className="text-[11px] font-mono text-muted-foreground truncate">
                        {icon} • {color}
                      </div>
                    </div>
                  </div>

                  <div className="space-y-1.5">
                    <label className="font-medium text-foreground">
                      Folder name
                    </label>
                    <Input
                      type="text"
                      placeholder="e.g. Machine Learning, React Tools, Articles..."
                      value={name}
                      onChange={(e) => setName(e.target.value)}
                      className="h-8 text-xs bg-background border border-border"
                      autoFocus
                      required
                    />
                  </div>
                </div>

                {/* Right Column: Icon Picker & Color Swatches */}
                <div className="space-y-4">
                  <div className="space-y-1.5">
                    <label className="font-medium text-foreground">
                      Search & select icon
                    </label>
                    <IconSearchPicker selectedIcon={icon} onSelectIcon={setIcon} />
                  </div>

                  <div className="space-y-1.5">
                    <div className="flex items-center justify-between">
                      <label className="font-medium text-foreground">
                        Color palette & accent
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
                          title="Reset color to default"
                        >
                          <RotateCcw className="h-3 w-3 text-muted-foreground" />
                          <span>Reset</span>
                        </button>
                        <label className="flex items-center gap-1 text-xs text-muted-foreground hover:text-foreground cursor-pointer">
                          <span>Custom:</span>
                          <input
                            type="color"
                            value={color.startsWith("#") && color.length === 7 ? color : "#3b82f6"}
                            onChange={(e) => setColor(e.target.value)}
                            className="h-5 w-5 rounded border-0 cursor-pointer p-0 bg-transparent"
                            title="Pick custom color"
                          />
                        </label>
                        <input
                          type="text"
                          value={color}
                          onChange={(e) => setColor(e.target.value)}
                          className="h-6 w-16 text-xs font-mono px-1.5 rounded border border-border bg-background text-foreground"
                          placeholder="#3b82f6"
                        />
                      </div>
                    </div>

                    <div className="grid grid-cols-8 gap-2 p-2.5 rounded-lg border border-border bg-muted/30">
                      {COLOR_PALETTE.map((c) => (
                        <button
                          type="button"
                          key={c.value}
                          onClick={() => setColor(c.value)}
                          className={`h-6 w-6 rounded-full cursor-pointer transition-colors ${
                            color.toLowerCase() === c.value.toLowerCase()
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
                    placeholder="e.g. Machine Learning, React Tools, Articles..."
                    value={name}
                    onChange={(e) => setName(e.target.value)}
                    className="h-8 text-xs bg-background border border-border"
                    autoFocus
                    required
                  />
                </div>

                <div className="space-y-1.5">
                  <label className="font-medium text-foreground">
                    Search & select icon
                  </label>
                  <IconSearchPicker selectedIcon={icon} onSelectIcon={setIcon} />
                </div>

                <div className="space-y-1.5">
                  <div className="flex items-center justify-between">
                    <label className="font-medium text-foreground">
                      Color palette & accent
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
                        title="Reset color to default"
                      >
                        <RotateCcw className="h-3 w-3 text-muted-foreground" />
                        <span>Reset</span>
                      </button>
                      <label className="flex items-center gap-1 text-xs text-muted-foreground hover:text-foreground cursor-pointer">
                        <span>Custom:</span>
                        <input
                          type="color"
                          value={color.startsWith("#") && color.length === 7 ? color : "#3b82f6"}
                          onChange={(e) => setColor(e.target.value)}
                          className="h-5 w-5 rounded border-0 cursor-pointer p-0 bg-transparent"
                          title="Pick custom color"
                        />
                      </label>
                      <input
                        type="text"
                        value={color}
                        onChange={(e) => setColor(e.target.value)}
                        className="h-6 w-16 text-xs font-mono px-1.5 rounded border border-border bg-background text-foreground"
                        placeholder="#3b82f6"
                      />
                    </div>
                  </div>

                  <div className="grid grid-cols-8 gap-2 p-2.5 rounded-lg border border-border bg-muted/30">
                    {COLOR_PALETTE.map((c) => (
                      <button
                        type="button"
                        key={c.value}
                        onClick={() => setColor(c.value)}
                        className={`h-6 w-6 rounded-full cursor-pointer transition-colors ${
                          color.toLowerCase() === c.value.toLowerCase()
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
              {saving ? "Creating..." : "Create folder"}
            </Button>
          </div>
        </form>
      </DialogContent>
    </Dialog>
  );
}
