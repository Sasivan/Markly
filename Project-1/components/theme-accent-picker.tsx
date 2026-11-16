"use client";

import * as React from "react";
import { UniversalColorPicker } from "@/components/ui/universal-color-picker";
import { UniversalIconPicker } from "@/components/ui/universal-icon-picker";

export function ThemeAccentPicker() {
  const [accentColor, setAccentColor] = React.useState<string>("#2563eb");
  const [workspaceIcon, setWorkspaceIcon] = React.useState<string>("sparkles");

  React.useEffect(() => {
    try {
      const savedColor = localStorage.getItem("markly_accent_color");
      const legacyAccent = localStorage.getItem("markly_accent");
      if (savedColor) {
        setAccentColor(savedColor);
        document.documentElement.style.setProperty("--primary", savedColor);
        document.documentElement.style.setProperty("--ring", savedColor);
      } else if (legacyAccent) {
        document.documentElement.setAttribute("data-accent", legacyAccent);
      }

      const savedIcon = localStorage.getItem("markly_workspace_icon");
      if (savedIcon) {
        setWorkspaceIcon(savedIcon);
      }
    } catch {}
  }, []);

  const handleColorChange = (hex: string) => {
    setAccentColor(hex);
    try {
      document.documentElement.style.setProperty("--primary", hex);
      document.documentElement.style.setProperty("--ring", hex);
      localStorage.setItem("markly_accent_color", hex);
      window.dispatchEvent(new CustomEvent("markly-accent-changed", { detail: { color: hex } }));
    } catch {}
  };

  const handleIconChange = (iconName: string) => {
    setWorkspaceIcon(iconName);
    try {
      localStorage.setItem("markly_workspace_icon", iconName);
      window.dispatchEvent(new CustomEvent("markly-icon-changed", { detail: { icon: iconName } }));
    } catch {}
  };

  return (
    <div className="flex items-center gap-1">
      {/* Universal Theme Color Picker */}
      <UniversalColorPicker
        color={accentColor}
        onChange={handleColorChange}
        label="Theme Accent Color (Palettes, Gradients & Custom HSL)"
      />

      {/* Universal Workspace Brand Icon Picker */}
      <UniversalIconPicker
        icon={workspaceIcon}
        color={accentColor}
        onChange={handleIconChange}
        label="Workspace Brand Icon & Glyphs"
      />
    </div>
  );
}
