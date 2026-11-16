"use client";

import * as React from "react";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogDescription,
} from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { UniversalIdentityPicker } from "@/components/ui/universal-identity-picker";
import { FolderIconRenderer } from "@/components/icons/folder-icon-renderer";
import { FolderTreeSelect } from "@/components/modals/folder-tree-select";
import {
  Folder as FolderIcon,
  FolderInput,
  Plus,
  Copy,
  Trash2,
  ShieldCheck,
  Check,
  Sparkles,
  ArrowRight,
} from "lucide-react";
import type { Folder, FolderTreeNode } from "@/server/db/schema";

interface EditCollectionModalProps {
  folder: Folder | null;
  folders: Folder[];
  folderTree?: FolderTreeNode[];
  open: boolean;
  onOpenChange: (open: boolean) => void;
  onSave: (
    folderId: string,
    updates: {
      name: string;
      icon: string;
      color: string;
      parentId?: string | null;
    }
  ) => Promise<void> | void;
  onNewSubfolder?: (parentId: string) => void;
  onCopyFolder?: (folder: Folder) => void;
  onDeleteFolder?: (folder: Folder) => void;
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

export function EditCollectionModal({
  folder,
  folders,
  folderTree,
  open,
  onOpenChange,
  onSave,
  onNewSubfolder,
  onCopyFolder,
  onDeleteFolder,
}: EditCollectionModalProps) {
  const [name, setName] = React.useState("");
  const [selectedIcon, setSelectedIcon] = React.useState("folder");
  const [selectedColor, setSelectedColor] = React.useState("#3b82f6");
  const [parentId, setParentId] = React.useState<string | null>(null);
  const [isSaving, setIsSaving] = React.useState(false);

  const isPermanent = Boolean(
    folder && (folder.id === "__UNSORTED__" || folder.id.startsWith("fld_unsorted_"))
  );

  React.useEffect(() => {
    if (folder) {
      setName(folder.name);
      setSelectedIcon(folder.icon || (isPermanent ? "inbox" : "folder"));
      setSelectedColor(folder.color || (isPermanent ? "#8b5cf6" : "#3b82f6"));
      const p = folder.parentId ?? (folder as any).parent_id ?? null;
      setParentId(p);
    }
  }, [folder, isPermanent, open]);

  // Filter out current folder and its descendants from destination options to prevent cycles
  // (Always call hooks at top level before any early return)
  const eligibleTargetFolders = React.useMemo(() => {
    if (!folder || !folders) return [];

    const descendantIds = new Set<string>();
    const getDescendants = (pId: string) => {
      descendantIds.add(pId);
      folders
        .filter((f) => (f.parentId ?? (f as any).parent_id) === pId)
        .forEach((kid) => {
          if (!descendantIds.has(kid.id)) {
            getDescendants(kid.id);
          }
        });
    };
    getDescendants(folder.id);

    return folders.filter(
      (f) =>
        !descendantIds.has(f.id) &&
        f.id !== "__UNSORTED__" &&
        !f.id.startsWith("fld_unsorted_")
    );
  }, [folders, folder]);

  if (!folder) return null;

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!name.trim()) return;

