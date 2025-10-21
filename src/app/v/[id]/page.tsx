"use client";

import React, { useCallback, useState } from 'react';
import { useRouter } from 'next/navigation';

// Helper to compute SHA‑256 in the browser
async function sha256HexClient(buf: ArrayBuffer): Promise<string> {
  const hash = await crypto.subtle.digest('SHA-256', buf);
  const bytes = Array.from(new Uint8Array(hash));
  return bytes.map((b) => b.toString(16).padStart(2, '0')).join('');
}

export default function VerifyPage({ params }: { params: { id: string } }) {
  const cid = params.id;
  const [expectedHash, setExpectedHash] = useState<string | null>(null);
  const [status, setStatus] = useState<string | null>(null);
  const [localHash, setLocalHash] = useState<string | null>(null);
  const [match, setMatch] = useState<boolean | null>(null);
  const [error, setError] = useState<string | null>(null);

  const handleFiles = useCallback(
    async (files: FileList | null) => {
      if (!files || files.length === 0) return;
      const file = files[0];
      try {
        // Compute local hash
        const buf = await file.arrayBuffer();
        const hash = await sha256HexClient(buf);
        setLocalHash(hash);
        // Fetch expected hash and status
        const res = await fetch(`/api/public/credential?cid=${encodeURIComponent(cid)}`, { cache: 'no-store' });
        const j = await res.json();
        if (!res.ok) throw new Error(j.error || 'Verification failed');
        const expected = j.sha256 as string | null;
        const st = j.status as string | null;
        setExpectedHash(expected);
        setStatus(st);
        if (!expected) {
          setMatch(null);
          setError('No hash stored for this credential.');
        } else {
          setMatch(expected.toLowerCase() === hash.toLowerCase());
          setError(null);
        }
      } catch (err: any) {
        setError(err?.message || 'Error verifying document');
        setMatch(null);
      }
    },
    [cid]
  );

  return (
    <div className="min-h-screen bg-[#f6f7fb] text-neutral-900 flex flex-col">
      <header className="bg-white/80 backdrop-blur border-b border-neutral-200 py-4 px-4">
        <div className="max-w-6xl mx-auto flex items-center justify-between">
          <div className="flex items-center gap-3">
            <img src="/gecorpid_logo.png" alt="GecorpID" className="h-8 w-8 rounded" />
            <div className="leading-tight">
              <div className="font-semibold">Credential Verification</div>
              <div className="text-xs text-neutral-500">Verify a sealed PDF by drag &amp; drop</div>
            </div>
          </div>
          <div className="text-sm text-neutral-600">CID: <span className="font-mono text-xs">{cid}</span></div>
        </div>
      </header>
      <main className="flex-1">
        <div className="max-w-6xl mx-auto px-4 py-10">
          <div className="rounded-2xl bg-white shadow-soft border border-neutral-200 p-6 text-center">
            <h1 className="text-xl font-semibold mb-4">Verify your document</h1>
            <p className="text-sm text-neutral-600 mb-4">
              Drop the sealed PDF here. We compute its SHA‑256 hash locally and compare it against
              our records. No file is uploaded to the server.
            </p>
            <label className="inline-flex items-center justify-center w-full rounded-2xl border-2 border-dashed border-neutral-300 bg-neutral-50 hover:bg-neutral-100 px-5 py-10 cursor-pointer">
              <div className="text-neutral-600">
                <div className="font-medium">Click or drag your sealed PDF here</div>
                <div className="text-xs">Only the first file will be used</div>
              </div>
              <input
                type="file"
                accept="application/pdf"
                multiple={false}
                className="hidden"
                onChange={(e) => handleFiles(e.target.files)}
              />
            </label>
            {match !== null && (
              <div className="mt-6">
                {match && status !== 'revoked' && (
                  <div className="inline-flex items-center gap-2 text-emerald-700 text-lg font-medium">
                    ✅ Hash matches{status === 'revoked' ? ' (revoked)' : ''}
                  </div>
                )}
                {(!match || status === 'revoked') && (
                  <div className="inline-flex items-center gap-2 text-rose-700 text-lg font-medium">
                    {status === 'revoked' ? '🚫 This credential has been revoked' : '❌ Hash mismatch'}
                  </div>
                )}
                {status && status !== 'active' && status !== 'revoked' && (
                  <div className="text-neutral-600 text-sm mt-2">Status: {status}</div>
                )}
              </div>
            )}
            {error && (
              <div className="mt-4 text-sm text-rose-700">{error}</div>
            )}
            {expectedHash && localHash && (
              <div className="mt-6 text-xs text-neutral-600 font-mono break-all text-left">
                <div><strong>Expected:</strong> {expectedHash}</div>
                <div><strong>Local:</strong> {localHash}</div>
              </div>
            )}
          </div>
        </div>
      </main>
      <footer className="py-8 text-center text-xs text-neutral-500">
        © {new Date().getFullYear()} GecorpID — Powered by GECORP
      </footer>
    </div>
  );
}
