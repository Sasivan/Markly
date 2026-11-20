"use client";

import * as React from "react";

interface GlobalPasteListenerProps {
  onUrlPasted: (url: string) => void;
}

export function GlobalPasteListener({ onUrlPasted }: GlobalPasteListenerProps) {
  React.useEffect(() => {
    const handlePaste = (e: ClipboardEvent) => {
      // Don't intercept if user is typing inside an active input or textarea
      const target = e.target as HTMLElement;
      if (target && (target.tagName === "INPUT" || target.tagName === "TEXTAREA" || target.isContentEditable)) {
        return;
      }

      const text = e.clipboardData?.getData("text/plain")?.trim();
      if (!text) return;

      // Check if pasted string looks like a URL (starts with http:// or https:// or has a valid domain pattern)
      const urlPattern = /^(https?:\/\/)?([a-zA-Z0-9-]+\.)+[a-zA-Z]{2,}(\/[^\s]*)?$/i;

      if (urlPattern.test(text) || text.startsWith("http://") || text.startsWith("https://")) {
        e.preventDefault();
        onUrlPasted(text);
      }
    };

    window.addEventListener("paste", handlePaste);
    return () => window.removeEventListener("paste", handlePaste);
  }, [onUrlPasted]);

  return null;
}

