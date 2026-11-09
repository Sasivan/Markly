"use client";

import * as React from "react";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogDescription } from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { IconSearchPicker } from "@/components/icons/icon-search-picker";
import { FolderIconRenderer } from "@/components/icons/folder-icon-renderer";
import type { Folder } from "@/server/db/schema";

interface FolderCustomizeModalProps {
  folder: Folder | null;
  open: boolean;
  onOpenChange: (open: boolean) => void;
  onSave: (folderId: string, updates: { name: string; icon: string; color: string }) => void;
}

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
  const [selectedIcon, setSelectedIcon] = React.useState("📁");
  const [selectedColor, setSelectedColor] = React.useState("#3b82f6");
  const [saving, setSaving] = React.useState(false);

  React.useEffect(() => {
    if (folder) {
      setName(folder.name);
      setSelectedIcon(folder.icon || "📁");
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
      <DialogContent className="max-w-md p-6">
        <DialogHeader>
          <div className="flex items-center gap-3">
            <div
              className="h-10 w-10 rounded-xl flex items-center justify-center text-xl flex-shrink-0 shadow-sm border border-black/5"
              style={{ backgroundColor: `${selectedColor}25` }}
            >
              <FolderIconRenderer icon={selectedIcon} className="h-5 w-5" color={selectedColor} />
            </div>
            <div>
              <DialogTitle className="text-base font-bold text-slate-900 dark:text-white">
                Customize Folder
              </DialogTitle>
              <DialogDescription className="text-xs text-slate-500 dark:text-neutral-400">
                Search icons and customize folder branding.
              </DialogDescription>
            </div>
          </div>
        </DialogHeader>

        <form onSubmit={handleSubmit} className="space-y-4 mt-4 text-xs">
          <div className="space-y-1.5">
            <label className="font-semibold text-slate-800 dark:text-neutral-200">
              Folder Name
            </label>
            <Input
              type="text"
              value={name}
              onChange={(e) => setName(e.target.value)}
              className="h-8 text-xs bg-slate-50 dark:bg-neutral-800"
              autoFocus
            />
          </div>

          <div className="space-y-1.5">
            <label className="font-semibold text-slate-800 dark:text-neutral-200">
              Search & Select Icon
            </label>
            <IconSearchPicker
              selectedIcon={selectedIcon}
              onSelectIcon={setSelectedIcon}
            />
          </div>

          <div className="space-y-1.5">
            <div className="flex items-center justify-between">
              <label className="font-semibold text-slate-800 dark:text-neutral-200">
                Color Palette & Badge
              </label>
              <div className="flex items-center gap-2">
                <label className="flex items-center gap-1 text-[11px] text-slate-500 hover:text-slate-800 dark:hover:text-white cursor-pointer">
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
                  className="h-6 w-16 text-[10px] font-mono px-1.5 rounded border border-slate-300 dark:border-neutral-700 bg-white dark:bg-neutral-800 text-foreground"
                  placeholder="#3b82f6"
                />
              </div>
            </div>

            <div className="grid grid-cols-8 gap-2 p-2.5 rounded-xl border border-slate-200 dark:border-neutral-700 bg-slate-50/50 dark:bg-neutral-900/50">
              {COLOR_PALETTE.map((c) => (
                <button
                  type="button"
                  key={c.value}
                  onClick={() => setSelectedColor(c.value)}
                  className={`h-6 w-6 rounded-full cursor-pointer transition-transform ${
                    selectedColor.toLowerCase() === c.value.toLowerCase()
                      ? "scale-110 ring-2 ring-blue-600 ring-offset-2"
                      : "hover:scale-105"
                  }`}
                  style={{ backgroundColor: c.value }}
                  title={c.name}
                />
              ))}
            </div>
          </div>

          <div className="flex items-center justify-end gap-2 pt-3 border-t border-slate-100 dark:border-neutral-800">
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
              {saving ? "Saving..." : "Save Changes"}
            </Button>
          </div>
        </form>
      </DialogContent>
    </Dialog>
  );
}
