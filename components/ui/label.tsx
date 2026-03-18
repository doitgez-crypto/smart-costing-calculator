import * as React from "react";
import { cn } from "@/components/ui/utils";

export function Label({
  className,
  ...props
}: React.LabelHTMLAttributes<HTMLLabelElement>) {
  return (
    <label
      className={cn("text-sm font-medium text-gray-800 block mb-1", className)}
      {...props}
    />
  );
}

