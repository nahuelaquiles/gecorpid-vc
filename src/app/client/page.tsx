"use client";

import React, { useCallback, useEffect, useState } from 'react';
import QRCode from 'qrcode';
import { PDFDocument, StandardFonts, rgb } from 'pdf-lib';

// -----------------------------------------------------------------------------
// Client‑side helpers
// These functions run entirely in the browser. They never upload the
// document and instead operate on in‑memory ArrayBuffers. Hashing and
// stamping are performed locally before calling the server to finalise
// issuance.

async function fileToArrayBuffer(file: File) {
  return await file.arrayBuffer();
}

async function sha256HexClient(buf: ArrayBuffer): Promise<string> {
  const hash = await crypto.subtle.digest('SHA-256', buf);
  const bytes = Array.from(new Uint8Array(hash));
  return bytes.map((b) => b.toString(16).padStart(2, '0')).join('');
}

function shortFingerprint(hex: string) {
  return hex.substring(0, 8).toUpperCase();
}

async function stampPdfWithQr(pdfBytes: ArrayBuffer, qrText: string): Promise<Uint8Array> {
  const pdfDoc = await PDFDocument.load(pdfBytes);
  const pages = pdfDoc.getPages();

  // generate QR image
  const qrDataUrl = await QRCode.toDataURL(qrText, { errorCorrectionLevel: 'M', margin: 1, scale: 6 });
  const pngBytes = Uint8Array.from(atob(qrDataUrl.split(',')[1]), (c) => c.charCodeAt(0));
  const pngImage = await pdfDoc.embedPng(pngBytes);
  const pngDims = pngImage.scale(0.45);

  const font = await pdfDoc.embedFont(StandardFonts.HelveticaBold);

  pages.forEach((p) => {
    const { width, height } = p.getSize();
    const margin = 24;
    const boxW = pngDims.width + 24;
    const boxH = pngDims.height + 54;
    // soft box
    p.drawRectangle({
      x: width - boxW - margin,
      y: height - boxH - margin,
      width: boxW,
      height: boxH,
      color: rgb(1, 1, 1),
      borderColor: rgb(0.87, 0.9, 0.95),
      borderWidth: 1,
      opacity: 0.9,
    });
    // titles
    p.drawText('Verifiable Digital Credential', {
      x: width - boxW - margin + 12,
      y: height - boxH - margin + boxH - 18,
      size: 9,
      font,
      color: rgb(0.08, 0.1, 0.16),
    });
    p.drawText('developed by gecorp.com.ar', {
      x: width - boxW - margin + 12,
      y: height - boxH - margin + boxH - 32,
      size: 7,
      font,
      color: rgb(0.25, 0.28, 0.35),
    });
    // QR
    p.drawImage(pngImage, {
      x: width - boxW - margin + 12,
      y: height - boxH - margin + 10,
      width: pngDims.width,
      height: pngDims.height,
    });
  });
  return await pdfDoc.save();
}

// Row type for the results table
type Row = {
  name: string;
  cid?: string;
  verifyUrl?: string;
  sha256?: string;
  short?: string;
  status: 'pending' | 'stamped' | 'issued' | 'error';
  message?: string;
  vc_jwt?: string;
};

