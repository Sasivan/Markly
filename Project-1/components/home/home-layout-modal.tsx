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
import { SlidersHorizontal, ArrowUp, ArrowDown, RotateCcw, Check } from "lucide-react";

export type HomeWidgetKey =
  | "heatmap"
  | "scratchpad"
  | "folders"
  | "recent"
  | "favorites"
  | "unsorted"
  | "spectrum"
  | "analytics";

export interface HomeWidgetConfig {
  id: HomeWidgetKey;
  label: string;
  visible: boolean;
  span?: "1" | "2"; // 1 = Half Width, 2 = Full Width
}

export const DEFAULT_HOME_WIDGETS: HomeWidgetConfig[] = [
  { id: "heatmap", label: "365-Day Activity Heatmap", visible: true, span: "2" },
  { id: "scratchpad", label: "Quick Scratchpad", visible: true, span: "1" },
  { id: "folders", label: "Quick Access Folders", visible: true, span: "1" },
  { id: "recent", label: "Recently Visited Sites", visible: true, span: "1" },
  { id: "favorites", label: "Starred Favorites", visible: true, span: "1" },
  { id: "unsorted", label: "Inbox / Unsorted Bookmarks", visible: true, span: "1" },
  { id: "spectrum", label: "Inactivity Dot Spectrum", visible: true, span: "2" },
  { id: "analytics", label: "Global Visual Analytics", visible: true, span: "2" },
];

interface HomeLayoutModalProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  widgets: HomeWidgetConfig[];
  onSaveWidgets: (widgets: HomeWidgetConfig[]) => void;
  onResetDefaults: () => void;
}

export function HomeLayoutModal({
  open,
  onOpenChange,
  widgets,
  onSaveWidgets,
  onResetDefaults,
}: HomeLayoutModalProps) {
  const [localWidgets, setLocalWidgets] = React.useState<HomeWidgetConfig[]>(widgets);

  React.useEffect(() => {
    setLocalWidgets(widgets);
  }, [widgets, open]);

  const toggleVisibility = (id: HomeWidgetKey) => {
    setLocalWidgets((prev) =>
      prev.map((w) => (w.id === id ? { ...w, visible: !w.visible } : w))
    );
  };

  const toggleSpan = (id: HomeWidgetKey) => {
    setLocalWidgets((prev) =>
      prev.map((w) => (w.id === id ? { ...w, span: w.span === "2" ? "1" : "2" } : w))
    );
  };

  const moveWidget = (index: number, direction: "up" | "down") => {
    const targetIndex = direction === "up" ? index - 1 : index + 1;
    if (targetIndex < 0 || targetIndex >= localWidgets.length) return;

    const copy = [...localWidgets];
    const [moved] = copy.splice(index, 1);
    copy.splice(targetIndex, 0, moved);
    setLocalWidgets(copy);
  };

  const handleSave = () => {
    onSaveWidgets(localWidgets);
    onOpenChange(false);
  };

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-w-md bg-card border border-border p-5 shadow-xl">
        <DialogHeader className="space-y-1 pb-3 border-b border-border">
          <div className="flex items-center gap-2">
            <div className="h-8 w-8 rounded-lg bg-primary/10 text-primary flex items-center justify-center">
              <SlidersHorizontal className="h-4 w-4" />
            </div>
            <DialogTitle className="text-base font-semibold text-foreground">
              Customize Homepage Layout
            </DialogTitle>
          </div>
          <DialogDescription className="text-xs text-muted-foreground">
            Toggle visibility and reorder sections to fit your personal workflow.
          </DialogDescription>
        </DialogHeader>

        {/* Widgets list */}
        <div className="space-y-2 py-3 max-h-[50vh] overflow-y-auto">
          {localWidgets.map((widget, index) => (
            <div
              key={widget.id}
              className={`flex items-center justify-between p-2.5 rounded-lg border text-xs transition-colors ${
                widget.visible
                  ? "bg-secondary/40 border-border"
                  : "bg-secondary/10 border-border/40 opacity-60"
              }`}
            >
              <label className="flex items-center gap-2.5 cursor-pointer select-none">
                <input
                  type="checkbox"
                  checked={widget.visible}
                  onChange={() => toggleVisibility(widget.id)}
                  className="rounded border-border text-primary focus:ring-ring cursor-pointer h-4 w-4"
                />
                <span className={`font-medium ${widget.visible ? "text-foreground" : "text-muted-foreground line-through"}`}>
                  {widget.label}
                </span>
              </label>

              <div className="flex items-center gap-1.5">
                <button
                  type="button"
                  onClick={() => toggleSpan(widget.id)}
                  className={`px-2 py-0.5 rounded text-[11px] font-medium border cursor-pointer transition-colors ${
                    (widget.span || "1") === "2"
                      ? "bg-primary/10 text-primary border-primary/30"
                      : "bg-background text-muted-foreground border-border hover:text-foreground"
                  }`}
                  title="Toggle Half Width (1 Col) vs Full Width (2 Col)"
                >
                  {(widget.span || "1") === "2" ? "Full Width (2 Col)" : "Half Width (1 Col)"}
                </button>

                <button
                  type="button"
                  onClick={() => moveWidget(index, "up")}
                  disabled={index === 0}
                  className="h-6 w-6 rounded border border-border bg-card flex items-center justify-center text-muted-foreground hover:text-foreground disabled:opacity-30 cursor-pointer transition-colors"
                  title="Move section up"
                >
                  <ArrowUp className="h-3 w-3" />
                </button>
                <button
                  type="button"
                  onClick={() => moveWidget(index, "down")}
                  disabled={index === localWidgets.length - 1}
                  className="h-6 w-6 rounded border border-border bg-card flex items-center justify-center text-muted-foreground hover:text-foreground disabled:opacity-30 cursor-pointer transition-colors"
                  title="Move section down"
                >
                  <ArrowDown className="h-3 w-3" />
                </button>
              </div>
            </div>
          ))}
        </div>

        {/* Footer actions */}
        <div className="flex items-center justify-between pt-3 border-t border-border">
          <Button
            type="button"
            variant="ghost"
            size="sm"
            onClick={onResetDefaults}
            className="text-xs text-muted-foreground hover:text-foreground h-8 cursor-pointer gap-1.5"
          >
            <RotateCcw className="h-3.5 w-3.5" />
            <span>Reset Defaults</span>
          </Button>

          <div className="flex items-center gap-2">
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
              type="button"
              variant="default"
              size="sm"
              onClick={handleSave}
              className="text-xs h-8 cursor-pointer gap-1.5"
            >
              <Check className="h-3.5 w-3.5" />
              <span>Apply Layout</span>
            </Button>
          </div>
        </div>
      </DialogContent>
    </Dialog>
  );
}

