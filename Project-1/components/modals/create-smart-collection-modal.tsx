"use client";

import * as React from "react";
import { Sparkles, Loader2, Check, AlertCircle, Plus, Trash2 } from "lucide-react";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogDescription,
} from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";

interface CreateSmartCollectionModalProps {
  isOpen: boolean;
  onClose: () => void;
  onCreated: () => void;
  bookmarks?: any[];
}

export function CreateSmartCollectionModal({
  isOpen,
  onClose,
  onCreated,
  bookmarks = [],
}: CreateSmartCollectionModalProps) {
  const [name, setName] = React.useState("");
  const [color, setColor] = React.useState("#8b5cf6");
  const [ruleField, setRuleField] = React.useState<"tags" | "favorite" | "domain" | "status" | "notes" | "visitCount" | "recency" | "description" | "title" | "url">("favorite");
  const [ruleValue, setRuleValue] = React.useState("starred");
  const [loading, setLoading] = React.useState(false);
  const [error, setError] = React.useState<string | null>(null);
  const [presetSaved, setPresetSaved] = React.useState(false);

  // Custom User Presets persisted across sessions
  const [customPresets, setCustomPresets] = React.useState<Array<{ name: string; color: string; field: string; value: string }>>(() => {
    if (typeof window !== "undefined") {
      try {
        const stored = localStorage.getItem("markly_custom_smart_presets");
        if (stored) return JSON.parse(stored);
      } catch {}
    }
    return [];
  });

  const handleSaveAsCustomPreset = () => {
    if (!name.trim()) {
      setError("Please provide a collection name before saving as a preset.");
      return;
    }
    const newPreset = { name: name.trim(), color, field: ruleField, value: ruleValue };
    const updated = [...customPresets.filter((p) => p.name !== newPreset.name), newPreset];
    setCustomPresets(updated);
    try {
      localStorage.setItem("markly_custom_smart_presets", JSON.stringify(updated));
    } catch {}
    setPresetSaved(true);
    setTimeout(() => setPresetSaved(false), 2000);
  };

  const PRESETS = [
    { name: "Starred & Active", color: "#f59e0b", field: "favorite", value: "starred" },
    { name: "Development & GitHub", color: "#3b82f6", field: "domain", value: "github.com" },
    { name: "Articles with Notes", color: "#10b981", field: "notes", value: "has_notes" },
    { name: "Broken Sites to Heal", color: "#ef4444", field: "status", value: "dead" },
    { name: "Frequently Visited Sites", color: "#6366f1", field: "visitCount", value: "5" },
    { name: "Added This Week", color: "#10b981", field: "recency", value: "7" },
  ];

  const handleApplyPreset = (p: typeof PRESETS[0]) => {
    setName(p.name);
    setColor(p.color);
    setRuleField(p.field as any);
    setRuleValue(p.value);
  };

  const handleCreate = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!name.trim()) {
      setError("Please provide a name for this smart collection.");
      return;
    }

    setLoading(true);
    setError(null);

    try {
      const rules = [{ field: ruleField, operator: "equals", value: ruleValue }];
      const res = await fetch("/api/smart-collections", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          name: name.trim(),
          color,
          icon: "Sparkles",
          rulesJson: JSON.stringify(rules),
        }),
      });

      const data = await res.json();
      if (!res.ok || !data.success) {
        throw new Error(data.error || "Failed to create smart collection");
      }

      onCreated();
      onClose();
      setName("");
    } catch (err: any) {
      setError(err.message || "Failed to create smart collection");
    } finally {
      setLoading(false);
    }
  };

  return (
    <Dialog open={isOpen} onOpenChange={(open) => !open && onClose()}>
      <DialogContent className="sm:max-w-md bg-card border-border p-5 text-foreground space-y-4">
        <DialogHeader className="space-y-1">
          <div className="flex items-center gap-2">
            <div className="h-8 w-8 rounded-lg bg-purple-500/10 text-purple-500 flex items-center justify-center border border-purple-500/20">
              <Sparkles className="h-4 w-4" />
            </div>
            <div>
              <DialogTitle className="text-base font-semibold">New Smart Dynamic Collection</DialogTitle>
              <DialogDescription className="text-xs text-muted-foreground">
                Virtual rule-based collections that automatically group bookmarks in real time.
              </DialogDescription>
            </div>
          </div>
        </DialogHeader>

        {error && (
          <div className="p-2.5 rounded-lg border border-destructive/20 bg-destructive/10 text-destructive text-xs flex items-center gap-2">
            <AlertCircle className="h-4 w-4 shrink-0" />
            <span>{error}</span>
          </div>
        )}

        {/* Quick Presets */}
        <div className="space-y-1.5">
          <div className="flex items-center justify-between">
            <span className="text-[11px] font-medium text-muted-foreground">Quick Presets:</span>
            <button
              type="button"
              onClick={handleSaveAsCustomPreset}
              className="text-[11px] text-primary hover:underline cursor-pointer flex items-center gap-1 font-medium"
              title="Save current rule and name as quick preset"
            >
              <Plus className="h-3 w-3" />
              <span>{presetSaved ? "✓ Saved Preset!" : "Save Current as Preset"}</span>
            </button>
          </div>
          <div className="flex flex-wrap gap-1.5">
            {[...PRESETS, ...customPresets].map((p, idx) => (
              <button
                key={`${p.name}-${idx}`}
                type="button"
                onClick={() => handleApplyPreset(p)}
                className="px-2 py-1 rounded-md text-[11px] border border-border bg-secondary/50 hover:bg-secondary text-foreground cursor-pointer transition-colors flex items-center gap-1.5"
              >
                <span className="h-2 w-2 rounded-full" style={{ backgroundColor: p.color }} />
                <span>{p.name}</span>
              </button>
            ))}
          </div>
        </div>

        <form onSubmit={handleCreate} className="space-y-3.5 text-xs">
          <div className="space-y-1">
            <label className="text-xs font-medium text-foreground">Collection Name</label>
            <Input
              value={name}
              onChange={(e) => setName(e.target.value)}
              placeholder="e.g. Starred Dev Tools"
              className="h-8 text-xs bg-background"
              autoFocus
              disabled={loading}
            />
          </div>

          <div className="grid grid-cols-2 gap-2">
            <div className="space-y-1">
              <label className="text-xs font-medium text-foreground">Filter Field</label>
              <select
                value={ruleField}
                onChange={(e) => {
                  const val = e.target.value as any;
                  setRuleField(val);
                  if (val === "favorite") setRuleValue("starred");
                  else if (val === "status") setRuleValue("dead");
                  else if (val === "notes") setRuleValue("has_notes");
                  else if (val === "visitCount") setRuleValue("5");
                  else if (val === "recency") setRuleValue("7");
                  else setRuleValue("");
                }}
                className="w-full h-8 px-2 rounded-md border border-input bg-background text-xs text-foreground focus:outline-none focus:ring-1 focus:ring-ring"
              >
                <option value="favorite">Starred Status</option>
                <option value="description">Description (Contains)</option>
                <option value="title">Title (Contains)</option>
                <option value="domain">Domain Name</option>
                <option value="tags">Tag Name</option>
                <option value="url">URL (Contains)</option>
                <option value="status">Health Status</option>
                <option value="notes">Has Personal Notes</option>
                <option value="visitCount">Visit Count / Engagement</option>
                <option value="recency">Date Added Recency</option>
              </select>
            </div>

            <div className="space-y-1">
              <label className="text-xs font-medium text-foreground">Rule Value</label>
              {ruleField === "favorite" ? (
                <select
                  value={ruleValue}
                  onChange={(e) => setRuleValue(e.target.value)}
                  className="w-full h-8 px-2 rounded-md border border-input bg-background text-xs text-foreground focus:outline-none focus:ring-1 focus:ring-ring"
                >
                  <option value="starred">Starred Only</option>
                  <option value="unstarred">Unstarred Only</option>
                </select>
              ) : ruleField === "status" ? (
                <select
                  value={ruleValue}
                  onChange={(e) => setRuleValue(e.target.value)}
                  className="w-full h-8 px-2 rounded-md border border-input bg-background text-xs text-foreground focus:outline-none focus:ring-1 focus:ring-ring"
                >
                  <option value="dead">Broken / Dead Links</option>
                  <option value="alive">Active / Healthy</option>
                </select>
              ) : ruleField === "notes" ? (
                <select
                  value={ruleValue}
                  onChange={(e) => setRuleValue(e.target.value)}
                  className="w-full h-8 px-2 rounded-md border border-input bg-background text-xs text-foreground focus:outline-none focus:ring-1 focus:ring-ring"
                >
                  <option value="has_notes">Has Personal Notes</option>
                </select>
              ) : ruleField === "visitCount" ? (
                <select
                  value={ruleValue}
                  onChange={(e) => setRuleValue(e.target.value)}
                  className="w-full h-8 px-2 rounded-md border border-input bg-background text-xs text-foreground focus:outline-none focus:ring-1 focus:ring-ring"
                >
                  <option value="5">Frequent (≥5 visits)</option>
                  <option value="2">Active (≥2 visits)</option>
                  <option value="1">Visited At Least Once (≥1 visit)</option>
                  <option value="0">Unvisited / Dormant (0 visits)</option>
                </select>
              ) : ruleField === "recency" ? (
                <select
                  value={ruleValue}
                  onChange={(e) => setRuleValue(e.target.value)}
                  className="w-full h-8 px-2 rounded-md border border-input bg-background text-xs text-foreground focus:outline-none focus:ring-1 focus:ring-ring"
                >
                  <option value="1">Added in Past 24 Hours</option>
                  <option value="7">Added in Past 7 Days</option>
                  <option value="30">Added in Past 30 Days</option>
                  <option value="90">Added in Past 90 Days</option>
                </select>
              ) : (
                <Input
                  value={ruleValue}
                  onChange={(e) => setRuleValue(e.target.value)}
                  placeholder={
                    ruleField === "domain"
                      ? "github.com"
                      : ruleField === "description"
                      ? "Search text inside description..."
                      : ruleField === "title"
                      ? "Search text inside title..."
                      : ruleField === "url"
                      ? "e.g. docs, blog, youtube"
                      : "ai, design"
                  }
                  className="h-8 text-xs bg-background"
                />
              )}
            </div>
          </div>

          {/* Color Picker */}
          <div className="space-y-1">
            <label className="text-xs font-medium text-foreground">Badge Color</label>
            <div className="flex items-center gap-2">
              {["#8b5cf6", "#3b82f6", "#10b981", "#f59e0b", "#ef4444", "#ec4899", "#6366f1"].map((c) => (
                <button
                  key={c}
                  type="button"
                  onClick={() => setColor(c)}
                  className={`h-6 w-6 rounded-full cursor-pointer transition-transform ${
                    color === c ? "scale-115 ring-2 ring-primary ring-offset-2 ring-offset-background" : "hover:scale-105"
                  }`}
                  style={{ backgroundColor: c }}
                />
              ))}
            </div>
          </div>

          <div className="flex items-center justify-end gap-2 pt-2 border-t border-border">
            <Button
              type="button"
              variant="outline"
              size="sm"
              onClick={onClose}
              className="h-8 text-xs cursor-pointer"
              disabled={loading}
            >
              Cancel
            </Button>
            <Button
              type="submit"
              size="sm"
              disabled={loading || !name.trim()}
              className="h-8 text-xs bg-primary text-primary-foreground cursor-pointer gap-1.5"
            >
              {loading ? <Loader2 className="h-3.5 w-3.5 animate-spin" /> : <Sparkles className="h-3.5 w-3.5" />}
              <span>Create Collection</span>
            </Button>
          </div>
        </form>
      </DialogContent>
    </Dialog>
  );
}