export default function ClientPage() {
  const [rows, setRows] = useState<Row[]>([]);
  const [credits, setCredits] = useState<number | null>(null);
  const [loading, setLoading] = useState(false);

  // Fetch remaining credits on mount
  useEffect(() => {
    async function fetchCredits() {
      try {
        const res = await fetch('/api/credits', { cache: 'no-store' });
        const j = await res.json();
        if (res.ok) setCredits(j.credits ?? null);
      } catch {
        setCredits(null);
      }
    }
    fetchCredits();
  }, []);

  // Issue request proxy: obtains CID and verify URL
  async function issueRequest(): Promise<{ cid: string; verify_url: string }> {
    const res = await fetch('/api/issue-request', { method: 'POST' });
    const j = await res.json();
    if (!res.ok) throw new Error(j.error || 'Failed to create ticket');
    return j;
  }
  // Issue final: sends CID and local hash to server
  async function issueFinal(payload: { cid: string; sha256: string; doc_type?: string }): Promise<{ vc_jwt: string }> {
    const res = await fetch('/api/issue-final', {
      method: 'POST',
      headers: { 'content-type': 'application/json' },
      body: JSON.stringify(payload),
    });
    const j = await res.json();
    if (!res.ok) throw new Error(j.error || 'Failed to issue credential');
    return j;
  }

  const onPickFiles = useCallback(async (ev: React.ChangeEvent<HTMLInputElement>) => {
    const files = ev.target.files;
    if (!files || files.length === 0) return;
    setLoading(true);
    const initialRows: Row[] = [];
    for (const file of Array.from(files)) {
      initialRows.push({ name: file.name, status: 'pending' });
    }
    setRows(initialRows);
    for (let i = 0; i < files.length; i++) {
      const file = files[i];
      try {
        // 1) obtain CID and verification URL
        const { cid, verify_url } = await issueRequest();
        // 2) stamp locally
        const buf = await fileToArrayBuffer(file);
        const stamped = await stampPdfWithQr(buf, verify_url);
        // 3) hash locally
        const hash = await sha256HexClient(stamped.buffer);
        const short = shortFingerprint(hash);
        // 4) finalise issuance
        const { vc_jwt } = await issueFinal({ cid, sha256: hash, doc_type: 'pdf' });
        // 5) trigger download
        const blob = new Blob([stamped], { type: 'application/pdf' });
        const url = URL.createObjectURL(blob);
        const fname = file.name.replace(/\.pdf$/i, '') + `_VC_${short}.pdf`;
        const a = document.createElement('a');
        a.href = url;
        a.download = fname;
        a.click();
        URL.revokeObjectURL(url);
        // 6) update row
        setRows((prev) => {
          const copy = [...prev];
          copy[i] = {
            name: file.name,
            cid,
            verifyUrl: verify_url,
            sha256: hash,
            short,
            status: 'issued',
            vc_jwt,
          };
          return copy;
        });
      } catch (err: any) {
        setRows((prev) => {
          const copy = [...prev];
          copy[i] = { name: file.name, status: 'error', message: err?.message || 'Error' };
          return copy;
        });
      }
    }
    setLoading(false);
    // refresh credits after issuing
    try {
      const res = await fetch('/api/credits', { cache: 'no-store' });
      const j = await res.json();
      if (res.ok) setCredits(j.credits ?? null);
    } catch {}
  }, []);

  return (
    <div className="min-h-screen bg-[#f6f7fb] text-neutral-900 flex flex-col">
      <header className="bg-white/80 backdrop-blur border-b border-neutral-200 py-4 px-4">
        <div className="max-w-6xl mx-auto flex items-center justify-between">
          <div className="flex items-center gap-3">
            <img
              src="/gecorpid_logo.png"
              alt="GecorpID"
              className="h-8 w-8 rounded"
            />
            <div className="leading-tight">
              <div className="font-semibold">GecorpID • VC</div>
              <div className="text-xs text-neutral-500">Local issuance of verifiable PDFs</div>
            </div>
          </div>
          <div className="text-sm text-neutral-600">
            Credits:&nbsp;
            <span className="inline-flex items-center rounded-full bg-emerald-50 px-2 py-0.5 text-emerald-700 border border-emerald-200">
              {credits ?? '—'}
            </span>
          </div>
        </div>
      </header>

      <main className="flex-1">
        <div className="max-w-6xl mx-auto px-4 py-10">
          <div className="rounded-2xl bg-white shadow-soft border border-neutral-200 p-6">
            <h1 className="text-xl font-semibold mb-4">Issue verifiable credentials for your PDFs</h1>
            <p className="text-sm text-neutral-600 mb-4">
              Drop one or more PDF files below. The app will stamp a QR code, compute the SHA-256 hash locally,
              send the hash to the server to create a verifiable credential, and automatically download the
              sealed PDF. Your PDFs never leave your computer.
            </p>

            <label className="inline-flex items-center gap-2 w-full justify-center rounded-2xl border-2 border-dashed border-neutral-300 bg-neutral-50 hover:bg-neutral-100 px-5 py-10 cursor-pointer">
              <div className="text-neutral-600 text-center">
                <div className="font-medium">Click or drag your PDFs here</div>
                <div className="text-xs">One verifiable credential will be issued per file</div>
              </div>
              <input
                type="file"
                accept="application/pdf"
                multiple
                className="hidden"
                onChange={onPickFiles}
              />
            </label>

            {loading && <div className="mt-4 text-sm text-neutral-600">Processing…</div>}

            {rows.length > 0 && (
              <div className="mt-6 overflow-x-auto">
                <table className="w-full text-sm">
                  <thead>
                    <tr className="text-left text-neutral-500">
                      <th className="py-2 pr-3">File</th>
                      <th className="py-2 pr-3">CID</th>
                      <th className="py-2 pr-3">Hash</th>
                      <th className="py-2 pr-3">Status</th>
                      <th className="py-2">Verify</th>
                    </tr>
                  </thead>
                  <tbody>
                    {rows.map((r, i) => (
                      <tr key={i} className="border-t border-neutral-200">
                        <td className="py-2 pr-3 whitespace-nowrap">{r.name}</td>
                        <td className="py-2 pr-3 text-xs break-all">{r.cid || '—'}</td>
                        <td className="py-2 pr-3">{r.short || '—'}</td>
                        <td className="py-2 pr-3">
                          {r.status === 'pending' && <span className="text-neutral-600">stamping…</span>}
                          {r.status === 'stamped' && <span className="text-neutral-600">hashing…</span>}
                          {r.status === 'issued' && <span className="text-emerald-700">issued ✔</span>}
                          {r.status === 'error' && <span className="text-rose-700">error: {r.message}</span>}
                        </td>
                        <td className="py-2">
                          {r.verifyUrl ? (
                            <a
                              href={r.verifyUrl}
                              target="_blank"
                              rel="noopener noreferrer"
                              className="text-sky-700 underline"
                            >
                              Open
                            </a>
                          ) : (
                            '—'
                          )}
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
                <div className="mt-4 text-xs text-neutral-500">
                  Note: The stamped PDF is downloaded automatically; you can also use the verification link.
                </div>
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
