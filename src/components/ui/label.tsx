import type { ComponentProps } from "react";
import { cn } from "../utils";

export function Label({ className, ...props }: ComponentProps<"label">) {
  return (
    <label className={cn("mb-1 block text-sm font-medium", className)} {...props} />
  );
}
