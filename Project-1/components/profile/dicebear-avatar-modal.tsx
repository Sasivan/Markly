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
import { Badge } from "@/components/ui/badge";
import {
  Sparkles,
  Shuffle,
  Upload,
  Check,
  Image as ImageIcon,
  Bot,
  User,
  Palette,
  RotateCcw,
  Trash2,
} from "lucide-react";

interface DicebearAvatarModalProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  currentAvatarUrl: string;
  defaultAvatarUrl?: string;
  onSelectAvatar: (url: string) => void;
}

const DICEBEAR_STYLES = [
  { id: "bottts", name: "Bottts (Robots)", icon: Bot },
  { id: "lorelei", name: "Lorelei (Artistic)", icon: Sparkles },
  { id: "avataaars", name: "Avataaars (Expressive)", icon: User },
  { id: "micah", name: "Micah (Minimal)", icon: Palette },
  { id: "notionists", name: "Notionists (Clean)", icon: User },
  { id: "adventurer", name: "Adventurer (RPG)", icon: Sparkles },
  { id: "identicon", name: "Identicon (Geometric)", icon: Bot },
  { id: "thumbs", name: "Thumbs (Smiles)", icon: Sparkles },
];

const PRESET_SEEDS = [
  "Markly",
  "Atlas",
  "Nova",
  "Pixel",
  "Cosmo",
  "Vortex",
  "Aura",
  "Zenith",
];

