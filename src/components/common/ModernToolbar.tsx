import React from "react";
import { cn } from "@/lib/utils";

interface ModernToolbarProps {
  children: React.ReactNode;
  className?: string;
}

export function ModernToolbar({ children, className }: ModernToolbarProps) {
  return (
    <div
      className={cn(
        "flex items-center justify-between gap-4 p-3 bg-muted/50 backdrop-blur-sm border border-border/50 rounded-lg shadow-sm transition-all duration-200 hover:shadow-md",
        className
      )}
    >
      {children}
    </div>
  );
}

interface ModernToolbarSectionProps {
  children: React.ReactNode;
  className?: string;
}

export function ModernToolbarSection({ children, className }: ModernToolbarSectionProps) {
  return (
    <div className={cn("flex items-center gap-2 flex-wrap", className)}>
      {children}
    </div>
  );
}
