"use client";

export default function ErrorClientPage({
  error,
  reset,
}: {
  error: Error & { digest?: string };
  reset: () => void;
}) {
  return (
    <div className="max-w-3xl mx-auto px-4 py-10">
      <h1 className="hero">Client page error</h1>
      <p className="text-muted mt-2">
        The client dashboard hit a runtime error. Nothing was uploaded. Below is the exact message so we can fix it quickly.
      </p>

      <div className="card p-4 mt-4">
        <pre className="text-xs overflow-x-auto whitespace-pre-wrap">
{String(error?.message || "Unknown error")}
{error?.stack ? "\n\n" + error.stack : ""}
        </pre>
      </div>

      <button className="btn mt-4" onClick={() => reset()}>
        Try again
      </button>
    </div>
  );
}
