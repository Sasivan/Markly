"use client";

import * as React from "react";
import { UniversalColorPicker } from "@/components/ui/universal-color-picker";
import { UniversalIconPicker } from "@/components/ui/universal-icon-picker";

export function ThemeAccentPicker() {
  const [accentColor, setAccentColor] = React.useState<string>("#2563eb");
  const [iconCollection, setIconCollection] = React.useState<string>("layers");

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

      const savedIcon = localStorage.getItem("markly_icon_collection_choice");
      if (savedIcon) {
        setIconCollection(savedIcon);
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
    setIconCollection(iconName);
    try {
      localStorage.setItem("markly_icon_collection_choice", iconName);
      window.dispatchEvent(new CustomEvent("markly-icon-collection-changed", { detail: { icon: iconName } }));
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

      {/* Universal Icon Collection Picker (Stays as Icon Collection explorer, independent of website logo) */}
      <UniversalIconPicker
        icon={iconCollection}
        color={accentColor}
        onChange={handleIconChange}
        label="Icon Collection & Universal Glyphs"
      />
    </div>
  );
}
