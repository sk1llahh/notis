import React from "react";
import { cn } from "@/shared/lib/utils";

export type BadgeVariant =
  | "default"
  | "outline"
  | "locked"
  | "available"
  | "progress"
  | "completed"
  | "diff";

export type BadgeSize = "sm" | "md";

export interface BadgeProps extends React.HTMLAttributes<HTMLSpanElement> {
  variant?: BadgeVariant;
  size?: BadgeSize;
}

const variantStyles: Record<BadgeVariant, string> = {
  default: "bg-surface-elevated border-border-subtle text-text-primary",
  outline: "bg-transparent border-border-strong text-text-secondary",
  locked: "bg-surface-card border-status-locked/40 text-status-locked",
  available: "bg-status-available/10 border-status-available/30 text-status-available",
  progress: "bg-status-progress/10 border-status-progress/30 text-status-progress",
  completed: "bg-status-completed/10 border-status-completed/30 text-status-completed",
  diff: "bg-status-diff/10 border-status-diff/30 text-status-diff",
};

const sizeStyles: Record<BadgeSize, string> = {
  sm: "text-[10px] py-0.5 px-2 rounded-xs",
  md: "text-xs py-1 px-2.5 rounded-sm",
};

export function Badge({
  className,
  variant = "default",
  size = "md",
  children,
  ...props
}: BadgeProps) {
  return (
    <span
      className={cn(
        "inline-flex items-center gap-1.5 border font-medium leading-none select-none shrink-0 transition-colors",
        variantStyles[variant],
        sizeStyles[size],
        className
      )}
      {...props}
    >
      {children}
    </span>
  );
}
