import * as React from "react";
import { cn } from "@/components/ui/utils";

export function Spinner({
  className
}: {
  className?: string;
}) {
  return (
    <span
      className={cn(
        "inline-block h-4 w-4 animate-spin rounded-full border-2 border-primary/30 border-t-primary",
        className
      )}
      aria-label="טוען"
    />
  );
}

