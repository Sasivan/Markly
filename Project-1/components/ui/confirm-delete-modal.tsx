"use client";

import * as React from "react";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogDescription } from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { Trash2, AlertTriangle } from "lucide-react";

interface ConfirmDeleteModalProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  onConfirm: () => void | Promise<void>;
  title?: string;
  description?: string;
  itemName?: string;
  isBulk?: boolean;
  count?: number;
}

export function ConfirmDeleteModal({
  open,
  onOpenChange,
  onConfirm,
  title = "Delete Bookmark",
  description,
  itemName,
  isBulk = false,
  count = 1,
}: ConfirmDeleteModalProps) {
  const [isDeleting, setIsDeleting] = React.useState(false);

  const handleConfirm = async () => {
    setIsDeleting(true);
    try {
      await onConfirm();
      onOpenChange(false);
    } finally {
      setIsDeleting(false);
    }
  };

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-w-md p-6 bg-white dark:bg-[#1a1a1a] border-2 border-slate-200 dark:border-neutral-800 shadow-2xl rounded-2xl animate-in zoom-in-95">
        <DialogHeader>
          <div className="flex items-center gap-3">
            <div className="h-10 w-10 rounded-xl bg-destructive/10 text-destructive flex items-center justify-center font-bold text-sm flex-shrink-0">
              <Trash2 className="h-5 w-5" />
            </div>
            <div>
              <DialogTitle className="text-base font-bold text-slate-900 dark:text-white">
                {title}
              </DialogTitle>
              <DialogDescription className="text-xs text-muted-foreground mt-0.5">
                {description ||
                  (isBulk
                    ? `Are you sure you want to delete ${count} selected bookmarks? This action cannot be undone.`
                    : itemName
                    ? `Are you sure you want to delete "${itemName}"? This action cannot be undone.`
                    : "Are you sure you want to delete this item? This action cannot be undone.")}
              </DialogDescription>
            </div>
          </div>
        </DialogHeader>

        <div className="flex items-center justify-end gap-2.5 mt-6 pt-4 border-t border-slate-100 dark:border-neutral-800">
          <Button
            type="button"
            variant="outline"
            size="sm"
            onClick={() => onOpenChange(false)}
            disabled={isDeleting}
            className="cursor-pointer text-xs h-9 px-4 rounded-lg font-medium"
          >
            Cancel
          </Button>

          <Button
            type="button"
            variant="destructive"
            size="sm"
            onClick={handleConfirm}
            disabled={isDeleting}
            className="cursor-pointer text-xs h-9 px-4 rounded-lg font-semibold gap-1.5 shadow-sm"
          >
            <Trash2 className="h-3.5 w-3.5" />
            <span>{isDeleting ? "Deleting..." : "Delete"}</span>
          </Button>
        </div>
      </DialogContent>
    </Dialog>
  );
}

