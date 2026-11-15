"use client";

import * as React from "react";

interface UseResizableModalOptions {
  modalId: string;
  defaultVerticalWidth?: number;
  defaultHorizontalWidth?: number;
  defaultVerticalHeight?: number;
  defaultHorizontalHeight?: number;
  minWidth?: number;
  minHeight?: number;
}

export function useResizableModal({
  modalId,
  defaultVerticalWidth = 560,
  defaultHorizontalWidth = 980,
  defaultVerticalHeight = 680,
  defaultHorizontalHeight = 640,
  minWidth = 420,
  minHeight = 350,
}: UseResizableModalOptions) {
  // 1. Format: vertical vs horizontal
  const [format, setFormat] = React.useState<"vertical" | "horizontal">(() => {
    if (typeof window !== "undefined") {
      try {
        const stored = localStorage.getItem(`markly_modal_format_${modalId}`);
        if (stored === "vertical" || stored === "horizontal") return stored;
        return window.innerWidth >= 1024 ? "horizontal" : "vertical";
      } catch {}
    }
    return "horizontal";
  });

  // 2. Custom dimensions stored in localStorage
  const [customWidth, setCustomWidth] = React.useState<number | null>(() => {
    if (typeof window !== "undefined") {
      try {
        const stored = localStorage.getItem(`markly_modal_w_${modalId}`);
        if (stored) {
          const parsed = parseInt(stored, 10);
          if (!isNaN(parsed) && parsed >= minWidth) return parsed;
        }
      } catch {}
    }
    return null;
  });

  const [customHeight, setCustomHeight] = React.useState<number | null>(() => {
    if (typeof window !== "undefined") {
      try {
        const stored = localStorage.getItem(`markly_modal_h_${modalId}`);
        if (stored) {
          const parsed = parseInt(stored, 10);
          if (!isNaN(parsed) && parsed >= minHeight) return parsed;
        }
      } catch {}
    }
    return null;
  });

  // Change format and persist
  const toggleFormat = (newFormat: "vertical" | "horizontal") => {
    setFormat(newFormat);
    try {
      localStorage.setItem(`markly_modal_format_${modalId}`, newFormat);
    } catch {}
  };

  // Restore defaults
  const handleRestoreDefaults = () => {
    setCustomWidth(null);
    setCustomHeight(null);
    try {
      localStorage.removeItem(`markly_modal_w_${modalId}`);
      localStorage.removeItem(`markly_modal_h_${modalId}`);
    } catch {}
  };

  // Drag Resizing State
  const [isResizing, setIsResizing] = React.useState<"right" | "bottom" | "corner" | null>(null);
  const dragRef = React.useRef<{
    startX: number;
    startY: number;
    startWidth: number;
    startHeight: number;
  }>({ startX: 0, startY: 0, startWidth: 0, startHeight: 0 });

  const currentDefaultWidth = format === "horizontal" ? defaultHorizontalWidth : defaultVerticalWidth;
  const currentDefaultHeight = format === "horizontal" ? defaultHorizontalHeight : defaultVerticalHeight;

  const effectiveWidth = customWidth ?? currentDefaultWidth;
  const effectiveHeight = customHeight ?? currentDefaultHeight;

  const startResize = (type: "right" | "bottom" | "corner", e: React.MouseEvent) => {
    e.preventDefault();
    e.stopPropagation();
    setIsResizing(type);

    dragRef.current = {
      startX: e.clientX,
      startY: e.clientY,
      startWidth: effectiveWidth,
      startHeight: effectiveHeight,
    };
  };

  React.useEffect(() => {
    if (!isResizing) return;

    const handleMouseMove = (e: MouseEvent) => {
      const deltaX = e.clientX - dragRef.current.startX;
      const deltaY = e.clientY - dragRef.current.startY;

      const maxWidth = typeof window !== "undefined" ? window.innerWidth * 0.95 : 1400;
      const maxHeight = typeof window !== "undefined" ? window.innerHeight * 0.92 : 900;

      if (isResizing === "right" || isResizing === "corner") {
        const nextW = Math.min(maxWidth, Math.max(minWidth, dragRef.current.startWidth + deltaX));
        setCustomWidth(Math.round(nextW));
      }

      if (isResizing === "bottom" || isResizing === "corner") {
        const nextH = Math.min(maxHeight, Math.max(minHeight, dragRef.current.startHeight + deltaY));
        setCustomHeight(Math.round(nextH));
      }
    };

    const handleMouseUp = () => {
      setIsResizing(null);
      // Persist to localStorage
      setCustomWidth((w) => {
        if (w !== null) {
          try {
            localStorage.setItem(`markly_modal_w_${modalId}`, String(w));
          } catch {}
        }
        return w;
      });
      setCustomHeight((h) => {
        if (h !== null) {
          try {
            localStorage.setItem(`markly_modal_h_${modalId}`, String(h));
          } catch {}
        }
        return h;
      });
    };

    document.addEventListener("mousemove", handleMouseMove);
    document.addEventListener("mouseup", handleMouseUp);
    return () => {
      document.removeEventListener("mousemove", handleMouseMove);
      document.removeEventListener("mouseup", handleMouseUp);
    };
  }, [isResizing, minWidth, minHeight, modalId]);

  const modalStyle: React.CSSProperties = {
    width: typeof window !== "undefined" ? `min(${effectiveWidth}px, 95vw)` : `${effectiveWidth}px`,
    height: typeof window !== "undefined" ? `min(${effectiveHeight}px, 92vh)` : `${effectiveHeight}px`,
    maxWidth: "95vw",
    maxHeight: "92vh",
  };

  const hasCustomSize = customWidth !== null || customHeight !== null;

  return {
    format,
    toggleFormat,
    effectiveWidth,
    effectiveHeight,
    modalStyle,
    isResizing,
    hasCustomSize,
    handleRestoreDefaults,
    startResize,
  };
}

/**
 * Reusable Resize Handles Component for Dialogs
 */
export function ModalResizeHandles({
  onStartResize,
}: {
  onStartResize: (type: "right" | "bottom" | "corner", e: React.MouseEvent) => void;
}) {
  return (
    <>
      {/* Right border drag handle */}
      <div
        onMouseDown={(e) => onStartResize("right", e)}
        title="Drag right to resize modal width"
        className="absolute top-0 right-0 w-2 h-full cursor-ew-resize hover:bg-primary/30 active:bg-primary/50 transition-colors z-50 select-none"
      />
      {/* Bottom border drag handle */}
      <div
        onMouseDown={(e) => onStartResize("bottom", e)}
        title="Drag bottom to resize modal height"
        className="absolute bottom-0 left-0 w-full h-2 cursor-ns-resize hover:bg-primary/30 active:bg-primary/50 transition-colors z-50 select-none"
      />
      {/* Bottom-right corner drag handle */}
      <div
        onMouseDown={(e) => onStartResize("corner", e)}
        title="Drag corner to resize width and height"
        className="absolute bottom-0 right-0 w-4 h-4 cursor-nwse-resize hover:bg-primary/40 active:bg-primary/60 transition-colors z-50 flex items-end justify-end p-0.5 select-none"
      >
        <svg
          className="w-2.5 h-2.5 text-muted-foreground/60 pointer-events-none"
          viewBox="0 0 6 6"
          fill="none"
          xmlns="http://www.w3.org/2000/svg"
        >
          <path d="M5 1L1 5M5 3L3 5M5 5H5.01" stroke="currentColor" strokeWidth="1" strokeLinecap="round" />
        </svg>
      </div>
    </>
  );
}
