"use client";

import React, { useCallback, useEffect, useMemo, useState } from "react";

/** ---------- Small utilities ---------- */

async function sha256HexClient(buf: ArrayBuffer): Promise<string> {
  const digest = await crypto.subtle.digest("SHA-256", buf);
  return [...new Uint8Array(digest)].map((b) => b.toString(16).padStart(2, "0")).join("");
}

function safeDate(d: string | number | null | undefined) {
  if (d === null || d === undefined || d === "") return "—";
  const dt = new Date(d);
  return isNaN(dt.getTime()) ? "—" : dt.toLocaleString();
}

type CredentialInfo = {
  sha256: string;
  status: string; // 'active' | 'revoked' | etc.
  revoked_at: string | null;
  issued_at: string | null;
  doc_type: string | null;
  tenant_name: string | null;
};

/** ---------- Page ---------- */

export default function VerifyPage({ params }: { params: { cid: string } }) {
  const cid = params.cid;
  const [cred, setCred] = useState<CredentialInfo | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [filehash, setFilehash] = useState<string | null>(null);
  const [match, setMatch] = useState<boolean | null>(null);
  const [loading, setLoading] = useState(false);
  const [dragActive, setDragActive] = useState(false);

  // Fetch credential metadata from the public API
  useEffect(() => {
    (async () => {
      try {
        setError(null);
        setCred(null);
        const res = await fetch(`/api/public/credential?cid=${encodeURIComponent(cid)}`, {
          cache: "no-store",
        });
        const ct = res.headers.get("content-type") || "";
        const data = ct.includes("application/json") ? await res.json() : { error: await res.text() };
        if (!res.ok) throw new Error((data as any)?.error || "Failed to load credential");
        setCred(data as CredentialInfo);
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

  const issuedAt = useMemo(() => safeDate(cred?.issued_at), [cred?.issued_at]);
  const revokedAt = useMemo(() => safeDate(cred?.revoked_at), [cred?.revoked_at]);

  const dropzoneClasses =
    `relative flex w-full flex-col items-center justify-center rounded-2xl border-2 border-dashed px-6 py-12 text-center transition ` +
    (dragActive ? "border-sky-400 bg-sky-50" : "border-slate-200 bg-slate-50 hover:border-sky-200 hover:bg-sky-50/60");

  return (
    <div className="relative min-h-screen bg-slate-50 text-slate-900">
      <div className="pointer-events-none absolute inset-0 bg-gradient-to-b from-white via-slate-50 to-slate-100" aria-hidden />

      {/* Hero */}
      <header className="relative border-b border-slate-200 bg-white/90">
        <div className="mx-auto flex max-w-5xl flex-col gap-6 px-6 py-10 md:flex-row md:items-start md:justify-between">
          <div className="max-w-2xl space-y-4">
            <span className="inline-flex items-center gap-2 rounded-full border border-sky-200 bg-sky-50 px-3 py-1 text-xs font-semibold uppercase tracking-[0.28em] text-sky-600">
              Credential verifier
            </span>
            <h1 className="text-4xl font-semibold tracking-tight text-slate-900">
              Match the original PDF to credential <span className="font-mono text-sky-600">{cid}</span>
            </h1>
            <p className="text-sm text-slate-600">
              Upload the PDF that shows this QR code. We never store or transmit it: your browser hashes the file locally
              and compares it with the official digest registered by{" "}
              {cred?.tenant_name || "the issuer"}.
            </p>
          </div>

          <div className="flex flex-col gap-3 rounded-2xl border border-slate-200 bg-white/90 p-5 text-sm text-slate-600 shadow-lg shadow-slate-200/70">
            <h2 className="text-base font-semibold text-slate-800">What to expect</h2>
            <ul className="space-y-2">
              <li className="flex items-start gap-3">
                <span className="mt-1 inline-flex h-6 w-6 items-center justify-center rounded-full bg-sky-500 text-xs font-semibold text-white">1</span>
                Choose or drag the PDF. The QR already points here.
              </li>
              <li className="flex items-start gap-3">
                <span className="mt-1 inline-flex h-6 w-6 items-center justify-center rounded-full bg-sky-500 text-xs font-semibold text-white">2</span>
                We compute SHA-256 in the browser; nothing is uploaded.
              </li>
              <li className="flex items-start gap-3">
                <span className="mt-1 inline-flex h-6 w-6 items-center justify-center rounded-full bg-sky-500 text-xs font-semibold text-white">3</span>
                You immediately see whether the document is authentic or altered.
              </li>
            </ul>
          </div>
        </div>
      </header>

      {/* Main */}
      <main className="mx-auto flex max-w-5xl flex-col gap-10 px-6 py-12">
        <section className="grid gap-8 lg:grid-cols-[1.4fr_1fr]">
          {/* Left: Dropzone & Result */}
          <div className="rounded-3xl border border-slate-200 bg-white/90 p-8 shadow-2xl shadow-slate-200/70">
            <div className="flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
              <div>
                <h2 className="text-2xl font-semibold text-slate-900">Upload the sealed PDF</h2>
                <p className="text-sm text-slate-600">
                  Use the PDF that displays this QR code. If you received a sealed copy from the issuer, use that file for the
                  most reliable result.
                </p>
              </div>
              <ul className="grid gap-2 text-xs text-slate-500">
                <li className="flex items-center gap-2">
                  <span className="inline-flex h-5 w-5 items-center justify-center rounded-full border border-slate-200 bg-slate-50 text-[10px] font-semibold">PDF</span>
                  Verification is local to your device.
                </li>
                <li className="flex items-center gap-2">
                  <span className="inline-flex h-5 w-5 items-center justify-center rounded-full border border-slate-200 bg-slate-50 text-[10px] font-semibold">Secure</span>
                  The file never leaves your browser.
                </li>
              </ul>
            </div>

            <label
              className={`${dropzoneClasses} mt-8 cursor-pointer text-sm text-slate-600`}
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
              <div className="pointer-events-none flex flex-col items-center gap-3">
                <div className="flex h-12 w-12 items-center justify-center rounded-full border border-slate-200 bg-white text-sky-500">
                  <svg viewBox="0 0 24 24" className="h-6 w-6" fill="none" stroke="currentColor" strokeWidth="1.6">
                    <path d="M12 5v14" strokeLinecap="round" />
                    <path d="M5 12h14" strokeLinecap="round" />
                    <rect x="3" y="3" width="18" height="18" rx="4" />
                  </svg>
                </div>
                <div className="text-base font-medium text-slate-800">Drop the sealed PDF here</div>
                <div className="text-xs text-slate-500">Or click to choose it from your device</div>
              </div>
              <input type="file" accept="application/pdf" className="hidden" onChange={onChange} />
            </label>

            <div className="mt-6 space-y-4 text-sm text-slate-600">
              {loading && <div>Hashing…</div>}
              {filehash && (
                <div className="rounded-2xl border border-slate-200 bg-white p-4">
                  <div className="text-xs uppercase tracking-[0.24em] text-slate-400">Computed SHA-256</div>
                  <div className="mt-2 break-all font-mono text-xs text-slate-600">{filehash}</div>
                  {match !== null && (
                    <div
                      className={`mt-3 inline-flex items-center gap-2 rounded-full px-3 py-1 text-xs font-medium ${
                        match
                          ? "border border-emerald-200 bg-emerald-50 text-emerald-700"
                          : "border border-rose-200 bg-rose-50 text-rose-700"
                      }`}
                    >
                      <span className="inline-block h-1.5 w-1.5 rounded-full bg-current" aria-hidden />
                      {match ? "This PDF matches the registered credential." : "This PDF does not match the registered hash."}
                    </div>
                  )}
                </div>
              )}
              {match === false && (
                <div className="rounded-2xl border border-rose-200 bg-rose-50/80 p-4 text-sm text-rose-700">
                  Double-check that you are using the exact document issued by the organization. If the mismatch persists, contact
                  the issuer to confirm whether the credential was revoked or replaced.
                </div>
              )}
            </div>
          </div>

          {/* Right: Status & FAQ */}
          <aside className="flex flex-col gap-6 rounded-3xl border border-slate-200 bg-white/90 p-8 text-sm text-slate-600 shadow-xl shadow-slate-200/70">
            <div className="space-y-2">
              <h3 className="text-lg font-semibold text-slate-900">Credential status</h3>
              {error && <p className="text-sm text-rose-600">{error}</p>}
              {!error && !cred && <p className="text-sm text-slate-500">Loading credential…</p>}
              {cred && (
                <div className="space-y-3">
                  <div>
                    <div className="text-xs uppercase tracking-[0.28em] text-slate-400">Current state</div>
                    <div
                      className={`mt-2 inline-flex items-center gap-2 rounded-full border px-3 py-1 text-xs font-semibold ${
                        cred.status === "revoked"
                          ? "border-rose-200 bg-rose-50 text-rose-700"
                          : "border-emerald-200 bg-emerald-50 text-emerald-700"
                      }`}
                    >
                      <span className="inline-block h-1.5 w-1.5 rounded-full bg-current" aria-hidden />
                      {cred.status === "revoked" ? "Revoked" : "Active"}
                    </div>
                  </div>
                  <div className="grid gap-2 text-xs text-slate-500">
                    <div>
                      <span className="font-medium text-slate-700">Issued:</span> {issuedAt}
                    </div>
                    <div>
                      <span className="font-medium text-slate-700">Revoked:</span> {revokedAt}
                    </div>
                    <div>
                      <span className="font-medium text-slate-700">Document type:</span> {cred.doc_type || "PDF"}
                    </div>
                    <div>
                      <span className="font-medium text-slate-700">Issued by:</span> {cred.tenant_name || "GecorpID issuer"}
                    </div>
                  </div>
                </div>
              )}
            </div>

            <div className="space-y-3 rounded-2xl border border-slate-200 bg-slate-50/80 p-4 text-xs text-slate-600">
              <h3 className="text-sm font-semibold text-slate-800">Why you provide the PDF</h3>
              <p>
                The QR code only carries a link to this secure verifier. By loading the original document here, your browser can
                prove that its contents match what the issuer registered—without us ever receiving or storing the file.
              </p>
              <p className="text-slate-500">
                If you have questions about the organization or the origin of this PDF, reach out directly using the contact details
                inside the document. GecorpID validates hashes only.
              </p>
            </div>
          </aside>
        </section>
      </main>
    </div>
  );
}
