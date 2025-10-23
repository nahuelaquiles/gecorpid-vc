"use client";

import React, { useCallback, useEffect, useMemo, useRef, useState } from "react";

/** ---------- Small utilities ---------- */

const STORAGE_KEY = "gecorpid-filenames"; // { [cid]: filename }

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
  issued_at: string | number | null;
  revoked_at?: string | number | null;
  doc_type?: string | null;
  // If your API ever sends a filename, we’ll use it; if not, we read localStorage.
  doc_filename?: string | null;
};

function shortHash(hex: string) {
  return (hex || "").slice(0, 8).toUpperCase();
}

async function sha256Hex(buf: ArrayBuffer): Promise<string> {
  const digest = await crypto.subtle.digest("SHA-256", buf);
  return [...new Uint8Array(digest)].map((b) => b.toString(16).padStart(2, "0")).join("");
}

function formatDate(d: string | number | null | undefined) {
  if (!d && d !== 0) return "—";
  const dt = new Date(d);
  return isNaN(dt.getTime()) ? "—" : dt.toLocaleString();
}

function loadNameMap(): Record<string, string> {
  try {
    const raw = localStorage.getItem(STORAGE_KEY);
    return raw ? (JSON.parse(raw) as Record<string, string>) : {};
  } catch {
    return {};
  }
}

function saveNameMap(map: Record<string, string>) {
  try {
    localStorage.setItem(STORAGE_KEY, JSON.stringify(map));
  } catch {
    /* ignore quota errors */
  }
}

/** ---------- API calls (kept as in your patch) ---------- */

async function callIssueRequest() {
  const res = await fetch("/api/issue-request", { method: "POST" });
  const ct = res.headers.get("content-type") || "";
  const data = ct.includes("application/json") ? await res.json() : { error: await res.text() };
  if (!res.ok) {
    const msg = (data as any)?.error || "issue-request failed";
    const err: any = new Error(msg);
    err.status = res.status;
    throw err;
  }
  return data as { cid: string; verify_url: string; nonce?: string };
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
  return data as { cid: string; sha256: string; doc_type: string; issued_at: string | null };
}

async function fetchCreditsApi() {
  const res = await fetch("/api/credits", { cache: "no-store" });
  const ct = res.headers.get("content-type") || "";
  const data = ct.includes("application/json") ? await res.json() : { error: await res.text() };
  if (!res.ok) return null;
  return (data as any)?.credits ?? null;
}

async function fetchHistoryApi() {
  const res = await fetch("/api/history", { cache: "no-store" });
  const ct = res.headers.get("content-type") || "";
  const data = ct.includes("application/json") ? await res.json() : { error: await res.text() };
  if (!res.ok) return [];
  // allow either `data.history` or bare array
  const body = data as any;
  return (Array.isArray(body) ? body : body.history) ?? [];
}

/** ---------- PDF stamping (lazy libs) ---------- */

/**
 * Stamps a compact QR badge (bottom-right) on every page.
 * - Subtle rounded plate, small margin to the edges, no vendor text.
 * - Returns stamped bytes (Uint8Array).
 */
async function stampPdfWithQrBadge(originalBytes: ArrayBuffer, verifyUrl: string): Promise<Uint8Array> {
  // Lazy-load to avoid SSR/bundle issues
  const { PDFDocument, rgb } = await import("pdf-lib");
  const qrMod: any = await import("qrcode");
  const QRCode = qrMod?.default ?? qrMod;

  const pdf = await PDFDocument.load(originalBytes);

  // Generate QR as PNG bytes from DataURL
  const dataUrl: string = await QRCode.toDataURL(verifyUrl, { errorCorrectionLevel: "M", margin: 0, scale: 6 });
  const b64 = dataUrl.split(",")[1] ?? "";
  const pngBytes = Uint8Array.from(atob(b64), (c) => c.charCodeAt(0));
  const png = await pdf.embedPng(pngBytes);

  // Scale down to ~88px square
  const maxSide = Math.max(png.width, png.height);
  const target = 88;
  const scale = target / maxSide;
  const dims = png.scale(scale);

  for (const page of pdf.getPages()) {
    const { width } = page.getSize();
    const inset = 14; // safe margin
    const pad = 6;

    const x = width - dims.width - inset;
    const y = inset;

    // Soft plate (subtle, not covering content too much)
    page.drawRectangle({
      x: x - pad,
      y: y - pad,
      width: dims.width + pad * 2,
      height: dims.height + pad * 2,
      color: rgb(1, 1, 1),
      opacity: 0.9,
      borderColor: rgb(230 / 255, 234 / 255, 240 / 255),
      borderWidth: 1,
    });

    page.drawImage(png, { x, y, width: dims.width, height: dims.height });
  }

  return pdf.save();
}

