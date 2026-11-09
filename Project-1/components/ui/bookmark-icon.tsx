"use client";

import * as React from "react";

export function getInterestingDefaultIcon(domain: string = "", title: string = ""): string {
  const combined = `${domain} ${title}`.toLowerCase();

  if (
    combined.includes("ai") ||
    combined.includes("gpt") ||
    combined.includes("bot") ||
    combined.includes("model") ||
    combined.includes("neural") ||
    combined.includes("claude") ||
    combined.includes("openai") ||
    combined.includes("gemini") ||
    combined.includes("agent")
  ) {
    return "/icons/default-ai.svg";
  }
  if (
    combined.includes("design") ||
    combined.includes("ui") ||
    combined.includes("ux") ||
    combined.includes("figma") ||
    combined.includes("art") ||
    combined.includes("css") ||
    combined.includes("icon") ||
    combined.includes("font") ||
    combined.includes("color")
  ) {
    return "/icons/default-creative.svg";
  }
  if (
    combined.includes("dev") ||
    combined.includes("tech") ||
    combined.includes("code") ||
    combined.includes("app") ||
    combined.includes("tool") ||
    combined.includes("git") ||
    combined.includes("software") ||
    combined.includes("launch")
  ) {
    return "/icons/default-rocket.svg";
  }
  if (
    combined.includes("api") ||
    combined.includes("cloud") ||
    combined.includes("server") ||
    combined.includes("speed") ||
    combined.includes("fast") ||
    combined.includes("compute")
  ) {
    return "/icons/default-lightning.svg";
  }
  if (
    combined.includes("finance") ||
    combined.includes("crypto") ||
    combined.includes("money") ||
    combined.includes("pay") ||
    combined.includes("shop") ||
    combined.includes("pro")
  ) {
    return "/icons/default-gem.svg";
  }
  if (
    combined.includes("read") ||
    combined.includes("blog") ||
    combined.includes("doc") ||
    combined.includes("news") ||
    combined.includes("book") ||
    combined.includes("paper")
  ) {
    return "/icons/default-bookmark.svg";
  }

  // Deterministic variety based on domain hash
  const fallbacks = [
    "/icons/default-globe.svg",
    "/icons/default-rocket.svg",
    "/icons/default-creative.svg",
    "/icons/default-lightning.svg",
    "/icons/default-ai.svg",
    "/icons/default-gem.svg",
    "/icons/default-bookmark.svg",
  ];
  let hash = 0;
  for (let i = 0; i < domain.length; i++) {
    hash = (hash << 5) - hash + domain.charCodeAt(i);
    hash |= 0;
  }
  return fallbacks[Math.abs(hash) % fallbacks.length];
}

interface BookmarkIconProps {
  src?: string | null;
  alt?: string;
  domain?: string;
  className?: string;
  fallbackClassName?: string;
}

export function BookmarkIcon({
  src,
  alt = "Icon",
  domain = "",
  className = "h-5 w-5 rounded object-contain flex-shrink-0",
}: BookmarkIconProps) {
  const defaultFallback = React.useMemo(() => getInterestingDefaultIcon(domain, alt), [domain, alt]);
  const [hasError, setHasError] = React.useState(false);
  const [currentSrc, setCurrentSrc] = React.useState<string | null>(src || null);

  React.useEffect(() => {
    setCurrentSrc(src || null);
    setHasError(false);
  }, [src]);

  // If we have a valid src and no error, render image
  if (currentSrc && !hasError) {
    return (
      <img
        src={currentSrc}
        alt={alt}
        className={className}
        onError={() => {
          // If custom icon fails, fallback to interesting default icon
          if (currentSrc !== defaultFallback) {
            setCurrentSrc(defaultFallback);
          } else {
            setHasError(true);
          }
        }}
      />
    );
  }

  // If no src or error, render interesting default SVG image backup
  return (
    <img
      src={defaultFallback}
      alt={alt || domain || "Default Icon"}
      className={className}
      onError={() => {
        setHasError(true);
      }}
    />
  );
}
