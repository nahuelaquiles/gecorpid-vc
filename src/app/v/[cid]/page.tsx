"use client";

import React, { useCallback, useEffect, useMemo, useState } from "react";

// Compute SHA-256 hex digest of a PDF (ArrayBuffer)
async function sha256HexClient(buf: ArrayBuffer): Promise<string> {
  const digest = await crypto.subtle.digest("SHA-256", buf);
  return [...new Uint8Array(digest)].map((b) => b.toString(16).padStart(2, "0")).join("");
}

interface CredentialInfo {
  sha256: string;
  status: string;            // 'active' | 'revoked' | etc.
  revoked_at: string | null;
  issued_at: string | null;
  doc_type: string | null;
  tenant_name: string | null;
}

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

  const onPick = useCallback(async (file: File) => {
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
  }, [cred]);

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

  const issuedAt = useMemo(() => (cred?.issued_at ? new Date(cred.issued_at).toLocaleString() : null), [cred?.issued_at]);
  const revokedAt = useMemo(() => (cred?.revoked_at ? new Date(cred.revoked_at).toLocaleString() : null), [cred?.revoked_at]);

  const dropzoneClasses = `relative flex w-full flex-col items-center justify-center rounded-3xl border-2 border-dashed px-6 py-12 transition ${
    dragActive
      ? "border-sky-400/70 bg-sky-500/10 shadow-[0_0_0_1px_rgba(56,189,248,0.25)]"
      : "border-white/15 bg-white/5 hover:bg-white/10"
  }`;

  return (
    <div className="relative min-h-screen overflow-hidden bg-[#03040a] text-slate-100">
      <div className="pointer-events-none absolute inset-0 -z-10">
        <div className="absolute left-[-20%] top-[-30%] h-[460px] w-[460px] rounded-full bg-sky-500/15 blur-3xl" />
        <div className="absolute right-[-10%] top-[25%] h-[540px] w-[540px] rounded-full bg-violet-500/15 blur-[140px]" />
        <div className="absolute inset-x-0 bottom-[-35%] h-[480px] bg-gradient-to-t from-[#03040a] via-transparent to-transparent" />
      </div>

      <header className="border-b border-white/10 bg-black/40 backdrop-blur">
        <div className="mx-auto flex max-w-5xl flex-col gap-4 px-6 py-6 md:flex-row md:items-center md:justify-between">
          <div>
            <div className="text-xs uppercase tracking-[0.32em] text-white/55">GecorpID verifier</div>
            <h1 className="mt-3 text-3xl font-semibold tracking-tight text-white">
              Verify sealed document
            </h1>
            <p className="mt-2 max-w-xl text-sm text-white/65">
              Drop the PDF that carries this QR code. We’ll compute its SHA-256 locally and confirm it matches the hash
              registered for credential <span className="font-mono text-white/80">{cid}</span>.
            </p>
          </div>
          <div className="flex flex-col items-start gap-3 text-sm text-white/65 md:items-end">
            <span className="rounded-full border border-white/15 bg-white/5 px-3 py-1 text-xs uppercase tracking-[0.28em]">
              Status
            </span>
            {error && <span className="text-rose-200">{error}</span>}
            {!error && !cred && <span className="text-white/60">Loading credential…</span>}
            {cred && (
              <span
                className={`inline-flex items-center gap-2 rounded-full border px-4 py-2 text-xs font-semibold ${
                  cred.status === "revoked"
                    ? "border-rose-400/40 bg-rose-500/15 text-rose-100"
                    : "border-emerald-400/40 bg-emerald-500/15 text-emerald-100"
                }`}
              >
                <span className="inline-block h-2 w-2 rounded-full bg-current" aria-hidden />
                {cred.status === "revoked" ? "Revoked" : "Active"}
              </span>
            )}
          </div>
        </div>
      </header>

      <main className="mx-auto max-w-5xl space-y-12 px-6 pb-20 pt-12">
        <section className="grid gap-8 lg:grid-cols-[1.4fr_1fr]">
          <div className="rounded-3xl border border-white/10 bg-black/30 p-8 shadow-[0_40px_80px_rgba(6,10,28,0.55)] backdrop-blur-xl">
            <div className="flex flex-col gap-4 sm:flex-row sm:items-center sm:justify-between">
              <div>
                <h2 className="text-2xl font-semibold text-white">Upload the sealed PDF</h2>
                <p className="mt-2 text-sm text-white/70">
                  Use the document that shows this QR. Verification happens entirely in your browser — no document
                  leaves your device.
                </p>
              </div>
              <ul className="grid gap-2 text-xs text-white/60">
                <li className="flex items-center gap-2">
                  <span className="inline-flex h-5 w-5 items-center justify-center rounded-full border border-white/15 bg-white/5 text-[10px] font-semibold">
                    1
                  </span>
                  Choose or drag the PDF here
                </li>
                <li className="flex items-center gap-2">
                  <span className="inline-flex h-5 w-5 items-center justify-center rounded-full border border-white/15 bg-white/5 text-[10px] font-semibold">
                    2
                  </span>
                  We hash it locally (SHA-256)
                </li>
                <li className="flex items-center gap-2">
                  <span className="inline-flex h-5 w-5 items-center justify-center rounded-full border border-white/15 bg-white/5 text-[10px] font-semibold">
                    3
                  </span>
                  We compare with the issuer’s record
                </li>
              </ul>
            </div>

            <label
              className={`${dropzoneClasses} mt-8 cursor-pointer text-center text-sm text-white/70`}
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
                <div className="flex h-12 w-12 items-center justify-center rounded-full border border-white/15 bg-white/5 text-white/70">
                  <svg viewBox="0 0 24 24" className="h-6 w-6" fill="none" stroke="currentColor" strokeWidth="1.6">
                    <path d="M12 5v14" strokeLinecap="round" />
                    <path d="M5 12h14" strokeLinecap="round" />
                    <rect x="3" y="3" width="18" height="18" rx="4" />
                  </svg>
                </div>
                <div className="text-base font-medium text-white">Drop the sealed PDF</div>
                <div className="text-xs text-white/60">We never upload or store your file</div>
              </div>
              <input type="file" accept="application/pdf" className="hidden" onChange={onChange} />
            </label>

            <div className="mt-6 text-sm text-white/75">
              {loading && <div>Hashing…</div>}
              {filehash && (
                <div className="rounded-2xl border border-white/10 bg-white/5 p-4">
                  <div className="text-xs uppercase tracking-[0.2em] text-white/55">Computed SHA-256</div>
                  <div className="mt-2 font-mono text-xs text-white/80 break-all">{filehash}</div>
                  <div className="mt-3 flex items-center justify-between">
                    <span className="text-xs text-white/60">Comparison result</span>
                    <span className={`text-sm font-semibold ${
                      match === true ? "text-emerald-200" : match === false ? "text-rose-200" : "text-white/60"
                    }`}>
                      {match === true && "Match — authentic"}
                      {match === false && "Hash mismatch"}
                      {match === null && "Awaiting PDF"}
                    </span>
                  </div>
                </div>
              )}
            </div>
          </div>

          <aside className="flex h-fit flex-col gap-6 rounded-3xl border border-white/10 bg-black/25 p-6 shadow-[0_30px_70px_rgba(6,10,28,0.45)] backdrop-blur-xl">
            {cred && (
              <div className="space-y-4 text-sm text-white/70">
                <div>
                  <div className="text-xs uppercase tracking-[0.28em] text-white/55">Issuer</div>
                  <div className="mt-1 text-base font-semibold text-white">{cred.tenant_name || "GecorpID"}</div>
                </div>
                {issuedAt && (
                  <div>
                    <div className="text-xs uppercase tracking-[0.28em] text-white/55">Issued</div>
                    <div className="mt-1 font-medium text-white/80">{issuedAt}</div>
                  </div>
                )}
                {revokedAt && (
                  <div>
                    <div className="text-xs uppercase tracking-[0.28em] text-white/55">Revoked</div>
                    <div className="mt-1 font-medium text-rose-200">{revokedAt}</div>
                  </div>
                )}
                <div>
                  <div className="text-xs uppercase tracking-[0.28em] text-white/55">Document hash on record</div>
                  <div className="mt-1 font-mono text-xs text-white/70 break-all">{cred.sha256}</div>
                </div>
              </div>
            )}

            <div className="rounded-2xl border border-white/10 bg-white/5 p-4 text-xs leading-relaxed text-white/70">
              <div className="font-semibold text-white">Why do we ask for the PDF?</div>
              <p className="mt-2">
                The QR stores only a credential ID. To protect privacy, the actual PDF never reaches our servers. Dropping
                the file lets your browser compute its SHA-256 hash and compare it with the issuer’s signed record. A
                match proves the file is original and untampered.
              </p>
            </div>

            <div className="rounded-2xl border border-emerald-400/30 bg-emerald-500/15 p-4 text-xs leading-relaxed text-emerald-100">
              <div className="font-semibold text-emerald-100">Need help?</div>
              <p className="mt-2">
                Request the sealed PDF directly from the person or company who issued it. Verifying any other copy will
                result in a mismatch, which is expected and keeps your workflow secure.
              </p>
            </div>
          </aside>
        </section>
      </main>
    </div>
  );
}
