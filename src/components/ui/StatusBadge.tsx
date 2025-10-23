"use client";

export default function StatusBadge({ status }: { status: "active" | "revoked" | string }) {
  const normalized = (status || "").toLowerCase();
  const ok = normalized === "active";
  return (
    <span className="badge">
      <span
        className={`inline-block h-2 w-2 rounded-full ${ok ? "bg-[color:var(--accent-2)]" : "bg-[color:var(--danger)]"}`}
        aria-hidden
      />
      {ok ? "Active" : "Revoked"}
    </span>
  );
}