/** ---------- Page component ---------- */

export default function ClientPage() {
  const [rows, setRows] = useState<Row[]>([]);
  const [loading, setLoading] = useState(false);
  const [credits, setCredits] = useState<number | null>(null);
  const [dragActive, setDragActive] = useState(false);
  const [history, setHistory] = useState<HistoryRow[]>([]);
  const [nameMap, setNameMap] = useState<Record<string, string>>({});
  const [authError, setAuthError] = useState<string | null>(null);

  const fileInputRef = useRef<HTMLInputElement>(null);

  useEffect(() => {
    setNameMap(loadNameMap());
  }, []);

  useEffect(() => {
    (async () => {
      setAuthError(null);
      const [c, h] = await Promise.all([fetchCreditsApi(), fetchHistoryApi()]);
      setCredits(c);
      setHistory(h);
    })().catch(() => {
      /* ignore */
    });
  }, []);

  const creditsLabel = useMemo(() => {
    if (credits === null) return "Balance unavailable";
    if (credits === 0) return "No credits remaining";
    if (credits === 1) return "1 issuance credit left";
    return `${credits} issuance credits left`;
  }, [credits]);

  const rememberName = useCallback((cid: string, filename: string) => {
    setNameMap((prev) => {
      if (prev[cid] === filename) return prev;
      const next = { ...prev, [cid]: filename };
      saveNameMap(next);
      return next;
    });
  }, []);

  const handleFiles = useCallback(
    async (files: FileList | null) => {
      if (!files || files.length === 0) return;
      const file = files[0];

      setLoading(true);
      setAuthError(null);

      // optimistic row
      setRows((prev) => [
        { name: file.name, status: "pending", message: "Preparing issue request…" },
        ...prev,
      ]);

      try {
        // 1) Ask server for CID + verify URL
        const { cid, verify_url } = await callIssueRequest();

        // 2) Stamp original PDF with QR badge
        setRows((prev) => [{ ...prev[0], cid, verifyUrl: verify_url }, ...prev.slice(1)]);
        const originalBytes = await file.arrayBuffer();
        setRows((prev) => [{ ...prev[0], message: "Stamping PDF with secure QR…" }, ...prev.slice(1)]);
        const stampedBytes = await stampPdfWithQrBadge(originalBytes, verify_url);

        // 3) Compute hash of stamped PDF (canonical flow)
        const sha = await sha256Hex(stampedBytes);
        const code = shortHash(sha);

        // 4) Finalize issuance (server stores hash, decrements credits)
        setRows((prev) => [{ ...prev[0], message: "Finalizing issuance…" }, ...prev.slice(1)]);
        await callIssueFinal({ cid, sha256: sha, doc_type: "pdf" });

        // 5) Persist local filename mapping { cid → filename }
        rememberName(cid, file.name);

        // 6) Auto-download: <original>_VC_<SHORT>.pdf
        const blob = new Blob([stampedBytes], { type: "application/pdf" });
        const url = URL.createObjectURL(blob);
        const outName = `${file.name.replace(/\.pdf$/i, "")}_VC_${code}.pdf`;
        const a = document.createElement("a");
        a.href = url;
        a.download = outName;
        document.body.appendChild(a);
        a.click();
        a.remove();
        URL.revokeObjectURL(url);

        // 7) Update UI
        setRows((prev) => [{ ...prev[0], sha256: sha, short: code, status: "issued", message: "Issued successfully." }, ...prev.slice(1)]);
        const [c, h] = await Promise.all([fetchCreditsApi(), fetchHistoryApi()]);
        setCredits(c);
        setHistory(h);
      } catch (e: any) {
        if (e?.status === 401) setAuthError("Not authorized. Please sign in again or check your client API key/tenant.");
        setRows((prev) => [{ ...prev[0], status: "error", message: e?.message || "Failed to issue" }, ...prev.slice(1)]);
      } finally {
        setLoading(false);
      }
    },
    [rememberName],
  );

  const onDrop = useCallback(
    (e: React.DragEvent<HTMLDivElement>) => {
      e.preventDefault();
      e.stopPropagation();
      setDragActive(false);
      handleFiles(e.dataTransfer?.files || null);
    },
    [handleFiles],
  );

  return (
    <div className="min-h-screen bg-slate-50 text-slate-900">
      {/* Header / Hero */}
      <header className="relative overflow-hidden border-b border-slate-200 bg-white">
        <div className="absolute inset-0 bg-gradient-to-r from-sky-50 via-white to-transparent" />
        <div className="relative mx-auto flex max-w-6xl flex-col gap-8 px-6 py-12 lg:flex-row lg:items-center lg:justify-between">
          <div className="max-w-2xl space-y-4">
            <span className="inline-flex items-center gap-2 rounded-full border border-sky-200 bg-sky-50 px-3 py-1 text-xs font-semibold uppercase tracking-[0.28em] text-sky-600">
              Issuer workspace
            </span>
            <h1 className="text-4xl font-semibold tracking-tight text-slate-900">Issue verifiable PDFs</h1>
            <p className="text-base text-slate-600">
              We never upload your PDF. A small QR is stamped bottom-right. The browser computes the SHA-256 of the stamped
              file locally and the credential is registered server-side.
            </p>
            <div className="flex flex-wrap items-center gap-3 text-sm text-slate-600">
              <div className="inline-flex items-center gap-2 rounded-full border border-slate-200 bg-white px-3 py-1 font-medium text-slate-700">
                <span className="inline-block h-2 w-2 rounded-full bg-emerald-500" aria-hidden />
                {creditsLabel}
              </div>
            </div>
          </div>

          <div className="grid gap-3 rounded-2xl border border-slate-200 bg-white/80 p-6 text-sm text-slate-600 shadow-xl shadow-slate-200/60">
            <h2 className="text-lg font-semibold text-slate-800">How it works</h2>
            <ul className="grid gap-2">
              <li className="flex items-start gap-3">
                <span className="mt-1 inline-flex h-6 w-6 items-center justify-center rounded-full bg-sky-500 text-xs font-semibold text-white">
                  1
                </span>
                Drop or pick a PDF to generate a sealed copy with a verification QR.
              </li>
              <li className="flex items-start gap-3">
                <span className="mt-1 inline-flex h-6 w-6 items-center justify-center rounded-full bg-sky-500 text-xs font-semibold text-white">
                  2
                </span>
                We compute the SHA-256 hash of the stamped PDF locally and register the credential.
              </li>
              <li className="flex items-start gap-3">
                <span className="mt-1 inline-flex h-6 w-6 items-center justify-center rounded-full bg-sky-500 text-xs font-semibold text-white">
                  3
                </span>
                You receive the stamped file instantly. Anyone can verify it via the QR.
              </li>
            </ul>
          </div>
        </div>
      </header>

      {/* Main */}
      <main className="mx-auto flex max-w-6xl flex-col gap-12 px-6 py-12">
        {/* Uploader / Issuance */}
        <section className="grid gap-6 rounded-3xl border border-slate-200 bg-white/90 p-8 shadow-2xl shadow-slate-200/70 lg:grid-cols-[1.4fr_1fr]">
          <div>
            <div className="flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
              <div>
                <h2 className="text-2xl font-semibold text-slate-900">Upload and seal</h2>
                <p className="text-sm text-slate-600">
                  Drag a PDF into this panel or click to browse. We stamp each page with a discreet QR at the bottom-right.
                </p>
              </div>
              <div className="text-xs text-slate-500">
                Supported format: <span className="font-medium text-slate-700">PDF</span>
              </div>
            </div>

            <div
              className={`mt-6 flex min-height-[220px] min-h-[220px] flex-col items-center justify-center rounded-2xl border-2 border-dashed px-6 py-12 text-center transition ${
                dragActive
                  ? "border-sky-400 bg-sky-50"
                  : "border-slate-200 bg-slate-50 hover:border-sky-200 hover:bg-sky-50/60"
              }`}
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
              onClick={() => fileInputRef.current?.click()}
              role="button"
              aria-label="Upload PDF"
              title="Click to browse or drag & drop a PDF"
            >
              <div className="pointer-events-none flex flex-col items-center gap-4 text-slate-600">
                <div className="flex h-14 w-14 items-center justify-center rounded-full border border-slate-200 bg-white text-sky-500">
                  <svg viewBox="0 0 24 24" className="h-7 w-7" fill="none" stroke="currentColor" strokeWidth="1.5">
                    <path d="M12 5v14" strokeLinecap="round" />
                    <path d="M5 12h14" strokeLinecap="round" />
                    <rect x="3" y="3" width="18" height="18" rx="4" />
                  </svg>
                </div>
                <div className="text-lg font-semibold text-slate-800">Drop a PDF to start</div>
                <p className="text-sm text-slate-500">We never upload or store your documents.</p>
              </div>
              <input
                ref={fileInputRef}
                type="file"
                accept="application/pdf"
                className="hidden"
                onChange={(e) => handleFiles(e.target.files)}
              />
            </div>

            <div className="mt-6 space-y-4">
              {loading && <div className="text-sm text-slate-500">Processing document…</div>}
              {authError && <div className="text-sm text-rose-600">{authError}</div>}
              {rows.map((row, index) => (
                <article
                  key={`${row.name}-${index}`}
                  className="rounded-2xl border border-slate-200 bg-white p-4 shadow-sm shadow-slate-200/60"
                >
                  <div className="flex flex-wrap items-center justify-between gap-2">
                    <div className="space-y-1">
                      <div className="text-sm font-semibold text-slate-800">{row.name}</div>
                      {row.short && (
                        <div className="text-xs text-slate-500">
                          Issuance code <span className="font-mono text-slate-700">{row.short}</span>
                        </div>
                      )}
                    </div>
                    <div>
                      {row.status === "pending" && (
                        <span className="inline-flex items-center gap-2 rounded-full border border-amber-300 bg-amber-100/80 px-3 py-1 text-xs font-medium text-amber-800">
                          <span className="h-1.5 w-1.5 animate-pulse rounded-full bg-amber-500" aria-hidden />
                          In progress
                        </span>
                      )}
                      {row.status === "issued" && (
                        <span className="inline-flex items-center gap-2 rounded-full border border-emerald-300 bg-emerald-100/80 px-3 py-1 text-xs font-medium text-emerald-800">
                          <span className="h-1.5 w-1.5 rounded-full bg-emerald-500" aria-hidden />
                          Issued
                        </span>
                      )}
                      {row.status === "error" && (
                        <span className="inline-flex items-center gap-2 rounded-full border border-rose-300 bg-rose-100 px-3 py-1 text-xs font-medium text-rose-800">
                          <span className="h-1.5 w-1.5 rounded-full bg-rose-500" aria-hidden />
                          Failed
                        </span>
                      )}
                    </div>
                  </div>
                  {row.message && <p className="mt-3 text-xs text-slate-500">{row.message}</p>}
                  {row.verifyUrl && (
                    <div className="mt-3 text-xs text-slate-500">
                      Verifier link:{" "}
                      <a
                        href={row.verifyUrl}
                        target="_blank"
                        rel="noreferrer"
                        className="font-medium text-sky-600 hover:text-sky-700"
                      >
                        {row.verifyUrl}
                      </a>
                    </div>
                  )}
                </article>
              ))}
            </div>
          </div>

          <aside className="flex flex-col gap-6 rounded-2xl border border-slate-200 bg-slate-50/80 p-6 text-sm text-slate-600">
            <div>
              <h3 className="text-lg font-semibold text-slate-900">Why the verifier may ask for your PDF</h3>
              <p className="mt-2">
                The QR encodes a link to the verification page. There, the browser can hash your PDF locally and compare
                it with the registered digest. Nothing is uploaded; the prompt exists only to compute the hash on your device.
              </p>
            </div>
            <div>
              <h3 className="text-lg font-semibold text-slate-900">Best practices</h3>
              <ul className="mt-2 space-y-2">
                <li className="flex gap-2">
                  <span className="mt-1 h-1.5 w-1.5 rounded-full bg-sky-500" aria-hidden />
                  Keep the sealed copy you send; the verifier highlights mismatches instantly.
                </li>
                <li className="flex gap-2">
                  <span className="mt-1 h-1.5 w-1.5 rounded-full bg-sky-500" aria-hidden />
                  If you revoke a credential, the verifier page will show the revoked status in real time.
                </li>
                <li className="flex gap-2">
                  <span className="mt-1 h-1.5 w-1.5 rounded-full bg-sky-500" aria-hidden />
                  We store filenames only in your browser for privacy.
                </li>
              </ul>
            </div>
          </aside>
        </section>

        {/* Issued history */}
        <section className="rounded-3xl border border-slate-200 bg-white p-8 shadow-2xl shadow-slate-200/70">
          <div className="flex flex-col gap-3 sm:flex-row sm:items-end sm:justify-between">
            <div>
              <h2 className="text-2xl font-semibold text-slate-900">Issued credentials</h2>
              <p className="text-sm text-slate-600">Filenames are remembered locally per credential ID.</p>
            </div>
            <a
              href="/v"
              className="inline-flex items-center gap-2 rounded-full border border-sky-200 bg-sky-50 px-4 py-2 text-xs font-medium text-sky-700 transition hover:border-sky-300 hover:bg-sky-100"
            >
              Open verifier portal
              <svg viewBox="0 0 16 16" className="h-3.5 w-3.5" fill="currentColor">
                <path d="M6.75 3.5a.75.75 0 0 0 0 1.5h2.69L3.22 11.22a.75.75 0 1 0 1.06 1.06l6.22-6.22v2.69a.75.75 0 0 0 1.5 0V3.5a.75.75 0 0 0-.75-.75h-4.5z" />
              </svg>
            </a>
          </div>

          {history.length === 0 ? (
            <div className="mt-6 rounded-2xl border border-dashed border-slate-200 bg-slate-50 px-6 py-10 text-center text-sm text-slate-500">
              No credentials issued yet. Once you stamp a PDF, it appears here with status and verifier link.
            </div>
          ) : (
            <div className="mt-6 overflow-hidden rounded-2xl border border-slate-200">
              <table className="w-full min-w-full text-sm">
                <thead className="bg-slate-50 text-left text-slate-500">
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
                    const date = formatDate(r.issued_at);
                    const localName =
                      r.doc_filename || (r.cid && nameMap[r.cid]) || "(local name unavailable)";

                    return (
                      <tr key={i} className="border-t border-slate-100 text-slate-700">
                        <td className="whitespace-nowrap px-4 py-3 text-sm text-slate-600">{date}</td>
                        <td className="px-4 py-3">
                          <div className="font-medium text-slate-800">{localName}</div>
                          <div className="text-[11px] text-slate-400">CID: {r.cid}</div>
                        </td>
                        <td className="px-4 py-3 font-mono text-xs text-slate-500">{code}</td>
                        <td className="px-4 py-3">
                          {r.status === "active" ? (
                            <span className="rounded-full border border-emerald-300 bg-emerald-100/90 px-3 py-1 text-xs font-medium text-emerald-700">
                              Active
                            </span>
                          ) : r.status === "revoked" ? (
                            <span className="rounded-full border border-rose-300 bg-rose-100/90 px-3 py-1 text-xs font-medium text-rose-700">
                              Revoked
                            </span>
                          ) : (
                            <span className="rounded-full border border-slate-200 bg-slate-100 px-3 py-1 text-xs text-slate-600">
                              {r.status}
                            </span>
                          )}
                        </td>
                        <td className="px-4 py-3">
                          <a
                            href={`/v/${r.cid}`}
                            target="_blank"
                            rel="noreferrer"
                            className="inline-flex items-center gap-2 rounded-full border border-sky-200 bg-sky-50 px-3 py-1 text-xs font-medium text-sky-700 transition hover:border-sky-300 hover:bg-sky-100"
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
