"use client";

import * as React from "react";
import { Sparkles, Loader2, Check, AlertCircle, Plus, Trash2, Columns2, Rows2, Eye, RotateCcw } from "lucide-react";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogDescription,
} from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { IconSearchPicker } from "@/components/icons/icon-search-picker";
import { FolderIconRenderer } from "@/components/icons/folder-icon-renderer";
import { useResizableModal, ModalResizeHandles } from "@/lib/use-resizable-modal";

interface CreateSmartCollectionModalProps {
  isOpen: boolean;
  onClose: () => void;
  onCreated: (newId?: string) => void;
  bookmarks?: any[];
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

export function CreateSmartCollectionModal({
  isOpen,
  onClose,
  onCreated,
  bookmarks = [],
}: CreateSmartCollectionModalProps) {
  const [name, setName] = React.useState("");
  const [color, setColor] = React.useState("#8b5cf6");
  const [icon, setIcon] = React.useState("Sparkles");
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
          icon,
          rulesJson: JSON.stringify(rules),
        }),
      });

      const data = await res.json();
      if (!res.ok || !data.success) {
        throw new Error(data.error || "Failed to create smart collection");
      }

      onCreated(data.collection?.id);
      onClose();
      setName("");
    } catch (err: any) {
      setError(err.message || "Failed to create smart collection");
    } finally {
      setLoading(false);
    }
  };

  const handleRandomColor = () => {
    const randomHex = COLOR_PALETTE[Math.floor(Math.random() * COLOR_PALETTE.length)].value;
    setColor(randomHex);
  };

  const handleResetColor = () => {
    setColor("#8b5cf6");
  };

  // Adaptive Resizable Modal state with custom width & height persisted
  const {
    format: modalFormat,
    toggleFormat: toggleModalFormat,
    modalStyle,
    hasCustomSize,
    handleRestoreDefaults,
    startResize,
  } = useResizableModal({
    modalId: "smart_collection",
    defaultVerticalWidth: 560,
    defaultHorizontalWidth: 960,
    defaultVerticalHeight: 680,
    defaultHorizontalHeight: 650,
  });

  return (
    <Dialog open={isOpen} onOpenChange={(open) => !open && onClose()}>
      <DialogContent
        style={modalStyle}
        className="relative flex flex-col bg-card border-border p-5 text-foreground overflow-hidden max-w-[95vw] max-h-[92vh]"
      >
        <ModalResizeHandles onStartResize={startResize} />

        <DialogHeader className="space-y-1 pb-2 border-b border-border/60">
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-2">
              <div className="h-8 w-8 rounded-lg bg-secondary text-primary flex items-center justify-center border border-border">
                <Sparkles className="h-4 w-4" />
              </div>
              <div>
                <DialogTitle className="text-base font-semibold">New Smart Dynamic Collection</DialogTitle>
                <DialogDescription className="text-xs text-muted-foreground">
                  Virtual rule-based collections that automatically group bookmarks in real time.
                </DialogDescription>
              </div>
            </div>

            <div className="flex items-center gap-1.5 shrink-0 ml-3">
              {/* Restore size button */}
              {hasCustomSize && (
                <button
                  type="button"
                  onClick={handleRestoreDefaults}
                  title="Restore default modal size"
                  className="p-1.5 rounded-md hover:bg-secondary text-muted-foreground hover:text-foreground cursor-pointer transition-colors border border-border/60"
                >
                  <RotateCcw className="h-3.5 w-3.5" />
                </button>
              )}

              {/* Layout format toggle button */}
              <div className="flex items-center bg-secondary/80 p-0.5 rounded-lg border border-border text-[11px] font-medium">
                <button
                  type="button"
                  onClick={() => toggleModalFormat("vertical")}
                  title="Vertical stacked layout"
                  className={`p-1.5 rounded-md transition-colors cursor-pointer ${
                    modalFormat === "vertical"
                      ? "bg-card text-foreground shadow-2xs font-semibold"
                      : "text-muted-foreground hover:text-foreground"
                  }`}
                >
                  <Rows2 className="h-3.5 w-3.5" />
                </button>
                <button
                  type="button"
                  onClick={() => toggleModalFormat("horizontal")}
                  title="Horizontal side-by-side layout"
                  className={`p-1.5 rounded-md transition-colors cursor-pointer ${
                    modalFormat === "horizontal"
                      ? "bg-card text-foreground shadow-2xs font-semibold"
                      : "text-muted-foreground hover:text-foreground"
                  }`}
                >
                  <Columns2 className="h-3.5 w-3.5" />
                </button>
              </div>
            </div>
          </div>
        </DialogHeader>

        {error && (
          <div className="p-2.5 rounded-lg border border-destructive/20 bg-destructive/10 text-destructive text-xs flex items-center gap-2">
            <AlertCircle className="h-4 w-4 shrink-0" />
            <span>{error}</span>
          </div>
        )}

        <form onSubmit={handleCreate} className="flex flex-col flex-1 min-h-0 overflow-hidden">
          <div className="overflow-y-auto flex-1 pr-1.5 py-2">
            {modalFormat === "horizontal" ? (
              <div className="grid grid-cols-1 md:grid-cols-2 gap-5">
                {/* Left Column: Quick Presets, Collection Name, Filter Field & Rule Value */}
                <div className="space-y-3.5">
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

                  {/* Collection Name */}
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

                  {/* Filter Field & Rule Value */}
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
                </div>

                {/* Right Column: Live Badge Preview, Icon Picker, Color Palette */}
                <div className="space-y-3.5">
                  {/* Live Badge Preview Card */}
                  <div className="p-2.5 rounded-xl border border-border bg-secondary/30 flex items-center gap-3">
                    <div
                      className="h-9 w-9 rounded-lg flex items-center justify-center border border-border shrink-0 shadow-2xs"
                      style={{ backgroundColor: `${color}20` }}
                    >
                      <FolderIconRenderer icon={icon} className="h-4.5 w-4.5" color={color} />
                    </div>
                    <div className="min-w-0">
                      <div className="text-xs font-semibold text-foreground truncate">
                        {name || "Collection Preview"}
                      </div>
                      <div className="text-[11px] text-muted-foreground truncate">
                        Rule: {ruleField} = {ruleValue || "(any)"}
                      </div>
                    </div>
                  </div>

                  {/* Icon Picker */}
                  <div className="space-y-1.5">
                    <label className="text-xs font-medium text-foreground">Collection Icon</label>
                    <IconSearchPicker selectedIcon={icon} onSelectIcon={setIcon} />
                  </div>

                  {/* Color Palette Selector */}
                  <div className="space-y-1.5">
                    <div className="flex items-center justify-between">
                      <label className="text-xs font-medium text-foreground">Theme Color</label>
                      <div className="flex items-center gap-1.5">
                        <button
                          type="button"
                          onClick={handleRandomColor}
                          className="h-6 px-2 rounded-md bg-secondary border border-border text-[11px] font-medium text-foreground hover:bg-muted flex items-center gap-1 cursor-pointer transition-colors shadow-2xs"
                          title="Generate random color"
                        >
                          <Sparkles className="h-3 w-3 text-primary" />
                          <span>Random</span>
                        </button>
                        <button
                          type="button"
                          onClick={handleResetColor}
                          className="h-6 px-2 rounded-md bg-secondary border border-border text-[11px] font-medium text-foreground hover:bg-muted flex items-center gap-1 cursor-pointer transition-colors shadow-2xs"
                          title="Reset color to default"
                        >
                          <RotateCcw className="h-3 w-3 text-muted-foreground" />
                          <span>Reset</span>
                        </button>
                      </div>
                    </div>
                    <div className="grid grid-cols-8 gap-1.5 p-2 bg-secondary/50 rounded-xl border border-border">
                      {COLOR_PALETTE.map((c) => {
                        const isSelected = color === c.value;
                        return (
                          <button
                            key={c.value}
                            type="button"
                            onClick={() => setColor(c.value)}
                            title={c.name}
                            className={`h-6 w-6 rounded-lg transition-all cursor-pointer flex items-center justify-center ${
                              isSelected
                                ? "scale-110 shadow-xs ring-2 ring-primary ring-offset-2 ring-offset-background"
                                : "hover:scale-105 opacity-80 hover:opacity-100"
                            }`}
                            style={{ backgroundColor: c.value }}
                          >
                            {isSelected && <Check className="h-3 w-3 text-white drop-shadow-xs" />}
                          </button>
                        );
                      })}
                    </div>
                  </div>
                </div>
              </div>
            ) : (
              /* Vertical Stacked Layout */
              <div className="space-y-3.5 text-xs">
                {/* Live Badge Preview Card */}
                <div className="p-2.5 rounded-xl border border-border bg-secondary/30 flex items-center gap-3">
                  <div
                    className="h-9 w-9 rounded-lg flex items-center justify-center border border-border shrink-0 shadow-2xs"
                    style={{ backgroundColor: `${color}20` }}
                  >
                    <FolderIconRenderer icon={icon} className="h-4.5 w-4.5" color={color} />
                  </div>
                  <div className="min-w-0">
                    <div className="text-xs font-semibold text-foreground truncate">
                      {name || "Collection Preview"}
                    </div>
                    <div className="text-[11px] text-muted-foreground truncate">
                      Rule: {ruleField} = {ruleValue || "(any)"}
                    </div>
                  </div>
                </div>

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

                {/* Collection Name */}
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

                {/* Filter Field & Rule Value */}
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

                {/* Icon Picker */}
                <div className="space-y-1.5">
                  <label className="text-xs font-medium text-foreground">Collection Icon</label>
                  <IconSearchPicker selectedIcon={icon} onSelectIcon={setIcon} />
                </div>

                {/* Color Palette Selector */}
                <div className="space-y-1.5">
                  <div className="flex items-center justify-between">
                    <label className="text-xs font-medium text-foreground">Theme Color</label>
                    <div className="flex items-center gap-1.5">
                      <button
                        type="button"
                        onClick={handleRandomColor}
                        className="h-6 px-2 rounded-md bg-secondary border border-border text-[11px] font-medium text-foreground hover:bg-muted flex items-center gap-1 cursor-pointer transition-colors shadow-2xs"
                        title="Generate random color"
                      >
                        <Sparkles className="h-3 w-3 text-primary" />
                        <span>Random</span>
                      </button>
                      <button
                        type="button"
                        onClick={handleResetColor}
                        className="h-6 px-2 rounded-md bg-secondary border border-border text-[11px] font-medium text-foreground hover:bg-muted flex items-center gap-1 cursor-pointer transition-colors shadow-2xs"
                        title="Reset color to default"
                      >
                        <RotateCcw className="h-3 w-3 text-muted-foreground" />
                        <span>Reset</span>
                      </button>
                    </div>
                  </div>
                  <div className="grid grid-cols-8 gap-1.5 p-2 bg-secondary/50 rounded-xl border border-border">
                    {COLOR_PALETTE.map((c) => {
                      const isSelected = color === c.value;
                      return (
                        <button
                          key={c.value}
                          type="button"
                          onClick={() => setColor(c.value)}
                          title={c.name}
                          className={`h-6 w-6 rounded-lg transition-all cursor-pointer flex items-center justify-center ${
                            isSelected
                              ? "scale-110 shadow-xs ring-2 ring-primary ring-offset-2 ring-offset-background"
                              : "hover:scale-105 opacity-80 hover:opacity-100"
                          }`}
                          style={{ backgroundColor: c.value }}
                        >
                          {isSelected && <Check className="h-3 w-3 text-white drop-shadow-xs" />}
                        </button>
                      );
                    })}
                  </div>
                </div>
              </div>
            )}
          </div>

          {/* Fixed Footer */}
          <div className="flex items-center justify-end gap-2 pt-3 border-t border-border mt-2">
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

