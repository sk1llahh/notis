import React, { forwardRef } from "react";
import { cn } from "@/shared/lib/utils";

export interface InputProps
  extends React.InputHTMLAttributes<HTMLInputElement> {
  hasError?: boolean;
}

export const Input = forwardRef<HTMLInputElement, InputProps>(function Input(
  { className, type = "text", hasError = false, disabled, ...props },
  ref
) {
  return (
    <input
      type={type}
      ref={ref}
      disabled={disabled}
      className={cn(
        "flex h-10 w-full rounded-md border bg-surface-card px-3.5 py-2 text-sm text-text-primary placeholder:text-text-muted transition-colors",
        "focus:outline-none focus:ring-1",
        hasError
          ? "border-red-500/80 focus:border-red-500 focus:ring-red-500"
          : "border-border-subtle hover:border-border-strong focus:border-border-focus focus:ring-border-focus",
        "disabled:cursor-not-allowed disabled:opacity-50",
        className
      )}
      {...props}
    />
  );
});
