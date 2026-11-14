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
      className={cn(
        "relative overflow-hidden rounded-md bg-slate-200/70 dark:bg-neutral-800/80",
        className
      )}
      {...props}
    >
      <div className="absolute inset-0 -translate-x-full animate-[shimmer_1.5s_infinite] bg-gradient-to-r from-transparent via-white/25 dark:via-white/10 to-transparent" />
      {children}
    </div>
  );
}

// Skullet smart primitives
export { Skeleton as SmartSkeleton, SkeletonBox } from "skullet/react";

