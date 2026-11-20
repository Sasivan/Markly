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
  const cleanDomain = React.useMemo(() => {
    return (domain || "")
      .replace(/^https?:\/\//, "")
      .replace(/^www\./, "")
      .split("/")[0]
      .split(":")[0]
      .trim();
  }, [domain]);

  const googleFavicon = cleanDomain
    ? `https://www.google.com/s2/favicons?domain=${cleanDomain}&sz=64`
    : null;

  const defaultFallback = React.useMemo(
    () => getInterestingDefaultIcon(cleanDomain, alt),
    [cleanDomain, alt]
  );

  // Stage 0: Custom / scraped icon
  // Stage 1: Google Favicon CDN
  // Stage 2: Themed SVG default fallback
  const [stage, setStage] = React.useState<number>(
    src && !src.startsWith("/icons/avatar-") ? 0 : googleFavicon ? 1 : 2
  );

  React.useEffect(() => {
    setStage(src && !src.startsWith("/icons/avatar-") ? 0 : googleFavicon ? 1 : 2);
  }, [src, googleFavicon]);

  const activeSrc =
    stage === 0 && src
      ? src
      : stage === 1 && googleFavicon
      ? googleFavicon
      : defaultFallback;

  return (
    <img
      src={activeSrc}
      alt={alt || cleanDomain || "Icon"}
      className={className}
      loading="lazy"
      onError={() => {
        setStage((prev) => {
          if (prev === 0 && googleFavicon) return 1;
          return 2;
        });
      }}
    />
  );
}