    setIsSaving(true);
    try {
      await onSave(folder.id, {
        name: name.trim(),
        icon: selectedIcon,
        color: selectedColor,
        parentId: isPermanent ? null : parentId,
      });
      onOpenChange(false);
    } finally {
      setIsSaving(false);
    }
  };

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="sm:max-w-md p-6 max-h-[90vh] overflow-y-auto">
        <DialogHeader className="space-y-1">
          <div className="flex items-center gap-3">
            <div
              className="h-11 w-11 rounded-xl flex items-center justify-center text-xl flex-shrink-0 shadow-sm border border-black/5"
              style={{ backgroundColor: `${selectedColor}25` }}
            >
              <FolderIconRenderer icon={selectedIcon} className="h-6 w-6" color={selectedColor} />
            </div>
            <div>
              <DialogTitle className="text-base font-semibold text-foreground flex items-center gap-1.5">
                <span>{isPermanent ? "Edit Unsorted Collection" : "Edit Folder Collection"}</span>
                {isPermanent && (
                  <span className="text-xs bg-secondary text-secondary-foreground font-mono px-2 py-0.5 rounded-md font-medium border border-border">
                    Permanent
                  </span>
                )}
              </DialogTitle>
              <DialogDescription className="text-xs text-muted-foreground">
                Rename, change icon branding, color, and location in one place.
              </DialogDescription>
            </div>
          </div>
        </DialogHeader>

        <form onSubmit={handleSubmit} className="space-y-4 mt-2 text-xs">
          {/* Collection Name */}
          <div className="space-y-1.5">
            <label className="text-xs font-semibold text-foreground">
              Collection Name
            </label>
            <Input
              type="text"
              value={name}
              onChange={(e) => setName(e.target.value)}
              placeholder="e.g. Development, Resources, Inbox..."
              className="h-9 text-xs"
              required
              autoFocus
            />
          </div>

          {/* Universal Icon & Accent Color Picker */}
          <UniversalIdentityPicker
            icon={selectedIcon}
            color={selectedColor}
            onIconChange={setSelectedIcon}
            onColorChange={setSelectedColor}
            label="Collection Identity & Accent"
            previewName={name || "Collection Preview"}
          />

          {/* Location / Move Parent Folder Selection */}
          <div className="space-y-1.5">
            <label className="text-xs font-semibold text-foreground">
              Folder Location & Hierarchy
            </label>
            {isPermanent ? (
              <div className="p-3 rounded-xl border border-border bg-secondary/40 flex items-center gap-2.5 text-foreground text-xs">
                <ShieldCheck className="h-4 w-4 text-muted-foreground flex-shrink-0" />
                <span className="text-xs font-medium">
                  Permanent system folder — always positioned at the root level.
                </span>
              </div>
            ) : (
              <div className="space-y-2">
                <FolderTreeSelect
                  folders={eligibleTargetFolders}
                  selectedFolderId={parentId || ""}
                  onSelectFolder={(id) => setParentId(id ? id : null)}
                  className="w-full text-xs"
                />
                <p className="text-xs text-muted-foreground">
                  Select a parent folder to nest this collection, or choose Root to keep it top-level.
                </p>
              </div>
            )}
          </div>

          {/* Extra Actions: Subfolder & Delete */}
          {!isPermanent && (
            <div className="pt-2 border-t border-slate-100 dark:border-neutral-800 flex items-center justify-between">
              {onNewSubfolder && (
                <Button
                  type="button"
                  variant="outline"
                  size="sm"
                  onClick={() => {
                    onOpenChange(false);
                    onNewSubfolder(folder.id);
                  }}
                  className="text-xs h-7 px-2.5 cursor-pointer text-slate-700 dark:text-neutral-300 gap-1"
                >
                  <Plus className="h-3 w-3 text-indigo-500" />
                  <span>Add Subfolder</span>
                </Button>
              )}

              {onCopyFolder && (
                <Button
                  type="button"
                  variant="outline"
                  size="sm"
                  onClick={() => {
                    onOpenChange(false);
                    onCopyFolder(folder);
                  }}
                  className="text-xs h-7 px-2.5 cursor-pointer text-slate-700 dark:text-neutral-300 gap-1"
                >
                  <Copy className="h-3 w-3 text-indigo-500" />
                  <span>Copy</span>
                </Button>
              )}

              {onDeleteFolder && (
                <Button
                  type="button"
                  variant="ghost"
                  size="sm"
                  onClick={() => {
                    onOpenChange(false);
                    onDeleteFolder(folder);
                  }}
                  className="text-xs h-7 px-2.5 text-rose-600 dark:text-rose-400 hover:bg-rose-50 dark:hover:bg-rose-950/40 cursor-pointer ml-auto gap-1"
                >
                  <Trash2 className="h-3 w-3" />
                  <span>Delete</span>
                </Button>
              )}
            </div>
          )}

          {/* Dialog Action Buttons */}
          <div className="flex items-center justify-end gap-2 pt-3 border-t border-slate-100 dark:border-neutral-800">
            <Button
              type="button"
              variant="outline"
              size="sm"
              onClick={() => onOpenChange(false)}
              className="text-xs h-8 px-3 cursor-pointer"
            >
              Cancel
            </Button>
            <Button
              type="submit"
              disabled={isSaving || !name.trim()}
              className="text-xs h-8 px-4 bg-blue-600 hover:bg-blue-700 text-white font-semibold cursor-pointer gap-1.5"
            >
              <Check className="h-3.5 w-3.5" />
              <span>{isSaving ? "Saving Changes..." : "Save Changes"}</span>
            </Button>
          </div>
        </form>
      </DialogContent>
    </Dialog>
  );
}
