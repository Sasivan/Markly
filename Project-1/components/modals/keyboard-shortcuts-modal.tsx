"use client";

import * as React from "react";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogDescription,
} from "@/components/ui/dialog";
import { Keyboard, ArrowDown, ArrowUp, CornerDownLeft } from "lucide-react";
import { ModalFormatControls } from "@/components/ui/modal-format-controls";
import { useResizableModal } from "@/lib/use-resizable-modal";

interface KeyboardShortcutsModalProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
}

interface ShortcutItem {
  keys: string[];
  description: string;
}

interface ShortcutGroup {
  title: string;
  items: ShortcutItem[];
}

const SHORTCUT_GROUPS: ShortcutGroup[] = [
  {
    title: "Navigation & Selection (Vim)",
    items: [
      { keys: ["j", "↓"], description: "Select next bookmark" },
      { keys: ["k", "↑"], description: "Select previous bookmark" },
      { keys: ["Space", "Enter"], description: "Preview selected bookmark" },
      { keys: ["o"], description: "Open URL in new tab" },
      { keys: ["Esc"], description: "Clear selection / Close modals" },
    ],
  },
  {
    title: "Bookmark Actions",
    items: [
      { keys: ["f"], description: "Toggle Star / Favorite" },
      { keys: ["e"], description: "Edit bookmark details" },
      { keys: ["c"], description: "Copy URL to clipboard" },
      { keys: ["d"], description: "Move selected bookmark to trash" },
      { keys: ["n"], description: "Add new bookmark" },
    ],
  },
  {
    title: "Jump Sequences (Press 'g' then key)",
    items: [
      { keys: ["g", "h"], description: "Jump to Workspace Home" },
      { keys: ["g", "a"], description: "Jump to Quick Access (All)" },
      { keys: ["g", "f"], description: "Jump to Starred Favorites" },
      { keys: ["g", "r"], description: "Jump to Recently Visited" },
      { keys: ["g", "u"], description: "Jump to Inbox (Unsorted)" },
      { keys: ["g", "k"], description: "Jump to Knowledge Graph" },
      { keys: ["g", "b"], description: "Jump to Recycle Bin" },
    ],
  },
  {
    title: "Workspace & Search",
    items: [
      { keys: ["/"], description: "Quick search focus" },
      { keys: ["Ctrl", "K"], description: "Open Command Palette" },
      { keys: ["Ctrl", "\\"], description: "Toggle Sidebar" },
      { keys: ["?"], description: "Toggle this Keyboard Cheatsheet" },
    ],
  },
];

export function KeyboardShortcutsModal({
  open,
  onOpenChange,
}: KeyboardShortcutsModalProps) {
  const {
    format,
    toggleFormat,
    modalStyle,
    hasCustomSize,
    handleRestoreDefaults,
    startResize,
  } = useResizableModal({
    modalId: "keyboard_shortcuts_modal",
    defaultVerticalWidth: 680,
    defaultHorizontalWidth: 840,
    defaultVerticalHeight: 560,
    defaultHorizontalHeight: 520,
    minWidth: 480,
    minHeight: 380,
  });

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent
        style={modalStyle}
        className="bg-card border border-border p-5 shadow-xl max-h-[92vh] overflow-y-auto flex flex-col justify-between transition-none duration-0 select-none relative"
      >
        <DialogHeader className="space-y-1 pb-3 border-b border-border flex-shrink-0">
          <div className="flex items-center justify-between gap-3">
            <div className="flex items-center gap-2">
              <div className="h-8 w-8 rounded-lg bg-primary/10 text-primary flex items-center justify-center shrink-0">
                <Keyboard className="h-4 w-4" />
              </div>
              <DialogTitle className="text-base font-semibold text-foreground">
                Keyboard Navigation & Shortcuts
              </DialogTitle>
            </div>
            <ModalFormatControls
              format={format}
              onToggleFormat={toggleFormat}
              hasCustomSize={hasCustomSize}
              onRestoreDefaults={handleRestoreDefaults}
            />
          </div>
          <DialogDescription className="text-xs text-muted-foreground">
            Navigate your library at lightspeed with Vim-style single-key shortcuts and jump sequences.
          </DialogDescription>
        </DialogHeader>

        <div className={`grid gap-4 pt-3 flex-1 overflow-y-auto ${format === "horizontal" ? "grid-cols-2 md:grid-cols-4" : "grid-cols-1 md:grid-cols-2"}`}>
          {SHORTCUT_GROUPS.map((group) => (
            <div key={group.title} className="space-y-2 p-2 rounded-xl bg-secondary/20 border border-border/50">
              <h4 className="text-xs font-semibold text-foreground tracking-wide border-b border-border/50 pb-1">
                {group.title}
              </h4>
              <div className="space-y-1.5">
                {group.items.map((item) => (
                  <div
                    key={item.description}
                    className="flex items-center justify-between text-xs py-1 px-1.5 rounded hover:bg-secondary/50 transition-colors"
                  >
                    <span className="text-muted-foreground text-[11px] truncate mr-2">{item.description}</span>
                    <div className="flex items-center gap-1 shrink-0">
                      {item.keys.map((k, idx) => (
                        <React.Fragment key={idx}>
                          {idx > 0 && <span className="text-muted-foreground text-[9px]">then</span>}
                          <kbd className="min-w-4 px-1.5 py-0.5 rounded bg-secondary border border-border font-mono text-[10px] text-foreground font-medium text-center shadow-xs">
                            {k}
                          </kbd>
                        </React.Fragment>
                      ))}
                    </div>
                  </div>
                ))}
              </div>
            </div>
          ))}
        </div>

        <div className="mt-3 pt-2.5 border-t border-border flex items-center justify-between text-xs text-muted-foreground flex-shrink-0">
          <span>Tip: Press <kbd className="px-1.5 py-0.5 rounded bg-secondary border border-border font-mono text-[11px] text-foreground">Esc</kbd> anytime to dismiss this dialog.</span>
          <span className="font-mono text-[11px]">Markly Power Navigation</span>
        </div>

        {/* Resizer Handle */}
        <div
          onMouseDown={(e) => startResize("corner", e)}
          className="absolute bottom-1 right-1 w-4 h-4 cursor-se-resize flex items-center justify-center text-muted-foreground/40 hover:text-foreground select-none z-50 text-[10px]"
          title="Drag to resize dialog"
        >
          ⋰
        </div>
      </DialogContent>
    </Dialog>
  );
}

