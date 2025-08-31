import { cn } from "../utils";
import type { ButtonHTMLAttributes } from "react";


type Props = ButtonHTMLAttributes<HTMLButtonElement> & {
  variant?: "default" | "outline";
};

export function Button({ className, variant = "default", ...props }: Props) {
  const base =
    "inline-flex items-center justify-center rounded-2xl px-4 py-2 text-sm font-medium transition shadow-soft active:scale-[.98]";
  const variants = {
    default: "bg-black text-white hover:opacity-90",
    outline: "border border-neutral-300 bg-white text-neutral-900 hover:bg-neutral-50",
  };
  return <button className={cn(base, variants[variant], className)} {...props} />;
}
