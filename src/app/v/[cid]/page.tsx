"use client";

import React, { useCallback, useEffect, useState } from 'react';
import type { Metadata } from 'next';

// Compute SHA‑256 hex digest of a PDF (ArrayBuffer)
async function sha256HexClient(buf: ArrayBuffer): Promise<string> {
  const digest = await crypto.subtle.digest('SHA-256', buf);
  return [...new Uint8Array(digest)].map((b) => b.toString(16).padStart(2, '0')).join('');
}

// Provide a page title dynamically
export const metadata: Metadata = {
  title: 'Verify credential',
};

interface CredentialInfo {
  sha256: string;
  status: string;
  revoked_at: string | null;
  issued_at: string | null;
  doc_type: string | null;
  tenant_name: string | null;
}

export default function VerifyPage({ params }: { params: { cid: string } }) {
  const cid = params.cid;
  const [cred, setCred] = useState<CredentialInfo | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [fileHash, setFileHash] = useState<string | null>(null);
  const [match, setMatch] = useState<boolean | null>(null);
  const [loading, setLoading] = useState(false);

  // Fetch credential metadata from the public API
  useEffect(() => {
    async function load() {
      try {
        const res = await fetch(`/api/public/credential?cid=${cid}`, { cache: 'no-store' });
        const data = await res.json();
        if (!res.ok) throw new Error(data?.error || 'Fetch error');
        setCred(data as CredentialInfo);
        setError(null);
      } catch (e: any) {
        setError(e?.message || 'Error');
        setCred(null);
      }
    }
    load();
  }, [cid]);

  // Handle file drop/select
  const handleFile = useCallback(
    async (file: File) => {
      setLoading(true);
      try {
        const buf = await file.arrayBuffer();
        const h = await sha256HexClient(buf);
        setFileHash(h);
        if (cred) {
          setMatch(h === cred.sha256);
        }
      } catch {
        setMatch(false);
      } finally {
        setLoading(false);
      }
    },
    [cred],
  );

  const onInputChange = useCallback(
    (e: React.ChangeEvent<HTMLInputElement>) => {
      const file = e.target.files?.[0];
      if (file) {
        handleFile(file);
      }
    },
    [handleFile],
  );
  const onDrop = useCallback(
    (e: React.DragEvent<HTMLDivElement>) => {
      e.preventDefault();
      e.stopPropagation();
      const file = e.dataTransfer?.files?.[0];
      if (file) handleFile(file);
    },
    [handleFile],
  );
  const onDragOver = useCallback((e: React.DragEvent<HTMLDivElement>) => {
    e.preventDefault();
    e.stopPropagation();
  }, []);

  return (
    <div className="min-h-screen bg-slate-50 text-slate-900">
      <header className="sticky top-0 z-10 bg-white/80 backdrop-blur border-b border-slate-200">
        <div className="mx-auto max-w-3xl px-4 py-3 flex items-center justify-between">
          <div className="leading-tight">
            <div className="font-semibold">GecorpID • Verify</div>
            <div className="text-xs text-slate-500">Verifiable credential checker</div>
          </div>
        </div>
      </header>
      <main className="mx-auto max-w-3xl px-4 py-8 space-y-8">
        <h1 className="text-2xl font-semibold">Verify document</h1>
        {error && <p className="text-sm text-rose-700">{error}</p>}
        {cred && (
          <div className="space-y-4">
            <p className="text-sm text-slate-600">
              This page verifies the integrity of your document against a recorded credential. Drop your stamped
              PDF below and we will compute its SHA‑256 hash locally.
            </p>
            <div
              className="flex items-center justify-center border-2 border-dashed border-slate-300 rounded-2xl p-10 bg-slate-50 hover:bg-slate-100 cursor-pointer"
              onDragOver={onDragOver}
              onDrop={onDrop}
            >
              <div className="text-center text-slate-600">
                <p className="font-medium">Click or drag your stamped PDF here</p>
                <p className="text-xs">We never upload your document</p>
                <input type="file" accept="application/pdf" className="hidden" onChange={onInputChange} />
              </div>
            </div>
            {loading && <p className="text-sm text-slate-600">Computing hash…</p>}
            {fileHash && match !== null && (
              <div
                className="mt-4 p-4 border rounded-xl"
                style={{
                  backgroundColor:
                    match && cred.status === 'active'
                      ? '#ecfdf5'
                      : cred.status === 'revoked' && match
                      ? '#fff7ed'
                      : '#fef2f2',
                  borderColor:
                    match && cred.status === 'active'
                      ? '#a7f3d0'
                      : cred.status === 'revoked' && match
                      ? '#fed7aa'
                      : '#fecaca',
                }}
              >
                {match && cred.status === 'active' && (
                  <div>
                    <div className="text-emerald-700 font-medium mb-1">✔ Document verified</div>
                    <div className="text-sm text-slate-700">This document matches the recorded SHA‑256 hash.</div>
                  </div>
                )}
                {match && cred.status === 'revoked' && (
                  <div>
                    <div className="text-amber-700 font-medium mb-1">⚠ Document revoked</div>
                    <div className="text-sm text-slate-700">This document was issued but has since been revoked.</div>
                  </div>
                )}
                {!match && (
                  <div>
                    <div className="text-rose-700 font-medium mb-1">✖ Hash mismatch</div>
                    <div className="text-sm text-slate-700">The uploaded PDF does not match the recorded hash.</div>
                  </div>
                )}
              </div>
            )}
            <div className="space-y-1 text-sm text-slate-700 mt-4">
              <div>
                <span className="font-medium">Status:</span>{' '}
                {cred.status === 'active' && <span className="text-emerald-700">active</span>}
                {cred.status === 'revoked' && <span className="text-rose-700">revoked</span>}
                {cred.status !== 'active' && cred.status !== 'revoked' && <span>{cred.status}</span>}
              </div>
              {cred.tenant_name && cred.issued_at && (
                <div>
                  This credential was issued by <span className="font-medium">{cred.tenant_name}</span>{' '}
                  on {new Date(cred.issued_at).toLocaleString()}.
                </div>
              )}
            </div>
          </div>
        )}
      </main>
      <footer className="py-8 text-center text-xs text-slate-500">
        © {new Date().getFullYear()} GecorpID — Powered by GECORP
      </footer>
    </div>
  );
}
