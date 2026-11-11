"use client";

import * as React from "react";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogDescription } from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { AlertTriangle, Trash2, ArrowUpRight } from "lucide-react";
import type { Folder } from "@/server/db/schema";

interface DeleteFolderModalProps {
  folder: Folder | null;
  open: boolean;
  onOpenChange: (open: boolean) => void;
  onConfirmDelete: (folderId: string, mode: "move_up" | "delete_all") => void;
}

export function DeleteFolderModal({
  folder,
  open,
  onOpenChange,
  onConfirmDelete,
}: DeleteFolderModalProps) {
  const [mode, setMode] = React.useState<"move_up" | "delete_all">("delete_all");
  const [isDeleting, setIsDeleting] = React.useState(false);

  if (!folder) return null;

  const handleConfirm = async () => {
    setIsDeleting(true);
    try {
      await onConfirmDelete(folder.id, mode);
      onOpenChange(false);
    } finally {
      setIsDeleting(false);
    }
  };

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-w-md p-5">
        <DialogHeader>
          <div className="flex items-center gap-2">
            <div className="h-8 w-8 rounded-md bg-destructive/10 text-destructive flex items-center justify-center font-bold text-xs flex-shrink-0">
              <Trash2 className="h-4 w-4" />
            </div>
            <div>
              <DialogTitle className="text-base font-semibold">Delete &quot;{folder.name}&quot;</DialogTitle>
              <DialogDescription className="text-xs text-muted-foreground">
                Move folder and all contained websites to Recycle Bin.
              </DialogDescription>
            </div>
          </div>
        </DialogHeader>

        <div className="space-y-3 mt-4 text-xs">
          <label
            onClick={() => setMode("delete_all")}
            className={`flex items-start gap-3 p-3 rounded-lg border cursor-pointer transition-colors ${
              mode === "delete_all"
                ? "border-destructive bg-destructive/5 text-foreground"
                : "border-border hover:bg-muted/40 text-muted-foreground"
            }`}
          >
            <input
              type="radio"
              name="delete_mode"
              checked={mode === "delete_all"}
              onChange={() => setMode("delete_all")}
              className="mt-0.5 text-destructive"
            />
            <div className="space-y-0.5">
              <div className="font-medium text-destructive flex items-center gap-1.5">
                <AlertTriangle className="h-3.5 w-3.5" />
                <span>Delete folder and all websites inside</span>
              </div>
              <p className="text-[11px] text-muted-foreground">
                PC-style Trash: moves the folder and all its bookmarks to Recycle Bin where they can be inspected and restored anytime.
              </p>
            </div>
          </label>

          <label
            onClick={() => setMode("move_up")}
            className={`flex items-start gap-3 p-3 rounded-lg border cursor-pointer transition-colors ${
              mode === "move_up"
                ? "border-primary bg-primary/5 text-foreground"
                : "border-border hover:bg-muted/40 text-muted-foreground"
            }`}
          >
            <input
              type="radio"
              name="delete_mode"
              checked={mode === "move_up"}
              onChange={() => setMode("move_up")}
              className="mt-0.5"
            />
            <div className="space-y-0.5">
              <div className="font-medium text-foreground flex items-center gap-1.5">
                <ArrowUpRight className="h-3.5 w-3.5 text-primary" />
                <span>Move contents up to parent (keep websites)</span>
              </div>
              <p className="text-[11px] text-muted-foreground">
                Deletes only this folder, keeping bookmarks safe in the parent folder or Unsorted.
              </p>
            </div>
          </label>
        </div>

        <div className="flex items-center justify-end gap-2 mt-5">
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
            type="button"
            variant={mode === "delete_all" ? "destructive" : "default"}
            size="sm"
            onClick={handleConfirm}
            disabled={isDeleting}
            className="text-xs h-8"
          >
            {isDeleting ? "Deleting..." : "Confirm Delete"}
          </Button>
        </div>
      </DialogContent>
    </Dialog>
  );
}

