import * as React from "react";
import { cn } from "@/lib/utils";

export function Skeleton({
  className,
  children,
  ...props
}: React.HTMLAttributes<HTMLDivElement>) {
  return (
    <div
      data-skullet-bar=""
      aria-hidden="true"
      className={cn(
        "relative overflow-hidden rounded-md bg-secondary",
        className
      )}
      {...props}
    >
      <div className="absolute inset-0 -translate-x-full animate-[shimmer_1.6s_infinite] bg-gradient-to-r from-transparent via-foreground/[0.06] to-transparent" />
      {children}
    </div>
  );
}

// Skullet smart primitives
export { Skeleton as SmartSkeleton, SkeletonBox } from "skullet/react";
