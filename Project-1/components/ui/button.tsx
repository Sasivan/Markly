import * as React from "react";
import { cva, type VariantProps } from "class-variance-authority";
import { cn } from "@/lib/utils";

const buttonVariants = cva(
  "inline-flex items-center justify-center gap-1.5 whitespace-nowrap rounded-lg text-xs font-semibold transition-all duration-150 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring disabled:pointer-events-none disabled:opacity-50 select-none cursor-pointer active:translate-y-0.5",
  {
    variants: {
      variant: {
        default:
          "bg-blue-600 text-white shadow-sm hover:bg-blue-700 active:bg-blue-800 border-b-2 border-blue-800",
        destructive:
          "bg-rose-600 text-white shadow-sm hover:bg-rose-700 active:bg-rose-800 border-b-2 border-rose-800",
        outline:
          "border border-slate-300 dark:border-neutral-700 bg-white dark:bg-[#202020] text-slate-800 dark:text-neutral-100 shadow-xs hover:bg-slate-100 dark:hover:bg-[#2a2a2a] hover:border-slate-400 dark:hover:border-neutral-600",
        secondary:
          "bg-slate-100 dark:bg-neutral-800 text-slate-900 dark:text-neutral-100 hover:bg-slate-200 dark:hover:bg-neutral-700 border border-slate-200 dark:border-neutral-700",
        ghost: "hover:bg-slate-100 dark:hover:bg-neutral-800 text-slate-700 dark:text-neutral-300 hover:text-slate-900 dark:hover:text-white",
        link: "text-blue-600 dark:text-blue-400 underline-offset-4 hover:underline",
        tactile:
          "bg-white dark:bg-neutral-800 text-slate-900 dark:text-white border-2 border-slate-300 dark:border-neutral-700 shadow-sm hover:border-blue-500 hover:text-blue-600 dark:hover:border-blue-400 active:shadow-xs",
        cinder:
          "bg-slate-900 dark:bg-neutral-900 text-white border border-slate-700 shadow-sm hover:bg-black hover:border-slate-500",
      },
      size: {
        default: "h-8 px-3.5 py-1.5",
        sm: "h-7 rounded-md px-2.5 text-xs",
        lg: "h-9 rounded-lg px-4 text-sm",
        icon: "h-7 w-7 p-0",
      },
    },
    defaultVariants: {
      variant: "default",
      size: "default",
    },
  }
);

export interface ButtonProps
  extends React.ButtonHTMLAttributes<HTMLButtonElement>,
    VariantProps<typeof buttonVariants> {
  asChild?: boolean;
}

export const Button = React.forwardRef<HTMLButtonElement, ButtonProps>(
  ({ className, variant, size, ...props }, ref) => {
    return (
      <button
        className={cn(buttonVariants({ variant, size, className }))}
        ref={ref}
        {...props}
      />
    );
  }
);
Button.displayName = "Button";
