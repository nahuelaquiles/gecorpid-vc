import { ReactNode } from "react";
import { cn } from "../utils";

export function Card({ className, children }: { className?: string; children: ReactNode }) {
  return (
    <div className={cn("rounded-2xl border border-neutral-200 p-5 shadow-soft bg-white", className)}>
      {children}
    </div>
  );
}

export function CardTitle({ children }: { children: ReactNode }) {
  return <h2 className="text-lg font-semibold mb-2">{children}</h2>;
}

export function CardDescription({ children }: { children: ReactNode }) {
  return <p className="text-sm text-neutral-600 mb-4">{children}</p>;
}
