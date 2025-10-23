"use client";

import React, { useCallback, useEffect, useState } from "react";
import QRCode from "qrcode";
import { PDFDocument, rgb } from "pdf-lib";

// Compute a SHA‑256 hex digest of an ArrayBuffer using the Web Crypto API
async function sha256HexClient(buf: ArrayBuffer): Promise<string> {
  const digest = await crypto.subtle.digest("SHA-256", buf);
  return [...new Uint8Array(digest)].map((b) => b.toString(16).padStart(2, "0")).join("");
}
// Return a shortened code from a hex digest
function shortHash(hex: string) {
  return hex.slice(0, 8).toUpperCase();
}

/**
 * Stamp every page of a PDF with a compact QR badge pointing to verifyUrl.
 * Returns a new PDF as a Uint8Array.
 */
async function stampPdfWithQr(pdfBytes: ArrayBuffer, verifyUrl: string): Promise<Uint8Array> {
  const pdf = await PDFDocument.load(pdfBytes);
  const pages = pdf.getPages();
  const qrDataUrl = await QRCode.toDataURL(verifyUrl, {
    errorCorrectionLevel: "M",
    margin: 0,
    scale: 6,
  });
  const pngBytes = Uint8Array.from(atob(qrDataUrl.split(",")[1]), (c) => c.charCodeAt(0));
  const pngImage = await pdf.embedPng(pngBytes);
  const maxSide = Math.max(pngImage.width, pngImage.height);
  const targetSize = 96; // ~1.3 cm on A4 – compact but scannable
  const scale = targetSize / maxSide;
  const pngDims = pngImage.scale(scale);
  pages.forEach((p) => {
    const { width, height } = p.getSize();
    const offset = 14;
    const qrX = width - pngDims.width - offset;
    const qrY = offset;
    const pad = 6;
    // subtle white badge to preserve legibility on dark backgrounds
    p.drawRectangle({
      x: qrX - pad,
      y: qrY - pad,
      width: pngDims.width + pad * 2,
      height: pngDims.height + pad * 2,
      color: rgb(1, 1, 1),
      opacity: 0.92,
    });
    p.drawImage(pngImage, {
      x: qrX,
      y: qrY,
      width: pngDims.width,
      height: pngDims.height,
    });
  });
  return pdf.save();
}

type Row = {
  name: string;
  cid?: string;
  verifyUrl?: string;
  sha256?: string;
  short?: string;
  status: "pending" | "issued" | "error";
  message?: string;
};

type HistoryRow = {
  cid: string;
  sha256: string;
  status: string;
  issued_at: string | null;
  revoked_at: string | null;
  doc_type: string | null;
  doc_filename?: string | null;
};