export function DicebearAvatarModal({
  open,
  onOpenChange,
  currentAvatarUrl,
  defaultAvatarUrl,
  onSelectAvatar,
}: DicebearAvatarModalProps) {
  const [activeTab, setActiveTab] = React.useState<"dicebear" | "upload">("dicebear");
  const [selectedStyle, setSelectedStyle] = React.useState<string>("bottts");
  const [seed, setSeed] = React.useState<string>("Markly");
  const [customUploadUrl, setCustomUploadUrl] = React.useState<string>("");
  const [uploadError, setUploadError] = React.useState<string | null>(null);
  const fileInputRef = React.useRef<HTMLInputElement | null>(null);

  const fallbackDefault = defaultAvatarUrl || "https://api.dicebear.com/7.x/bottts/svg?seed=Markly";

  const handleResetToDefault = () => {
    onSelectAvatar(fallbackDefault);
    onOpenChange(false);
  };

  // Parse existing DiceBear avatar if applicable
  React.useEffect(() => {
    if (currentAvatarUrl && currentAvatarUrl.includes("dicebear.com/7.x/")) {
      try {
        const parts = currentAvatarUrl.split("dicebear.com/7.x/")[1].split("/");
        const style = parts[0];
        const match = currentAvatarUrl.match(/seed=([^&]+)/);
        if (style && DICEBEAR_STYLES.some((s) => s.id === style)) {
          setSelectedStyle(style);
        }
        if (match && match[1]) {
          setSeed(decodeURIComponent(match[1]));
        }
      } catch {}
    }
  }, [currentAvatarUrl, open]);

  const generatedDicebearUrl = `https://api.dicebear.com/7.x/${selectedStyle}/svg?seed=${encodeURIComponent(
    seed || "Markly"
  )}`;

  const previewUrl = activeTab === "upload" && customUploadUrl ? customUploadUrl : generatedDicebearUrl;

  const handleRandomize = () => {
    const randomSeed = Math.random().toString(36).substring(2, 9);
    setSeed(randomSeed);
  };

  const handleFileUpload = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;

    if (!file.type.startsWith("image/")) {
      setUploadError("Please upload a valid image file (PNG, JPG, SVG, WebP).");
      setTimeout(() => setUploadError(null), 4000);
      return;
    }
    setUploadError(null);

    // Convert file to Base64 Data URL
    const reader = new FileReader();
    reader.onload = (event) => {
      const dataUrl = event.target?.result as string;
      if (dataUrl) {
        setCustomUploadUrl(dataUrl);
        setActiveTab("upload");
      }
    };
    reader.readAsDataURL(file);
  };

  const handleApply = () => {
    const finalUrl = activeTab === "upload" && customUploadUrl ? customUploadUrl : generatedDicebearUrl;
    onSelectAvatar(finalUrl);
    onOpenChange(false);
  };

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="sm:max-w-md p-6 overflow-hidden">
        <DialogHeader className="space-y-1">
          <div className="flex items-center gap-2">
            <div className="h-7 w-7 rounded-lg bg-blue-500/10 text-blue-600 dark:text-blue-400 flex items-center justify-center">
              <Sparkles className="h-4 w-4" />
            </div>
            <DialogTitle className="text-base font-bold text-slate-900 dark:text-white">
              Customize Your Avatar
            </DialogTitle>
          </div>
          <DialogDescription className="text-xs text-muted-foreground">
            Choose an illustrated avatar powered by DiceBear or upload your own custom photo.
          </DialogDescription>
        </DialogHeader>

        {/* Tab Selection */}
        <div className="flex items-center gap-1 p-0.5 bg-muted rounded-md mt-2 border border-border">
          <button
            type="button"
            onClick={() => setActiveTab("dicebear")}
            className={`flex-1 flex items-center justify-center gap-1.5 py-1 text-xs font-medium rounded-sm transition-colors cursor-pointer ${
              activeTab === "dicebear"
                ? "bg-card text-foreground shadow-xs"
                : "text-muted-foreground hover:text-foreground"
            }`}
          >
            <Bot className="h-3.5 w-3.5" />
            <span>DiceBear Library</span>
          </button>
          <button
            type="button"
            onClick={() => setActiveTab("upload")}
            className={`flex-1 flex items-center justify-center gap-1.5 py-1 text-xs font-medium rounded-sm transition-colors cursor-pointer ${
              activeTab === "upload"
                ? "bg-card text-foreground shadow-xs"
                : "text-muted-foreground hover:text-foreground"
            }`}
          >
            <Upload className="h-3.5 w-3.5" />
            <span>Upload Image</span>
          </button>
        </div>

        {/* Live Preview Display */}
        <div className="flex items-center gap-4 p-4 rounded-md border border-border bg-card mt-3">
          <div className="relative flex-shrink-0">
            <img
              src={previewUrl}
              alt="Avatar Preview"
              className="h-16 w-16 rounded-full object-cover border border-border bg-secondary"
              onError={(e) => {
                (e.target as HTMLImageElement).src = `https://api.dicebear.com/7.x/initials/svg?seed=Markly`;
              }}
            />
            <span className="absolute bottom-0 right-0 h-3.5 w-3.5 rounded-full bg-emerald-500 border-2 border-background" />
          </div>

          <div className="min-w-0 flex-1 space-y-1">
            <div className="flex items-center gap-2">
              <span className="text-xs font-semibold text-foreground">Active Preview</span>
              <Badge variant="outline" className="text-xs font-mono px-1.5 py-0 border-border">
                {activeTab === "upload" ? "Custom File" : selectedStyle}
              </Badge>
            </div>
            <p className="text-xs text-muted-foreground truncate font-mono">
              {activeTab === "upload"
                ? customUploadUrl
                  ? "Custom picture ready to apply"
                  : "No image uploaded yet"
                : `Seed: ${seed || "Random"}`}
            </p>
          </div>
        </div>

        {/* DiceBear Tab Content */}
        {activeTab === "dicebear" && (
          <div className="space-y-4 mt-2">
            {/* Style Selector Chips */}
            <div className="space-y-1.5">
              <label className="text-xs font-medium text-foreground">
                Choose Art Style
              </label>
              <div className="grid grid-cols-2 sm:grid-cols-4 gap-1.5">
                {DICEBEAR_STYLES.map((st) => {
                  const Icon = st.icon;
                  const isSelected = selectedStyle === st.id;
                  return (
                    <button
                      key={st.id}
                      type="button"
                      onClick={() => setSelectedStyle(st.id)}
                      className={`flex items-center gap-1.5 p-2 rounded-md text-xs font-medium border text-left transition-colors cursor-pointer ${
                        isSelected
                          ? "border-primary bg-primary/10 text-primary"
                          : "border-border bg-card hover:bg-secondary text-foreground"
                      }`}
                    >
                      <Icon className="h-3.5 w-3.5 flex-shrink-0" />
                      <span className="truncate text-xs font-mono">{st.name.split(" ")[0]}</span>
                    </button>
                  );
                })}
              </div>
            </div>

            {/* Seed & Randomizer */}
            <div className="space-y-1.5">
              <div className="flex items-center justify-between">
                <label className="text-xs font-medium text-foreground">
                  Avatar Seed
                </label>
                <button
                  type="button"
                  onClick={handleRandomize}
                  className="text-xs text-primary hover:underline flex items-center gap-1 cursor-pointer font-medium"
                >
                  <Shuffle className="h-3 w-3" />
                  <span>Roll Random</span>
                </button>
              </div>
              <div className="flex gap-2">
                <Input
                  type="text"
                  value={seed}
                  onChange={(e) => setSeed(e.target.value)}
                  placeholder="Type anything to morph avatar..."
                  className="h-8 text-xs font-mono"
                />
                <Button
                  type="button"
                  variant="outline"
                  size="sm"
                  onClick={handleRandomize}
                  className="h-8 px-2.5 text-xs gap-1.5 flex-shrink-0"
                  title="Generate a random seed"
                >
                  <Shuffle className="h-3 w-3" />
                </Button>
              </div>
            </div>

            {/* Preset Avatar Gallery */}
            <div className="space-y-1.5">
              <label className="text-xs font-medium text-foreground">
                Quick Presets
              </label>
              <div className="grid grid-cols-8 gap-1.5">
                {PRESET_SEEDS.map((presetSeed) => {
                  const url = `https://api.dicebear.com/7.x/${selectedStyle}/svg?seed=${presetSeed}`;
                  const isSelected = seed === presetSeed;
                  return (
                    <button
                      key={presetSeed}
                      type="button"
                      onClick={() => setSeed(presetSeed)}
                      className={`h-9 w-9 rounded-md border p-1 transition-colors flex items-center justify-center cursor-pointer ${
                        isSelected
                          ? "border-primary bg-primary/10"
                          : "border-border bg-card hover:bg-secondary"
                      }`}
                      title={`Select ${presetSeed}`}
                    >
                      <img src={url} alt={presetSeed} className="h-full w-full object-contain" />
                    </button>
                  );
                })}
              </div>
            </div>
          </div>
        )}

        {/* Upload Tab Content */}
        {activeTab === "upload" && (
          <div className="space-y-4 mt-2">
            <input
              ref={fileInputRef}
              type="file"
              accept="image/*"
              className="hidden"
              onChange={handleFileUpload}
            />

            <div
              onClick={() => fileInputRef.current?.click()}
              className="border border-dashed border-border hover:border-primary/60 rounded-md p-5 text-center cursor-pointer transition-colors bg-secondary/30 hover:bg-secondary/50 group"
            >
              <div className="h-9 w-9 rounded-md bg-secondary text-foreground mx-auto flex items-center justify-center mb-2 border border-border">
                <Upload className="h-4 w-4" />
              </div>
              <p className="text-xs font-medium text-foreground">
                Click to browse and upload an image
              </p>
              <p className="text-xs text-muted-foreground font-mono mt-0.5">
                Supports PNG, JPG, GIF, WebP, or SVG (max 5MB)
              </p>
            </div>

            {uploadError && (
              <p className="text-xs text-destructive font-medium bg-destructive/10 p-2 rounded-lg border border-destructive/20 animate-in fade-in">
                {uploadError}
              </p>
            )}

            <div className="space-y-1">
              <label className="text-xs font-medium text-foreground">
                Or paste image URL directly
              </label>
              <Input
                type="url"
                value={customUploadUrl}
                onChange={(e) => setCustomUploadUrl(e.target.value)}
                placeholder="https://example.com/avatar.png"
                className="h-8 text-xs font-mono"
              />
            </div>
          </div>
        )}

        {/* Dialog Actions */}
        <div className="flex items-center justify-between gap-2 mt-4 pt-3 border-t border-slate-100 dark:border-neutral-800">
          <Button
            type="button"
            variant="ghost"
            size="sm"
            onClick={handleResetToDefault}
            className="text-xs h-8 px-2.5 text-rose-600 dark:text-rose-400 hover:bg-rose-50 dark:hover:bg-rose-950/40 cursor-pointer flex items-center gap-1.5"
            title="Remove custom avatar and reset to default"
          >
            <RotateCcw className="h-3.5 w-3.5" />
            <span>Remove / Reset</span>
          </Button>

          <div className="flex items-center gap-2">
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
              type="button"
              size="sm"
              onClick={handleApply}
              className="text-xs h-8 px-4 bg-blue-600 hover:bg-blue-700 text-white font-semibold cursor-pointer flex items-center gap-1.5"
            >
              <Check className="h-3.5 w-3.5" />
              <span>Apply Avatar</span>
            </Button>
          </div>
        </div>
      </DialogContent>
    </Dialog>
  );
}

