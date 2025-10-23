"use client";

import React, { useCallback, useEffect, useMemo, useState } from "react";

/* ---------- utils ---------- */

async function sha256HexClient(buf: ArrayBuffer): Promise<string> {
  const digest = await crypto.subtle.digest("SHA-256", buf);
  return [...new Uint8Array(digest)].map((b) => b.toString(16).padStart(2, "0")).join("");
}

type CredentialInfo = {
  sha256: string;
  status: string; // 'active' | 'revoked' | ...
  revoked_at: string | null;
  issued_at: string | null;
  doc_type: string | null;
  tenant_name: string | null;
};

function formatDate(d: string | null) {
  if (!d) return "—";
  const dt = new Date(d);
  return isNaN(dt.getTime()) ? "—" : dt.toLocaleString();
}

/* ---------- page ---------- */

export default function VerifyPage({ params }: { params: { cid: string } }) {
  const cid = params.cid;
  const [cred, setCred] = useState<CredentialInfo | null>(null);
  const [error, setError] = useState<string | null>(null);

  const [filehash, setFilehash] = useState<string | null>(null);
  const [match, setMatch] = useState<boolean | null>(null);
  const [loading, setLoading] = useState(false);
  const [dragActive, setDragActive] = useState(false);

  // fetch credential metadata
  useEffect(() => {
    (async () => {
      try {
        setError(null);
        setCred(null);
        const res = await fetch(`/api/public/credential?cid=${encodeURIComponent(cid)}`, { cache: "no-store" });
        const ct = res.headers.get("content-type") || "";
        const body = ct.includes("application/json") ? await res.json() : { error: await res.text() };
        if (!res.ok) throw new Error((body as any)?.error || "Failed to load credential");
        setCred(body as CredentialInfo);
      } catch (e: any) {
        setError(e?.message || "Failed to load credential");
      }
    })();
  }, [cid]);

  const onPick = useCallback(
    async (file: File) => {
      try {
        setLoading(true);
        setError(null);
        setMatch(null);
        setFilehash(null);

        const buf = await file.arrayBuffer();
        const hash = await sha256HexClient(buf);
        setFilehash(hash);
        if (cred?.sha256) setMatch(hash.toLowerCase() === cred.sha256.toLowerCase());
      } catch (e: any) {
        setError(e?.message || "Hashing failed");
      } finally {
        setLoading(false);
      }
    },
    [cred],
  );

  const onDrop = useCallback(
    (e: React.DragEvent<HTMLLabelElement>) => {
      e.preventDefault();
      e.stopPropagation();
      setDragActive(false);
      const f = e.dataTransfer?.files?.[0];
      if (f) onPick(f);
    },
    [onPick],
  );

  const onChange = useCallback(
    (e: React.ChangeEvent<HTMLInputElement>) => {
      const f = e.target.files?.[0];
      if (f) onPick(f);
    },
    [onPick],
  );

  const issuedAt = useMemo(() => formatDate(cred?.issued_at ?? null), [cred?.issued_at]);
  const revokedAt = useMemo(() => formatDate(cred?.revoked_at ?? null), [cred?.revoked_at]);

  return (
    <div className="relative min-h-screen overflow-hidden bg-slate-950 text-slate-100">
      <div
        className="pointer-events-none absolute inset-0 bg-[radial-gradient(130%_140%_at_15%_10%,rgba(56,189,248,0.16),transparent_55%),radial-gradient(120%_120%_at_85%_-10%,rgba(165,180,252,0.14),transparent_60%),linear-gradient(180deg,#020617,rgba(2,6,23,0.92))]"
        aria-hidden
      />

      {/* Header / hero */}
      <header className="relative mx-auto max-w-6xl px-6 pb-16 pt-20">
        <div className="grid gap-10 rounded-3xl border border-white/10 bg-white/5 p-8 shadow-2xl shadow-black/40 backdrop-blur-lg lg:grid-cols-[1.4fr_1fr] lg:gap-12">
          <div className="max-w-2xl space-y-6">
            <div className="inline-flex items-center gap-2 rounded-full border border-sky-400/40 bg-sky-500/10 px-4 py-1 text-[11px] font-semibold uppercase tracking-[0.28em] text-sky-200">
              Credential verifier
            </div>
            <div className="space-y-4">
              <h1 className="text-4xl font-semibold tracking-tight text-white md:text-5xl">
                Verify the original PDF for <span className="font-mono text-sky-200">CID {cid}</span>
              </h1>
              <p className="text-base text-slate-200/90">
                Scanning the QR brings you here. Drop the PDF that shows that QR. We hash it locally (zero-knowledge) and compare it
                to the digest registered by {cred?.tenant_name || "the issuer"}.
              </p>
            </div>
          </div>

          <div className="grid gap-3 rounded-2xl border border-white/10 bg-slate-900/60 p-6 text-sm text-slate-200">
            <h2 className="text-lg font-semibold text-white">What to expect</h2>
            <ul className="grid gap-3">
              <li className="flex items-start gap-3">
                <span className="mt-0.5 inline-flex h-7 w-7 items-center justify-center rounded-full bg-sky-500 text-xs font-semibold text-white">
                  1
                </span>
                Choose or drag the PDF that displays this QR. The QR itself already points here.
              </li>
              <li className="flex items-start gap-3">
                <span className="mt-0.5 inline-flex h-7 w-7 items-center justify-center rounded-full bg-sky-500 text-xs font-semibold text-white">
                  2
                </span>
                We compute SHA-256 in your browser. The document never leaves your device.
              </li>
              <li className="flex items-start gap-3">
                <span className="mt-0.5 inline-flex h-7 w-7 items-center justify-center rounded-full bg-sky-500 text-xs font-semibold text-white">
                  3
                </span>
                You immediately see whether the document is authentic or altered.
              </li>
            </ul>
          </div>
        </div>
      </header>

      {/* Main */}
      <main className="relative mx-auto flex max-w-6xl flex-col gap-12 px-6 pb-20">
        <section className="grid gap-8 rounded-3xl border border-white/10 bg-white/5 p-8 shadow-2xl shadow-black/40 backdrop-blur lg:grid-cols-[1.45fr_1fr]">
          {/* left: dropzone */}
          <div>
            <div className="flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
              <div className="space-y-1.5">
                <h2 className="text-2xl font-semibold text-white">Upload the sealed PDF</h2>
                <p className="text-sm text-slate-200/80">
                  Use the PDF that displays this QR code. If you received a sealed copy from the issuer, use that file for the most
                  reliable result.
                </p>
              </div>
              <div className="text-[11px] uppercase tracking-[0.24em] text-slate-400">
                Format: <span className="font-semibold text-slate-200">PDF</span>
              </div>
            </div>

            <label
              className={`${
                dragActive ? "border-sky-300/70 bg-sky-500/10" : "border-white/15 bg-slate-900/40 hover:border-sky-400/60 hover:bg-slate-900/60"
              } mt-8 flex min-h-[220px] cursor-pointer flex-col items-center justify-center rounded-2xl border-2 border-dashed px-6 py-12 text-center text-sm text-slate-300 transition`}
              onDragOver={(e) => {
                e.preventDefault();
                e.stopPropagation();
                setDragActive(true);
              }}
              onDragLeave={(e) => {
                e.preventDefault();
                e.stopPropagation();
                setDragActive(false);
              }}
              onDrop={onDrop}
            >
              <div className="pointer-events-none flex flex-col items-center gap-4">
                <div className="flex h-14 w-14 items-center justify-center rounded-full border border-white/15 bg-white/10 text-sky-300">
                  <svg viewBox="0 0 24 24" className="h-7 w-7" fill="none" stroke="currentColor" strokeWidth="1.5" aria-hidden>
                    <path d="M12 5v14" strokeLinecap="round" />
                    <path d="M5 12h14" strokeLinecap="round" />
                    <rect x="3" y="3" width="18" height="18" rx="4" />
                  </svg>
                </div>
                <div className="text-lg font-semibold text-white">Drop the sealed PDF here</div>
                <p className="text-sm text-slate-300/80">Or click to choose it from your device</p>
              </div>
              <input type="file" accept="application/pdf" className="hidden" onChange={onChange} />
            </label>

            <div className="mt-6 space-y-4 text-sm text-slate-200/90">
              {loading && (
                <div className="flex items-center gap-2 text-slate-300">
                  <span className="h-1.5 w-1.5 animate-pulse rounded-full bg-sky-300" aria-hidden />
                  Hashing…
                </div>
              )}

              {filehash && (
                <div className="rounded-2xl border border-white/10 bg-slate-900/60 p-4">
                  <div className="text-xs uppercase tracking-[0.24em] text-slate-400">Computed SHA-256</div>
                  <div className="mt-2 break-all font-mono text-xs text-slate-200/90">{filehash}</div>

                  {match !== null && (
                    <div
                      className={`mt-3 inline-flex items-center gap-2 rounded-full px-3 py-1 text-xs font-medium ${
                        match
                          ? "border border-emerald-400/60 bg-emerald-500/10 text-emerald-200"
                          : "border border-rose-400/60 bg-rose-500/10 text-rose-200"
                      }`}
                    >
                      <span className="inline-block h-1.5 w-1.5 rounded-full bg-current" aria-hidden />
                      {match
                        ? "This PDF matches the registered credential."
                        : "This PDF does not match the registered hash."}
                    </div>
                  )}
                </div>
              )}

              {match === false && (
                <div className="rounded-2xl border border-rose-400/50 bg-rose-500/10 p-4 text-sm text-rose-200">
                  Double-check you’re using the exact file issued by the organization. If the mismatch persists, contact the issuer
                  to confirm whether the credential was revoked or replaced.
                </div>
              )}
            </div>
          </div>

          {/* right: status / meta */}
          <aside className="flex flex-col gap-6 rounded-2xl border border-white/10 bg-slate-900/60 p-6 text-sm text-slate-200">
            <div className="space-y-2">
              <h3 className="text-lg font-semibold text-white">Credential status</h3>
              {error && <p className="text-sm text-rose-300">{error}</p>}
              {!error && !cred && <p className="text-sm text-slate-400">Loading credential…</p>}

              {cred && (
                <div className="space-y-3">
                  <div>
                    <div className="text-xs uppercase tracking-[0.28em] text-slate-400">Current state</div>
                    <div
                      className={`mt-2 inline-flex items-center gap-2 rounded-full border px-3 py-1 text-xs font-semibold ${
                        cred.status === "revoked"
                          ? "border-rose-400/60 bg-rose-500/10 text-rose-200"
                          : "border-emerald-400/60 bg-emerald-500/10 text-emerald-200"
                      }`}
                    >
                      <span className="inline-block h-1.5 w-1.5 rounded-full bg-current" aria-hidden />
                      {cred.status === "revoked" ? "Revoked" : "Active"}
                    </div>
                  </div>

                  <div className="grid gap-2 text-xs text-slate-300/90">
                    <div>
                      <span className="font-medium text-slate-200">Issued:</span> {issuedAt}
                    </div>
                    <div>
                      <span className="font-medium text-slate-200">Revoked:</span> {revokedAt}
                    </div>
                    <div>
                      <span className="font-medium text-slate-200">Document type:</span> {cred.doc_type || "PDF"}
                    </div>
                    <div>
                      <span className="font-medium text-slate-200">Issued by:</span>{" "}
                      {cred.tenant_name || "GecorpID issuer"}
                    </div>
                  </div>
                </div>
              )}
            </div>

            <div className="rounded-2xl border border-white/10 bg-white/5 p-4 text-xs text-slate-300/85">
              <h4 className="text-sm font-semibold text-white">Why you provide the PDF</h4>
              <p className="mt-2">
                The QR only carries a link to this verifier. By loading the original document here, your browser can prove its
                contents match what the issuer registered — without us ever receiving the file.
              </p>
              <p className="mt-2 text-slate-400">
                Questions about the organization or the document? Contact them directly using the details inside the PDF. GecorpID
                validates hashes only.
              </p>
            </div>
          </aside>
        </section>
      </main>
    </div>
  );
}
