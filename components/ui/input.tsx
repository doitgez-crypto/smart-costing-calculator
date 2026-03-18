"use client";

import * as React from "react";
import { cn } from "@/components/ui/utils";

export type InputProps = React.InputHTMLAttributes<HTMLInputElement>;

export const Input = React.forwardRef<HTMLInputElement, InputProps>(
  ({ className, type, ...props }, ref) => {
    return (
      <input
        ref={ref}
        type={type}
        className={cn(
          "flex h-10 w-full rounded-xl border border-border bg-white px-3 py-2 text-sm ring-offset-background placeholder:text-gray-400 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-primary focus-visible:shadow-[0_0_0_4px_rgba(37,99,235,0.18)] disabled:cursor-not-allowed disabled:opacity-60 text-right",
          className
        )}
        {...props}
      />
    );
  }
);
Input.displayName = "Input";

