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
import { GitBranch, Plus, Trash2, Check, Sparkles, Folder as FolderIcon, RotateCcw } from "lucide-react";
import { useResizableModal, ModalResizeHandles } from "@/lib/use-resizable-modal";
import type { Folder } from "@/server/db/schema";

export interface FolderRoutingRule {
  id: string;
  pattern: string; // e.g. "github.com", "figma.com", "doc"
  ruleType: "domain" | "keyword";
  folderId: string;
}

interface FolderRoutingModalProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  folders: Folder[];
}

export const DEFAULT_ROUTING_RULES: Omit<FolderRoutingRule, "folderId">[] = [
  { id: "def_github", pattern: "github.com", ruleType: "domain" },
  { id: "def_gitlab", pattern: "gitlab.com", ruleType: "domain" },
  { id: "def_figma", pattern: "figma.com", ruleType: "domain" },
  { id: "def_youtube", pattern: "youtube.com", ruleType: "domain" },
  { id: "def_arxiv", pattern: "arxiv.org", ruleType: "domain" },
  { id: "def_medium", pattern: "medium.com", ruleType: "domain" },
];

export function getSavedRoutingRules(): FolderRoutingRule[] {
  if (typeof window === "undefined") return [];
  try {
    const saved = localStorage.getItem("markly_folder_routing_rules");
    if (saved) {
      return JSON.parse(saved);
    }
  } catch {
    // ignore
  }
  return [];
}

export function saveRoutingRules(rules: FolderRoutingRule[]) {
  if (typeof window === "undefined") return;
  try {
    localStorage.setItem("markly_folder_routing_rules", JSON.stringify(rules));
  } catch {
    // ignore
  }
}

export function matchFolderRule(
  url: string,
  title: string,
  rules: FolderRoutingRule[]
): FolderRoutingRule | null {
  if (!url && !title) return null;
  const lowerUrl = url.toLowerCase();
  const lowerTitle = title.toLowerCase();

  for (const rule of rules) {
    const pat = rule.pattern.trim().toLowerCase();
    if (!pat) continue;

    if (rule.ruleType === "domain") {
      if (lowerUrl.includes(pat)) {
        return rule;
      }
    } else if (rule.ruleType === "keyword") {
      if (lowerTitle.includes(pat) || lowerUrl.includes(pat)) {
        return rule;
      }
    }
  }
  return null;
}

