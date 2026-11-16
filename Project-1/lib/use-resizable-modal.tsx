"use client";

import * as React from "react";

export type ModalResizeDirection =
  | "right"
  | "left"
  | "bottom"
  | "top"
  | "corner"
  | "top-left"
  | "top-right"
  | "bottom-left"
  | "bottom-right";

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
  defaultVerticalWidth = 520,
  defaultHorizontalWidth = 840,
  defaultVerticalHeight = 580,
  defaultHorizontalHeight = 540,
  minWidth = 380,
  minHeight = 320,
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
  const [isResizing, setIsResizing] = React.useState<ModalResizeDirection | null>(null);
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

  const startResize = (type: ModalResizeDirection, e: React.MouseEvent) => {
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
      const maxWidth = typeof window !== "undefined" ? Math.min(window.innerWidth * 0.94, 1200) : 960;
      const maxHeight = typeof window !== "undefined" ? Math.min(window.innerHeight * 0.90, 850) : 600;

      // Horizontal resize (right vs left)
      if (
        isResizing === "right" ||
        isResizing === "corner" ||
        isResizing === "bottom-right" ||
        isResizing === "top-right"
      ) {
        const deltaX = e.clientX - dragRef.current.startX;
        const nextW = Math.min(maxWidth, Math.max(minWidth, dragRef.current.startWidth + deltaX * 2));
        setCustomWidth(Math.round(nextW));
      } else if (
        isResizing === "left" ||
        isResizing === "bottom-left" ||
        isResizing === "top-left"
      ) {
        const deltaX = dragRef.current.startX - e.clientX;
        const nextW = Math.min(maxWidth, Math.max(minWidth, dragRef.current.startWidth + deltaX * 2));
        setCustomWidth(Math.round(nextW));
      }

      // Vertical resize (bottom vs top)
      if (
        isResizing === "bottom" ||
        isResizing === "corner" ||
        isResizing === "bottom-right" ||
        isResizing === "bottom-left"
      ) {
        const deltaY = e.clientY - dragRef.current.startY;
        const nextH = Math.min(maxHeight, Math.max(minHeight, dragRef.current.startHeight + deltaY * 2));
        setCustomHeight(Math.round(nextH));
      } else if (
        isResizing === "top" ||
        isResizing === "top-left" ||
        isResizing === "top-right"
      ) {
        const deltaY = dragRef.current.startY - e.clientY;
        const nextH = Math.min(maxHeight, Math.max(minHeight, dragRef.current.startHeight + deltaY * 2));
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
    width: typeof window !== "undefined" ? `min(${effectiveWidth}px, 94vw)` : `${effectiveWidth}px`,
    height: typeof window !== "undefined" ? `min(${effectiveHeight}px, 90vh)` : `${effectiveHeight}px`,
    maxWidth: "94vw",
    maxHeight: "90vh",
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
 * Reusable 8-Directional Resize Handles Component for Dialogs
 */
export function ModalResizeHandles({
  onStartResize,
}: {
  onStartResize: (type: ModalResizeDirection, e: React.MouseEvent) => void;
}) {
  return (
    <>
      {/* Right border drag handle (East) */}
      <div
        onMouseDown={(e) => onStartResize("right", e)}
        title="Drag right border to resize width"
        className="absolute top-2 -right-1 bottom-2 w-3 cursor-ew-resize hover:bg-primary/30 active:bg-primary/50 transition-colors z-50 select-none"
      />
      {/* Left border drag handle (West) */}
      <div
        onMouseDown={(e) => onStartResize("left", e)}
        title="Drag left border to resize width"
        className="absolute top-2 -left-1 bottom-2 w-3 cursor-ew-resize hover:bg-primary/30 active:bg-primary/50 transition-colors z-50 select-none"
      />
      {/* Bottom border drag handle (South) */}
      <div
        onMouseDown={(e) => onStartResize("bottom", e)}
        title="Drag bottom border to resize height"
        className="absolute -bottom-1 left-2 right-2 h-3 cursor-ns-resize hover:bg-primary/30 active:bg-primary/50 transition-colors z-50 select-none"
      />
      {/* Top border drag handle (North) */}
      <div
        onMouseDown={(e) => onStartResize("top", e)}
        title="Drag top border to resize height"
        className="absolute -top-1 left-2 right-2 h-3 cursor-ns-resize hover:bg-primary/30 active:bg-primary/50 transition-colors z-50 select-none"
      />

      {/* Bottom-right corner drag handle (South-East) */}
      <div
        onMouseDown={(e) => onStartResize("bottom-right", e)}
        title="Drag bottom-right corner to freely resize width and height"
        className="absolute -bottom-1 -right-1 w-5 h-5 cursor-nwse-resize hover:bg-primary/40 active:bg-primary/60 transition-colors z-50 flex items-end justify-end p-0.5 select-none"
      >
        <svg className="w-2.5 h-2.5 text-muted-foreground/60 pointer-events-none" viewBox="0 0 6 6" fill="none">
          <path d="M5 1L1 5M5 3L3 5M5 5H5.01" stroke="currentColor" strokeWidth="1" strokeLinecap="round" />
        </svg>
      </div>

      {/* Bottom-left corner drag handle (South-West) */}
      <div
        onMouseDown={(e) => onStartResize("bottom-left", e)}
        title="Drag bottom-left corner to freely resize width and height"
        className="absolute -bottom-1 -left-1 w-5 h-5 cursor-nesw-resize hover:bg-primary/40 active:bg-primary/60 transition-colors z-50 flex items-end justify-start p-0.5 select-none"
      >
        <svg className="w-2.5 h-2.5 text-muted-foreground/60 pointer-events-none" viewBox="0 0 6 6" fill="none">
          <path d="M1 1L5 5M1 3L3 5M1 5H1.01" stroke="currentColor" strokeWidth="1" strokeLinecap="round" />
        </svg>
      </div>

      {/* Top-right corner drag handle (North-East) */}
      <div
        onMouseDown={(e) => onStartResize("top-right", e)}
        title="Drag top-right corner to freely resize width and height"
        className="absolute -top-1 -right-1 w-5 h-5 cursor-nesw-resize hover:bg-primary/40 active:bg-primary/60 transition-colors z-50 flex items-start justify-end p-0.5 select-none"
      >
        <svg className="w-2.5 h-2.5 text-muted-foreground/60 pointer-events-none" viewBox="0 0 6 6" fill="none">
          <path d="M5 5L1 1M5 3L3 1M5 1H5.01" stroke="currentColor" strokeWidth="1" strokeLinecap="round" />
        </svg>
      </div>

      {/* Top-left corner drag handle (North-West) */}
      <div
        onMouseDown={(e) => onStartResize("top-left", e)}
        title="Drag top-left corner to freely resize width and height"
        className="absolute -top-1 -left-1 w-5 h-5 cursor-nwse-resize hover:bg-primary/40 active:bg-primary/60 transition-colors z-50 flex items-start justify-start p-0.5 select-none"
      >
        <svg className="w-2.5 h-2.5 text-muted-foreground/60 pointer-events-none" viewBox="0 0 6 6" fill="none">
          <path d="M1 5L5 1M1 3L3 1M1 1H1.01" stroke="currentColor" strokeWidth="1" strokeLinecap="round" />
        </svg>
      </div>
    </>
  );
}
