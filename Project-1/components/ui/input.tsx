import * as React from "react";
import { cn } from "@/lib/utils";

export interface InputProps extends React.InputHTMLAttributes<HTMLInputElement> {}

export const Input = React.forwardRef<HTMLInputElement, InputProps>(
  ({ className, type, ...props }, ref) => {
    return (
      <input
        type={type}
        className={cn(
          "flex h-8 w-full rounded-md border border-input bg-card px-2.5 py-1 text-xs text-foreground",
          "shadow-[inset_0_1px_0_rgba(0,0,0,0.02)]",
          "transition-[border-color,box-shadow,background-color] duration-150 ease-out",
          "placeholder:text-muted-foreground/80",
          "hover:border-border-strong",
          "focus-visible:outline-none focus-visible:border-primary/60 focus-visible:ring-2 focus-visible:ring-primary/20",
          "disabled:cursor-not-allowed disabled:opacity-50 disabled:bg-muted",
          "aria-[invalid=true]:border-destructive aria-[invalid=true]:focus-visible:ring-destructive/25",
          className
        )}
        ref={ref}
        {...props}
      />
    );
  }
);
Input.displayName = "Input";

export const Textarea = React.forwardRef<
  HTMLTextAreaElement,
  React.TextareaHTMLAttributes<HTMLTextAreaElement>
>(({ className, ...props }, ref) => {
  return (
    <textarea
      className={cn(
        "flex w-full rounded-md border border-input bg-card px-2.5 py-2 text-xs text-foreground",
        "transition-[border-color,box-shadow] duration-150 ease-out",
        "placeholder:text-muted-foreground/80 hover:border-border-strong",
        "focus-visible:outline-none focus-visible:border-primary/60 focus-visible:ring-2 focus-visible:ring-primary/20",
        "disabled:cursor-not-allowed disabled:opacity-50",
        className
      )}
      ref={ref}
      {...props}
    />
  );
});
Textarea.displayName = "Textarea";

export const Select = React.forwardRef<
  HTMLSelectElement,
  React.SelectHTMLAttributes<HTMLSelectElement>
>(({ className, ...props }, ref) => {
  return (
    <select
      ref={ref}
      className={cn(
        "h-8 w-full rounded-md border border-input bg-card px-2 text-xs text-foreground",
        "transition-[border-color,box-shadow] duration-150 ease-out",
        "hover:border-border-strong",
        "focus-visible:outline-none focus-visible:border-primary/60 focus-visible:ring-2 focus-visible:ring-primary/20",
        "disabled:cursor-not-allowed disabled:opacity-50",
        className
      )}
      {...props}
    />
  );
});
Select.displayName = "Select";

export const Label = React.forwardRef<
  HTMLLabelElement,
  React.LabelHTMLAttributes<HTMLLabelElement>
>(({ className, ...props }, ref) => (
  <label
    ref={ref}
    className={cn(
      "text-2xs font-medium text-muted-foreground select-none",
      className
    )}
    {...props}
  />
));
Label.displayName = "Label";