export function FolderRoutingModal({
  open,
  onOpenChange,
  folders,
}: FolderRoutingModalProps) {
  const {
    modalStyle,
    hasCustomSize,
    handleRestoreDefaults,
    startResize,
  } = useResizableModal({
    modalId: "folder_routing",
    defaultVerticalWidth: 480,
    defaultHorizontalWidth: 540,
    defaultVerticalHeight: 520,
    defaultHorizontalHeight: 520,
    minWidth: 380,
    minHeight: 400,
  });

  const [rules, setRules] = React.useState<FolderRoutingRule[]>([]);
  const [patternInput, setPatternInput] = React.useState("");
  const [ruleType, setRuleType] = React.useState<"domain" | "keyword">("domain");
  const [targetFolderId, setTargetFolderId] = React.useState<string>("");

  React.useEffect(() => {
    if (open) {
      const saved = getSavedRoutingRules();
      setRules(saved);
      if (folders.length > 0 && !targetFolderId) {
        setTargetFolderId(folders[0].id);
      }
    }
  }, [open, folders]);

  const handleAddRule = (e: React.FormEvent) => {
    e.preventDefault();
    const pat = patternInput.trim();
    if (!pat || !targetFolderId) return;

    const newRule: FolderRoutingRule = {
      id: "rule_" + Date.now(),
      pattern: pat,
      ruleType,
      folderId: targetFolderId,
    };

    const updated = [newRule, ...rules];
    setRules(updated);
    saveRoutingRules(updated);
    setPatternInput("");
  };

  const handleDeleteRule = (id: string) => {
    const updated = rules.filter((r) => r.id !== id);
    setRules(updated);
    saveRoutingRules(updated);
  };

  const getFolderName = (folderId: string) => {
    const f = folders.find((item) => item.id === folderId);
    return f ? f.name : "Unknown folder";
  };

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent
        style={modalStyle}
        className="relative max-w-[95vw] bg-card border border-border p-5 shadow-2xl max-h-[92vh] overflow-y-auto rounded-xl"
      >
        <ModalResizeHandles onStartResize={startResize} />

        <DialogHeader className="space-y-1 pb-3 border-b border-border">
          <div className="flex items-center justify-between gap-3">
            <div className="flex items-center gap-2">
              <div className="h-8 w-8 rounded-lg bg-primary/10 text-primary flex items-center justify-center">
                <GitBranch className="h-4 w-4" />
              </div>
              <DialogTitle className="text-base font-semibold text-foreground">
                Smart Auto-Routing Rules
              </DialogTitle>
            </div>

            {hasCustomSize && (
              <button
                type="button"
                onClick={handleRestoreDefaults}
                title="Restore default modal size"
                className="p-1.5 rounded-md hover:bg-secondary text-muted-foreground hover:text-foreground cursor-pointer transition-colors border border-border/60 shrink-0"
              >
                <RotateCcw className="h-3.5 w-3.5" />
              </button>
            )}
          </div>
          <DialogDescription className="text-xs text-muted-foreground">
            Automatically organize incoming bookmarks into target folders by matching domains or keywords.
          </DialogDescription>
        </DialogHeader>

        {/* Add new rule form */}
        <form onSubmit={handleAddRule} className="pt-3 pb-2 space-y-2.5">
          <div className="text-xs font-semibold text-foreground">Add New Routing Rule</div>
          <div className="flex items-center gap-2">
            <select
              value={ruleType}
              onChange={(e) => setRuleType(e.target.value as "domain" | "keyword")}
              className="h-8 px-2 rounded-md bg-secondary border border-border text-xs text-foreground focus:outline-none focus:ring-1 focus:ring-ring cursor-pointer"
            >
              <option value="domain">Domain</option>
              <option value="keyword">Keyword</option>
            </select>

            <input
              type="text"
              value={patternInput}
              onChange={(e) => setPatternInput(e.target.value)}
              placeholder={ruleType === "domain" ? "e.g. github.com" : "e.g. tutorial"}
              className="flex-1 h-8 px-2.5 rounded-md bg-background border border-input text-xs text-foreground placeholder:text-muted-foreground focus:outline-none focus:ring-1 focus:ring-ring font-mono"
            />
          </div>

          <div className="flex items-center gap-2">
            <span className="text-xs text-muted-foreground flex-shrink-0">Routes to:</span>
            <select
              value={targetFolderId}
              onChange={(e) => setTargetFolderId(e.target.value)}
              className="flex-1 h-8 px-2 rounded-md bg-secondary border border-border text-xs text-foreground focus:outline-none focus:ring-1 focus:ring-ring cursor-pointer truncate"
            >
              {folders.map((f) => (
                <option key={f.id} value={f.id}>
                  {f.name}
                </option>
              ))}
            </select>

            <Button
              type="submit"
              size="sm"
              disabled={!patternInput.trim() || !targetFolderId}
              className="h-8 px-3 cursor-pointer text-xs"
            >
              <Plus className="h-3.5 w-3.5 mr-1" />
              Add
            </Button>
          </div>
        </form>

        {/* Existing rules list */}
        <div className="mt-3 pt-3 border-t border-border space-y-1.5 max-h-56 overflow-y-auto">
          <div className="text-xs font-semibold text-foreground flex items-center justify-between pb-1">
            <span>Active Rules ({rules.length})</span>
          </div>

          {rules.length === 0 ? (
            <div className="p-4 rounded-lg bg-secondary/30 border border-dashed border-border text-center text-xs text-muted-foreground space-y-1">
              <div>No auto-routing rules set yet.</div>
              <div className="text-[11px]">
                Create a rule above to automatically sort links as you add them!
              </div>
            </div>
          ) : (
            rules.map((rule) => (
              <div
                key={rule.id}
                className="flex items-center justify-between p-2 rounded-md bg-secondary/40 border border-border text-xs"
              >
                <div className="flex items-center gap-2 truncate mr-2">
                  <span className="px-1.5 py-0.5 rounded text-[10px] uppercase font-mono font-semibold bg-primary/10 text-primary">
                    {rule.ruleType}
                  </span>
                  <span className="font-mono font-medium text-foreground truncate max-w-32">
                    {rule.pattern}
                  </span>
                  <span className="text-muted-foreground">→</span>
                  <span className="font-medium text-foreground truncate max-w-28 flex items-center gap-1">
                    <FolderIcon className="h-3 w-3 text-muted-foreground flex-shrink-0" />
                    <span>{getFolderName(rule.folderId)}</span>
                  </span>
                </div>

                <button
                  type="button"
                  onClick={() => handleDeleteRule(rule.id)}
                  className="h-6 w-6 rounded hover:bg-destructive/10 text-muted-foreground hover:text-destructive flex items-center justify-center transition-colors cursor-pointer"
                  title="Delete rule"
                >
                  <Trash2 className="h-3 w-3" />
                </button>
              </div>
            ))
          )}
        </div>

        <div className="mt-2 pt-3 border-t border-border flex justify-end">
          <Button
            type="button"
            size="sm"
            onClick={() => onOpenChange(false)}
            className="text-xs h-8 cursor-pointer"
          >
            Done
          </Button>
        </div>
      </DialogContent>
    </Dialog>
  );
}

