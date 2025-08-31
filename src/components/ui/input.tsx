import { cn } from "../utils";
import type { ComponentProps } from "react";

export function Input(props: ComponentProps<"input">) {
  return (
    <input
      {...props}
      className={cn(
        "w-full rounded-2xl border border-neutral-300 px-3 py-2 text-sm outline-none focus:ring-2 focus:ring-neutral-300",
        props.className
      )}
    />
  );
}