export default function ClientPage() {
  const [rows, setRows] = useState<Row[]>([]);
  const [loading, setLoading] = useState(false);
  const [credits, setCredits] = useState<number | null>(null);
  const [dragActive, setDragActive] = useState(false);
  const [history, setHistory] = useState<HistoryRow[]>([]);
  const [nameIndex, setNameIndex] = useState<Record<string, string>>({});

  const STORAGE_KEY = "gecorpid-vc-file-names";

  // Load remembered file names from localStorage once we're on the client.
  useEffect(() => {
    if (typeof window === "undefined") return;
    try {
      const raw = window.localStorage.getItem(STORAGE_KEY);
      if (!raw) return;
      const parsed = JSON.parse(raw) as Record<string, string>;
      setNameIndex(parsed || {});
    } catch {
      // ignore parsing errors and start with an empty cache
    }
  }, []);

  const rememberFileName = useCallback((sha: string, name: string) => {
    const key = sha.toLowerCase();
    setNameIndex((prev) => {
      if (prev[key] === name) return prev;
      const next = { ...prev, [key]: name };
      if (typeof window !== "undefined") {
        try {
          window.localStorage.setItem(STORAGE_KEY, JSON.stringify(next));
        } catch {
          // ignore quota/storage failures
        }
      }
      return next;
    });
  }, []);

  // Fetch tenant credit balance
  async function fetchCredits() {
    try {
      const res = await fetch("/api/credits", { cache: "no-store" });
      const ct = res.headers.get("content-type") || "";
      const data = ct.includes("application/json") ? await res.json() : { error: await res.text() };
      if (res.ok) setCredits((data as any).credits ?? null);
      else setCredits(null);
    } catch {
      setCredits(null);
    }
  }
  // Fetch issued history for current tenant
  async function fetchHistory() {
    try {
      const res = await fetch("/api/history", { cache: "no-store" });
      const ct = res.headers.get("content-type") || "";
      const data = ct.includes("application/json") ? await res.json() : { error: await res.text() };
      if (res.ok) setHistory((data as any).history ?? []);
      else setHistory([]);
    } catch {
      setHistory([]);
    }
  }

  useEffect(() => {
    fetchCredits();
    fetchHistory();
  }, []);

  async function callIssueRequest() {
    const res = await fetch("/api/issue-request", { method: "POST" });
    const ct = res.headers.get("content-type") || "";
    const data = ct.includes("application/json") ? await res.json() : { error: await res.text() };
    if (!res.ok) throw new Error((data as any)?.error || "issue-request failed");
    return data as { cid: string; verify_url: string; nonce: string };
  }
  async function callIssueFinal(body: { cid: string; sha256: string; doc_type: string }) {
    const res = await fetch("/api/issue-final", {
      method: "POST",
      headers: { "content-type": "application/json" },
      body: JSON.stringify(body),
    });
    const ct = res.headers.get("content-type") || "";
    const data = ct.includes("application/json") ? await res.json() : { error: await res.text() };
    if (!res.ok) throw new Error((data as any)?.error || "issue-final failed");
    return data;
  }

  const processFiles = useCallback(
    async (files: FileList) => {
      if (!files || files.length === 0) return;
      setLoading(true);
      setRows(Array.from(files).map((f) => ({ name: f.name, status: "pending" })));

      for (let i = 0; i < files.length; i++) {
        const file = files[i];
        try {
          const { cid, verify_url } = await callIssueRequest();
          const buf = await file.arrayBuffer();
          const stamped = await stampPdfWithQr(buf, verify_url);
          const sha = await sha256HexClient(stamped.buffer);
          const short = shortHash(sha);
          await callIssueFinal({ cid, sha256: sha, doc_type: "pdf" });
          // Auto‑download stamped PDF
          const blob = new Blob([stamped], { type: "application/pdf" });
          const url = URL.createObjectURL(blob);
          const fname = file.name.replace(/\.pdf$/i, "") + `_VC_${short}.pdf`;
          const a = document.createElement("a");
          a.href = url;
          a.download = fname;
          a.style.display = "none";
          document.body.appendChild(a);
          a.click();
          document.body.removeChild(a);
          URL.revokeObjectURL(url);

          setRows((prev) => {
            const copy = [...prev];
            copy[i] = { name: file.name, cid, verifyUrl: verify_url, sha256: sha, short, status: "issued" };
            return copy;
          });
          rememberFileName(sha, file.name);
        } catch (err: any) {
          setRows((prev) => {
            const copy = [...prev];
            copy[i] = { name: file.name, status: "error", message: err?.message || "Error" };
            return copy;
          });
        }
      }
      setLoading(false);
      fetchCredits();
      fetchHistory();
    },
    [rememberFileName],
  );

  const onFilePick = useCallback(
    (e: React.ChangeEvent<HTMLInputElement>) => {
      if (e.target.files) processFiles(e.target.files);
    },
    [processFiles],
  );

  const onDragOver = useCallback((e: React.DragEvent<HTMLLabelElement>) => {
    e.preventDefault();
    e.stopPropagation();
    setDragActive(true);
  }, []);
  const onDragLeave = useCallback((e: React.DragEvent<HTMLLabelElement>) => {
    e.preventDefault();
    e.stopPropagation();
    setDragActive(false);
  }, []);
  const onDrop = useCallback(
    (e: React.DragEvent<HTMLLabelElement>) => {
      e.preventDefault();
      e.stopPropagation();
      setDragActive(false);
      if (e.dataTransfer?.files?.length) processFiles(e.dataTransfer.files);
    },
    [processFiles],
  );

  const dropzoneClasses = `relative flex w-full flex-col items-center justify-center rounded-3xl border-2 border-dashed px-6 py-12 transition ${
    dragActive
      ? "border-sky-400/70 bg-sky-500/10 shadow-[0_0_0_1px_rgba(56,189,248,0.25)]"
      : "border-white/15 bg-white/5 hover:bg-white/10"
  }`;

  return (
    <div className="relative min-h-screen overflow-hidden bg-[#05060c] text-slate-100">
      <div className="pointer-events-none absolute inset-0 -z-10">
        <div className="absolute left-[-10%] top-[-25%] h-[420px] w-[420px] rounded-full bg-sky-500/20 blur-3xl" />
        <div className="absolute right-[-20%] top-[20%] h-[520px] w-[520px] rounded-full bg-emerald-400/10 blur-[140px]" />
        <div className="absolute inset-x-0 bottom-[-40%] h-[480px] bg-gradient-to-t from-[#05060c] via-transparent to-transparent" />
      </div>

      <header className="border-b border-white/10 bg-black/40 backdrop-blur">
        <div className="mx-auto flex max-w-6xl flex-col gap-5 px-6 py-6 sm:flex-row sm:items-center sm:justify-between">
          <div>
            <div className="flex items-center gap-3 text-xs uppercase tracking-[0.28em] text-white/50">
              <span className="rounded-full border border-white/10 px-3 py-1">Client Portal</span>
              <span>GecorpID VC</span>
            </div>
            <h1 className="mt-3 text-3xl font-semibold tracking-tight text-white sm:text-[34px]">
              Stamp verifiable PDFs in seconds
            </h1>
            <p className="mt-2 max-w-xl text-sm text-white/65">
              Generate tamper‑evident documents that your recipients can verify instantly with a QR code.
              Everything happens in the browser — your original files never leave your computer.
            </p>
          </div>
          <div className="flex flex-col items-start gap-3 sm:items-end">
            <span className="text-xs uppercase tracking-[0.3em] text-white/50">Credit balance</span>
            <div className="inline-flex items-center gap-2 rounded-full border border-white/15 bg-white/5 px-4 py-2 text-sm font-medium text-white">
              <span className="block h-2 w-2 rounded-full bg-emerald-400" aria-hidden />
              {credits ?? "—"}
            </div>
            <span className="text-xs text-white/60">
              1 credit issues one sealed PDF credential.
            </span>
          </div>
        </div>
      </header>

      <main className="mx-auto max-w-6xl space-y-14 px-6 pb-20 pt-12">
        <section className="grid gap-8 lg:grid-cols-[1.45fr_1fr]">
          <div className="rounded-3xl border border-white/10 bg-white/5 p-8 shadow-[0_40px_80px_rgba(8,15,40,0.55)] backdrop-blur-xl">
            <div className="flex flex-col gap-4 lg:flex-row lg:items-center lg:justify-between">
              <div>
                <h2 className="text-2xl font-semibold text-white">Issue new credentials</h2>
                <p className="mt-2 text-sm text-white/70">
                  Upload one or more PDF files to embed a discreet verification QR on every page.
                  We sign the resulting hash with your organization’s private key and return a sealed copy instantly.
                </p>
              </div>
              <ul className="grid gap-2 text-xs text-white/60">
                <li className="flex items-center gap-2">
                  <span className="inline-flex h-5 w-5 items-center justify-center rounded-full border border-white/15 bg-white/5 text-[10px] font-semibold">
                    1
                  </span>
                  Drop your PDF(s)
                </li>
                <li className="flex items-center gap-2">
                  <span className="inline-flex h-5 w-5 items-center justify-center rounded-full border border-white/15 bg-white/5 text-[10px] font-semibold">
                    2
                  </span>
                  We hash &amp; issue locally
                </li>
                <li className="flex items-center gap-2">
                  <span className="inline-flex h-5 w-5 items-center justify-center rounded-full border border-white/15 bg-white/5 text-[10px] font-semibold">
                    3
                  </span>
                  Download the sealed PDF
                </li>
              </ul>
            </div>

            <label
              className={`${dropzoneClasses} mt-8 cursor-pointer text-center text-sm text-white/70`}
              onDragOver={onDragOver}
              onDragLeave={onDragLeave}
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
                <div className="text-base font-medium text-white">Click or drop your PDFs</div>
                <div className="text-xs text-white/60">We accept multi-page PDFs up to 50 MB</div>
              </div>
              <input type="file" accept="application/pdf" multiple className="hidden" onChange={onFilePick} />
            </label>

            {loading && <div className="mt-6 text-sm text-white/70">Processing files… This runs entirely on your device.</div>}

            {rows.length > 0 && (
              <div className="mt-8 overflow-hidden rounded-2xl border border-white/10 bg-black/30">
                <table className="w-full min-w-full text-sm">
                  <thead className="bg-white/5 text-left text-white/60">
                    <tr>
                      <th className="px-4 py-3 font-medium">Document</th>
                      <th className="px-4 py-3 font-medium">Status</th>
                      <th className="px-4 py-3 font-medium">Code</th>
                      <th className="px-4 py-3 font-medium">Verify link</th>
                    </tr>
                  </thead>
                  <tbody>
                    {rows.map((r, i) => (
                      <tr key={i} className="border-t border-white/5 text-white/80">
                        <td className="px-4 py-3 align-top">
                          <div className="font-medium text-white/90">{r.name}</div>
                          {r.sha256 && (
                            <div className="text-[11px] text-white/45">SHA-256: {r.sha256.slice(0, 16)}…</div>
                          )}
                        </td>
                        <td className="px-4 py-3 align-top">
                          {r.status === "pending" && <span className="text-white/70">Issuing…</span>}
                          {r.status === "issued" && <span className="font-medium text-emerald-300">Issued</span>}
                          {r.status === "error" && <span className="text-rose-300">Error: {r.message}</span>}
                        </td>
                        <td className="px-4 py-3 align-top font-mono text-xs text-white/70">{r.short ?? "—"}</td>
                        <td className="px-4 py-3 align-top">
                          {r.verifyUrl ? (
                            <a
                              href={r.verifyUrl}
                              target="_blank"
                              rel="noreferrer"
                              className="inline-flex items-center gap-2 rounded-full border border-white/10 bg-white/5 px-3 py-1 text-xs font-medium text-sky-200 transition hover:border-sky-400/50 hover:text-sky-100"
                            >
                              Open verifier
                              <svg viewBox="0 0 16 16" className="h-3.5 w-3.5" fill="currentColor">
                                <path d="M6.75 3.5a.75.75 0 0 0 0 1.5h2.69L3.22 11.22a.75.75 0 1 0 1.06 1.06l6.22-6.22v2.69a.75.75 0 0 0 1.5 0V3.5a.75.75 0 0 0-.75-.75h-4.5z" />
                              </svg>
                            </a>
                          ) : (
                            <span className="text-white/50">—</span>
                          )}
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
                <div className="border-t border-white/5 bg-black/40 px-4 py-3 text-[11px] text-white/50">
                  The sealed PDF downloads automatically. Save it — the QR can always be revalidated online.
                </div>
              </div>
            )}
          </div>

          <aside className="flex h-fit flex-col gap-6 rounded-3xl border border-white/10 bg-black/30 p-6 shadow-[0_30px_80px_rgba(8,12,25,0.4)] backdrop-blur-xl">
            <div>
              <h3 className="text-lg font-semibold text-white">How verification works</h3>
              <p className="mt-2 text-sm text-white/70">
                Each QR encodes a secure link with the credential ID (CID). When someone scans it, they land on our
                verifier and are asked to drop the sealed PDF. We hash the file locally and compare it with the
                registered hash — no uploads, no data leaves the browser.
              </p>
            </div>
            <div className="grid gap-4 text-sm text-white/70">
              <div className="rounded-2xl border border-emerald-400/30 bg-emerald-400/10 p-4">
                <div className="text-xs uppercase tracking-[0.2em] text-emerald-200">Tip for verifiers</div>
                <p className="mt-2 text-sm text-emerald-100/90">
                  Request the sealed PDF from the issuer or the original recipient. Scanning the QR and matching the
                  file proves the document is unchanged and was issued by {""}
                  <span className="font-semibold text-white">GecorpID</span> on behalf of your organization.
                </p>
              </div>
              <div className="rounded-2xl border border-white/10 bg-white/5 p-4">
                <div className="text-xs uppercase tracking-[0.2em] text-white/60">Need to share?</div>
                <p className="mt-2">
                  Use the <span className="font-semibold text-white">Verify link</span> from the table or the QR itself.
                  Both point to the public verifier at <code className="rounded bg-black/50 px-1.5 py-0.5 text-[11px]">{`/v/{cid}`}</code>.
                </p>
              </div>
            </div>
          </aside>
        </section>

        <section className="rounded-3xl border border-white/10 bg-black/35 p-8 shadow-[0_30px_80px_rgba(6,10,25,0.45)] backdrop-blur-xl">
          <div className="flex flex-col gap-3 sm:flex-row sm:items-end sm:justify-between">
            <div>
              <h2 className="text-2xl font-semibold text-white">Issued credentials log</h2>
              <p className="mt-1 text-sm text-white/65">
                A snapshot of your most recent seals. File names are remembered locally for your convenience.
              </p>
            </div>
            <a
              href="/v"
              className="inline-flex items-center gap-2 rounded-full border border-white/10 bg-white/5 px-4 py-2 text-xs font-medium text-sky-200 transition hover:border-sky-300/50 hover:text-sky-100"
            >
              Go to public verifier
              <svg viewBox="0 0 16 16" className="h-3.5 w-3.5" fill="currentColor">
                <path d="M6.75 3.5a.75.75 0 0 0 0 1.5h2.69L3.22 11.22a.75.75 0 1 0 1.06 1.06l6.22-6.22v2.69a.75.75 0 0 0 1.5 0V3.5a.75.75 0 0 0-.75-.75h-4.5z" />
              </svg>
            </a>
          </div>

          {history.length === 0 ? (
            <div className="mt-6 rounded-2xl border border-dashed border-white/15 bg-white/5 px-6 py-10 text-center text-sm text-white/60">
              No credentials issued yet. As soon as you stamp a PDF, it will show up here with its verification status.
            </div>
          ) : (
            <div className="mt-6 overflow-hidden rounded-2xl border border-white/10">
              <table className="w-full min-w-full text-sm">
                <thead className="bg-white/5 text-left text-white/60">
                  <tr>
                    <th className="px-4 py-3 font-medium">Issued</th>
                    <th className="px-4 py-3 font-medium">Document</th>
                    <th className="px-4 py-3 font-medium">Code</th>
                    <th className="px-4 py-3 font-medium">Status</th>
                    <th className="px-4 py-3 font-medium">Verify</th>
                  </tr>
                </thead>
                <tbody>
                  {history.map((r, i) => {
                    const code = shortHash(r.sha256 || "");
                    const date = r.issued_at ? new Date(r.issued_at).toLocaleString() : "—";
                    const storedName = r.doc_filename || (r.sha256 ? nameIndex[r.sha256.toLowerCase()] : undefined);
                    return (
                      <tr key={i} className="border-t border-white/5 text-white/80">
                        <td className="whitespace-nowrap px-4 py-3 text-sm text-white/70">{date}</td>
                        <td className="px-4 py-3">
                          <div className="font-medium text-white/90">{storedName || "—"}</div>
                          <div className="text-[11px] text-white/45">CID: {r.cid}</div>
                        </td>
                        <td className="px-4 py-3 font-mono text-xs text-white/70">{code}</td>
                        <td className="px-4 py-3">
                          {r.status === "active" && <span className="rounded-full border border-emerald-400/40 bg-emerald-400/10 px-3 py-1 text-xs font-medium text-emerald-200">Active</span>}
                          {r.status === "revoked" && <span className="rounded-full border border-rose-400/40 bg-rose-500/10 px-3 py-1 text-xs font-medium text-rose-200">Revoked</span>}
                          {r.status !== "active" && r.status !== "revoked" && (
                            <span className="rounded-full border border-white/20 bg-white/5 px-3 py-1 text-xs text-white/70">{r.status}</span>
                          )}
                        </td>
                        <td className="px-4 py-3">
                          <a
                            href={`/v/${r.cid}`}
                            target="_blank"
                            rel="noreferrer"
                            className="inline-flex items-center gap-2 rounded-full border border-white/10 bg-white/5 px-3 py-1 text-xs font-medium text-sky-200 transition hover:border-sky-300/50 hover:text-sky-100"
                          >
                            Open
                            <svg viewBox="0 0 16 16" className="h-3.5 w-3.5" fill="currentColor">
                              <path d="M6.75 3.5a.75.75 0 0 0 0 1.5h2.69L3.22 11.22a.75.75 0 1 0 1.06 1.06l6.22-6.22v2.69a.75.75 0 0 0 1.5 0V3.5a.75.75 0 0 0-.75-.75h-4.5z" />
                            </svg>
                          </a>
                        </td>
                      </tr>
                    );
                  })}
                </tbody>
              </table>
            </div>
          )}
        </section>
      </main>
    </div>
  );
}
