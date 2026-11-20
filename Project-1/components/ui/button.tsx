import * as React from "react";
import { cva, type VariantProps } from "class-variance-authority";
import { cn } from "@/lib/utils";

const buttonVariants = cva(
  [
    "inline-flex items-center justify-center gap-1.5 whitespace-nowrap rounded-md",
    "text-xs font-medium leading-none",
    "transition-[background-color,border-color,color,box-shadow,transform] duration-150 ease-out",
    "focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring/45 focus-visible:ring-offset-1 focus-visible:ring-offset-background",
    "disabled:pointer-events-none disabled:opacity-45",
    "select-none cursor-pointer active:translate-y-px",
  ].join(" "),
  {
    variants: {
      variant: {
        default:
          "bg-primary text-primary-foreground shadow-surface hover:bg-primary/92",
        destructive:
          "bg-destructive text-destructive-foreground shadow-surface hover:bg-destructive/90",
        outline:
          "border border-border bg-card text-foreground hover:border-border-strong hover:bg-secondary/70",
        secondary:
          "bg-secondary text-secondary-foreground border border-transparent hover:bg-secondary/75",
        ghost:
          "text-muted-foreground hover:bg-accent hover:text-foreground",
        link:
          "text-primary underline-offset-4 hover:underline p-0 h-auto",
        tactile:
          "bg-card text-foreground border border-border hover:border-primary/45 hover:text-primary",
        cinder:
          "bg-foreground text-background hover:bg-foreground/90 border border-foreground/10",
      },
      size: {
        default: "h-8 px-3 py-1.5",
        sm: "h-7 rounded-sm px-2.5 text-2xs",
        lg: "h-9 rounded-md px-4 text-sm",
        icon: "h-8 w-8 p-0",
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

export { buttonVariants };
