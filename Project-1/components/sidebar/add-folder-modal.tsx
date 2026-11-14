"use client";

import * as React from "react";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogDescription } from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { IconSearchPicker } from "@/components/icons/icon-search-picker";
import { FolderIconRenderer } from "@/components/icons/folder-icon-renderer";
import type { Folder } from "@/server/db/schema";

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
      <DialogContent className="max-w-md p-5 max-h-[85vh] overflow-y-auto">
        <DialogHeader>
          <div className="flex items-center gap-3">
            <div
              className="h-10 w-10 rounded-lg flex items-center justify-center text-xl flex-shrink-0 border border-border"
              style={{ backgroundColor: `${color}20` }}
            >
              <FolderIconRenderer icon={icon} className="h-5 w-5" color={color} />
            </div>
            <div>
              <DialogTitle className="text-base font-medium text-foreground">
                {parentFolder ? `New subfolder in "${parentFolder.name}"` : "Create new folder"}
              </DialogTitle>
              <DialogDescription className="text-xs text-muted-foreground">
                Choose a name, search icons, and pick a color accent
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
              {saving ? "Creating..." : "Create folder"}
            </Button>
          </div>
        </form>
      </DialogContent>
    </Dialog>
  );
}
