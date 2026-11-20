"use client";

import * as React from "react";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogDescription } from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { UniversalIconPicker } from "@/components/ui/universal-icon-picker";
import { UniversalColorPicker } from "@/components/ui/universal-color-picker";
import { FolderIconRenderer } from "@/components/icons/folder-icon-renderer";
import { Columns2, Rows2, RotateCcw } from "lucide-react";
import type { Folder } from "@/server/db/schema";
import { useResizableModal, ModalResizeHandles } from "@/lib/use-resizable-modal";
import { ModalFormatControls } from "@/components/ui/modal-format-controls";

interface AddFolderModalProps {
  parentId?: string | null;
  parentFolder?: Folder | null;
  open: boolean;
  onOpenChange: (open: boolean) => void;
  onConfirm: (name: string, icon: string, color: string, parentId?: string | null) => Promise<void>;
}

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
    defaultVerticalWidth: 480,
    defaultHorizontalWidth: 720,
    defaultVerticalHeight: 380,
    defaultHorizontalHeight: 360,
  });

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

        <DialogHeader className="pb-3 border-b border-border/60">
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-3">
              <div
                className="h-9 w-9 rounded-lg flex items-center justify-center flex-shrink-0 border border-border shadow-surface transition-colors"
                style={{ backgroundColor: `${color}20`, borderColor: `${color}40` }}
              >
                <FolderIconRenderer icon={icon} className="h-4.5 w-4.5" color={color} />
              </div>
              <div>
                <DialogTitle className="text-base font-semibold text-foreground">
                  {parentFolder ? `New subfolder in "${parentFolder.name}"` : "Create New Folder"}
                </DialogTitle>
                <DialogDescription className="text-xs text-muted-foreground">
                  Choose a folder name, pick an icon, and select an accent color
                </DialogDescription>
              </div>
            </div>

            <ModalFormatControls
              format={modalFormat}
              onToggleFormat={toggleModalFormat}
              hasCustomSize={hasCustomSize}
              onRestoreDefaults={handleRestoreDefaults}
              className="ml-3"
            />
          </div>
        </DialogHeader>

        <form onSubmit={handleSubmit} className="flex flex-col flex-1 min-h-0 overflow-hidden text-xs">
          <div className="overflow-y-auto flex-1 pr-1 py-4 space-y-4">
            {/* Unified Folder Branding Card */}
            <div className="p-3.5 rounded-xl border border-border bg-secondary/30 space-y-2.5">
              <div className="flex items-center justify-between">
                <span className="mk-eyebrow font-mono">
                  Folder Name & Identity
                </span>
                <span className="text-3xs text-muted-foreground">
                  Universal Icon & Accent
                </span>
              </div>

              <div className="flex items-center gap-2">
                <div className="flex items-center gap-1.5 p-1 rounded-xl bg-card border border-border shrink-0 shadow-surface">
                  <UniversalIconPicker
                    icon={icon}
                    color={color}
                    onChange={setIcon}
                    label="Select Folder Icon"
                    compact={true}
                    contextKey="add_folder_icon"
                  />
                  <UniversalColorPicker
                    color={color}
                    onChange={setColor}
                    label="Select Accent Color"
                    compact={true}
                    contextKey="add_folder_color"
                  />
                </div>

                <div className="flex-1 min-w-0">
                  <Input
                    type="text"
                    value={name}
                    onChange={(e) => setName(e.target.value)}
                    className="h-10 text-xs bg-background border border-border font-medium"
                    autoFocus
                    required
                    placeholder="e.g. Machine Learning, React Tools, Articles..."
                  />
                </div>
              </div>
            </div>
          </div>

          <div className="flex items-center justify-end gap-2 pt-3 border-t border-border/60 mt-auto">
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
