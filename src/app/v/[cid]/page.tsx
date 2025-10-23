"use client";

import React, { useCallback, useEffect, useState } from "react";

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

  const onDrop = useCallback((e: React.DragEvent<HTMLLabelElement>) => {
    e.preventDefault();
    e.stopPropagation();
    const f = e.dataTransfer?.files?.[0];
    if (f) onPick(f);
  }, [onPick]);

  const onChange = useCallback((e: React.ChangeEvent<HTMLInputElement>) => {
    const f = e.target.files?.[0];
    if (f) onPick(f);
  }, [onPick]);

  return (
    <div className="min-h-screen bg-white text-slate-900">
      <header className="border-b bg-white">
        <div className="mx-auto max-w-3xl px-4 py-4">
          <h1 className="text-xl font-semibold">Verify credential</h1>
          <p className="text-sm text-slate-600">Check integrity of a stamped PDF for CID <span className="font-mono">{cid}</span>.</p>
        </div>
      </header>

      <main className="mx-auto max-w-3xl px-4 py-8">
        <div className="rounded-2xl bg-slate-50 border border-slate-200 p-6">
          {/* Status panel */}
          <div className="mb-6">
            {!cred && !error && <div className="text-sm text-slate-600">Loading credential…</div>}
            {error && <div className="text-sm text-rose-700">Error: {error}</div>}
            {cred && (
              <div className="text-sm">
                {cred.status === "revoked" ? (
                  <div className="inline-flex items-center gap-2 rounded-md bg-rose-50 text-rose-800 px-2 py-1 border border-rose-200">
                    <span>Revoked</span>
                    {cred.revoked_at && <span className="text-rose-700/80">({new Date(cred.revoked_at).toISOString()})</span>}
                  </div>
                ) : (
                  <div className="inline-flex items-center gap-2 rounded-md bg-emerald-50 text-emerald-800 px-2 py-1 border border-emerald-200">
                    <span>Active</span>
                  </div>
                )}
                <div className="mt-2 text-slate-700">
                  This is a verifiable digital credential{cred.tenant_name ? <> issued by <strong>{cred.tenant_name}</strong></> : null}
                  {cred.issued_at ? <> on <strong>{new Date(cred.issued_at).toISOString()}</strong></> : null}. The document’s
                  integrity is proven by a local SHA-256 match.
                </div>
              </div>
            )}
          </div>

          {/* Dropzone */}
          <label
            className="flex w-full items-center justify-center rounded-xl border-2 border-dashed bg-white px-5 py-10 cursor-pointer hover:bg-slate-100"
            onDragOver={(e) => { e.preventDefault(); e.stopPropagation(); }}
            onDrop={onDrop}
          >
            <div className="text-slate-600 text-center">
              <div className="font-medium">Click or drag your stamped PDF here</div>
              <div className="text-xs">We compute SHA-256 locally and compare with the issuer’s record</div>
            </div>
            <input type="file" accept="application/pdf" className="hidden" onChange={onChange} />
          </label>

          {/* Result */}
          <div className="mt-6 text-sm">
            {loading && <div className="text-slate-600">Hashing…</div>}
            {filehash && cred && (
              <div className="rounded-lg border px-3 py-2 bg-white">
                <div className="flex items-center justify-between">
                  <div>
                    <div className="text-slate-500 text-xs">Computed SHA-256</div>
                    <div className="font-mono text-xs break-all">{filehash}</div>
                  </div>
                  <div className="text-right">
                    {match === true && <div className="text-emerald-700 font-medium">✅ Match</div>}
                    {match === false && <div className="text-rose-700 font-medium">❌ No match</div>}
                    {match === null && <div className="text-slate-600">Awaiting file…</div>}
                  </div>
                </div>
              </div>
            )}
          </div>

          {/* FAQ */}
          <div className="mt-8 text-xs text-slate-600 leading-relaxed">
            <div className="font-semibold mb-1">How does this prove originality?</div>
            <div>
              The issuer recorded only the SHA-256 hash and a signed verifiable credential (JWT).
              When you drop your PDF here, we hash it locally (your file never leaves your device).
              If the hash matches and status is <em>Active</em>, the PDF is the authentic sealed copy.
            </div>
          </div>
        </div>
      </main>
    </div>
  );
}
