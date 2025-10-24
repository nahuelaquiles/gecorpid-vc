"use client";

import React, { useCallback, useEffect, useMemo, useRef, useState } from "react";

/** ---------- Small utilities ---------- */

const STORAGE_KEY = "gecorpid-filenames"; // { [cid]: filename }

type Row = {
  id: string; // nuevo: id único para actualizar filas correctamente
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
  doc_filename?: string | null;
};

function uid() {
  return Math.random().toString(36).slice(2) + Date.now().toString(36);
}

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

/** ---------- API calls ---------- */

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
  const body = data as any;
  return (Array.isArray(body) ? body : body.history) ?? [];
}

/** ---------- PDF stamping (lazy libs) ---------- */

/**
 * Stamps a compact QR badge (bottom-right) on every page.
 * Subtle plate, small margin, no vendor text.
 */
async function stampPdfWithQrBadge(originalBytes: ArrayBuffer, verifyUrl: string): Promise<Uint8Array> {
  const { PDFDocument, rgb } = await import("pdf-lib");
  const qrMod: any = await import("qrcode");
  const QRCode = qrMod?.default ?? qrMod;

  const pdf = await PDFDocument.load(originalBytes);

  const dataUrl: string = await QRCode.toDataURL(verifyUrl, { errorCorrectionLevel: "M", margin: 0, scale: 6 });
  const b64 = dataUrl.split(",")[1] ?? "";
  const pngBytes = Uint8Array.from(atob(b64), (c) => c.charCodeAt(0));
  const png = await pdf.embedPng(pngBytes);

  const maxSide = Math.max(png.width, png.height);
  const target = 88; // ~88px square
  const scale = target / maxSide;
  const dims = png.scale(scale);

  for (const page of pdf.getPages()) {
    const { width } = page.getSize();
    const inset = 14; // safe margin
    const pad = 6;

    const x = width - dims.width - inset;
    const y = inset;

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

  // helper para actualizar una fila por id
  const updateRow = useCallback((id: string, patch: Partial<Row>) => {
    setRows((prev) => prev.map((r) => (r.id === id ? { ...r, ...patch } : r)));
  }, []);

  // Procesa un único archivo (flujo original, pero aislado)
  const processOneFile = useCallback(
    async (file: File) => {
      const id = uid();
      setRows((prev) => [
        {
          id,
          name: file.name,
          status: "pending",
          message: "Preparing issue request…",
        },
        ...prev,
      ]);

      try {
        // 1) Pedir CID + verify URL
        const { cid, verify_url } = await callIssueRequest();
        updateRow(id, { cid, verifyUrl: verify_url });

        // 2) Estampar PDF con QR
        updateRow(id, { message: "Stamping PDF with secure QR…" });
        const originalBytes = await file.arrayBuffer();
        const stampedBytes = await stampPdfWithQrBadge(originalBytes, verify_url);

        // 3) Hash del PDF estampado
        const sha = await sha256Hex(stampedBytes);
        const code = shortHash(sha);

        // 4) Finalizar emisión
        updateRow(id, { message: "Finalizing issuance…" });
        await callIssueFinal({ cid, sha256: sha, doc_type: "pdf" });

        // 5) Guardar mapeo local { cid → filename }
        rememberName(cid, file.name);

        // 6) Autodescarga: <original>_VC_<SHORT>.pdf
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

        // 7) UI + refrescar créditos/historial
        updateRow(id, { sha256: sha, short: code, status: "issued", message: "Issued successfully." });
        const [c, h] = await Promise.all([fetchCreditsApi(), fetchHistoryApi()]);
        setCredits(c);
        setHistory(h);
      } catch (e: any) {
        if (e?.status === 401) setAuthError("Not authorized. Please sign in again or check your client API key/tenant.");
        updateRow(id, { status: "error", message: e?.message || "Failed to issue" });
      }
    },
    [rememberName, updateRow],
  );

  const handleFiles = useCallback(
    async (files: FileList | null) => {
      if (!files || files.length === 0) return;

      // Filtrar solo PDFs
      const list = Array.from(files).filter((f) => f.type === "application/pdf" || /\.pdf$/i.test(f.name));
      if (list.length === 0) return;

      setLoading(true);
      setAuthError(null);

      try {
        // Procesar secuencialmente para no quemar la RAM/CPU
        for (const file of list) {
          // eslint-disable-next-line no-await-in-loop
          await processOneFile(file);
        }
      } finally {
        setLoading(false);
      }
    },
    [processOneFile],
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
    <div className="relative min-h-screen overflow-hidden bg-slate-950 text-slate-100">
      <div
        className="pointer-events-none absolute inset-0 bg-[radial-gradient(130%_140%_at_15%_10%,rgba(56,189,248,0.16),transparent_55%),radial-gradient(120%_120%_at_85%_-10%,rgba(165,180,252,0.14),transparent_60%),linear-gradient(180deg,#020617,rgba(2,6,23,0.92))]"
        aria-hidden
      />

      {/* Header / Hero */}
      <header className="relative mx-auto max-w-6xl px-6 pb-16 pt-20">
        <div className="grid gap-10 rounded-3xl border border-white/10 bg-white/5 p-8 shadow-2xl shadow-black/40 backdrop-blur-lg lg:grid-cols-[1.4fr_1fr] lg:gap-12">
          <div className="max-w-2xl space-y-6">
            <div className="inline-flex items-center gap-2 rounded-full border border-sky-400/40 bg-sky-500/10 px-4 py-1 text-[11px] font-semibold uppercase tracking-[0.28em] text-sky-200">
              Issuer workspace
            </div>
            <div className="space-y-4">
              <h1 className="text-4xl font-semibold tracking-tight text-white md:text-5xl">
                Issue verifiable PDFs in minutes
              </h1>
              <p className="text-base text-slate-200/90">
                Drop one or more PDFs to mint sealed copies with a discreet QR badge. Hashing happens in the browser, so the originals never leave your device. The credential registry is updated instantly.
              </p>
            </div>
            <div className="flex flex-wrap items-center gap-3 text-sm text-slate-300">
              <div className="inline-flex items-center gap-2 rounded-full border border-emerald-400/40 bg-emerald-500/10 px-3 py-1 font-medium text-emerald-200">
                <span className="inline-block h-2 w-2 rounded-full bg-emerald-300" aria-hidden />
                {creditsLabel}
              </div>
              {/* Botón “Open verifier portal” eliminado porque /v no tiene index y causa 404 */}
            </div>
          </div>

          <div className="grid gap-3 rounded-2xl border border-white/10 bg-slate-900/60 p-6 text-sm text-slate-200">
            <h2 className="text-lg font-semibold text-white">How it works</h2>
            <ul className="grid gap-3">
              <li className="flex items-start gap-3">
                <span className="mt-0.5 inline-flex h-7 w-7 items-center justify-center rounded-full bg-sky-500 text-xs font-semibold text-white">1</span>
                Drop or pick one or more PDFs to generate sealed copies with a verification QR.
              </li>
              <li className="flex items-start gap-3">
                <span className="mt-0.5 inline-flex h-7 w-7 items-center justify-center rounded-full bg-sky-500 text-xs font-semibold text-white">2</span>
                The browser computes the SHA-256 hash of each sealed PDF and registers the credential.
              </li>
              <li className="flex items-start gap-3">
                <span className="mt-0.5 inline-flex h-7 w-7 items-center justify-center rounded-full bg-sky-500 text-xs font-semibold text-white">3</span>
                We auto-download each stamped file; the verifier page for each CID goes live instantly.
              </li>
            </ul>
          </div>
        </div>
      </header>

      {/* Main */}
      <main className="relative mx-auto flex max-w-6xl flex-col gap-12 px-6 pb-20">
        {/* Uploader / Issuance */}
        <section className="grid gap-8 rounded-3xl border border-white/10 bg-white/5 p-8 shadow-2xl shadow-black/40 backdrop-blur lg:grid-cols-[1.45fr_1fr]">
          <div>
            <div className="flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
              <div className="space-y-1.5">
                <h2 className="text-2xl font-semibold text-white">Upload and seal</h2>
                <p className="text-sm text-slate-200/80">
                  Drag one or more PDFs into this panel or click to browse. Every page receives a subtle QR badge anchored to the bottom-right margin.
                </p>
              </div>
              <div className="text-[11px] uppercase tracking-[0.24em] text-slate-400">
                Format: <span className="font-semibold text-slate-200">PDF</span>
              </div>
            </div>

            <label
              htmlFor="client-pdf-upload"
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
                <div className="text-lg font-semibold text-white">Drop one or more PDFs to start</div>
                <p className="text-sm text-slate-300/80">We never upload or store your documents; hashing stays on this device.</p>
              </div>
              <input
                id="client-pdf-upload"
                ref={fileInputRef}
                type="file"
                accept="application/pdf"
                multiple
                className="hidden"
                onChange={(e) => handleFiles(e.target.files)}
              />
            </label>

            <div className="mt-6 space-y-4 text-sm text-slate-200/90">
              {loading && (
                <div className="flex items-center gap-2 text-slate-300">
                  <span className="h-1.5 w-1.5 animate-pulse rounded-full bg-sky-300" aria-hidden />
                  Processing document{rows.length !== 1 ? "s" : ""}…
                </div>
              )}
              {authError && <div className="rounded-xl border border-rose-400/40 bg-rose-500/10 px-4 py-3 text-sm text-rose-200">{authError}</div>}
              {rows.map((row) => (
                <article
                  key={row.id}
                  className="rounded-2xl border border-white/10 bg-slate-900/60 p-5 shadow-inner shadow-black/20"
                >
                  <div className="flex flex-wrap items-center justify-between gap-3">
                    <div className="space-y-1">
                      <div className="text-sm font-semibold text-white">{row.name}</div>
                      {row.short && (
                        <div className="text-xs text-slate-300/90">
                          Issuance code <span className="font-mono text-sky-200">{row.short}</span>
                        </div>
                      )}
                    </div>
                    <div>
                      {row.status === "pending" && (
                        <span className="inline-flex items-center gap-2 rounded-full border border-amber-400/50 bg-amber-500/10 px-3 py-1 text-xs font-medium text-amber-200">
                          <span className="h-1.5 w-1.5 animate-pulse rounded-full bg-amber-300" aria-hidden />
                          In progress
                        </span>
                      )}
                      {row.status === "issued" && (
                        <span className="inline-flex items-center gap-2 rounded-full border border-emerald-400/50 bg-emerald-500/10 px-3 py-1 text-xs font-medium text-emerald-200">
                          <span className="h-1.5 w-1.5 rounded-full bg-emerald-300" aria-hidden />
                          Issued
                        </span>
                      )}
                      {row.status === "error" && (
                        <span className="inline-flex items-center gap-2 rounded-full border border-rose-400/60 bg-rose-500/10 px-3 py-1 text-xs font-medium text-rose-200">
                          <span className="h-1.5 w-1.5 rounded-full bg-rose-300" aria-hidden />
                          Failed
                        </span>
                      )}
                    </div>
                  </div>
                  {row.message && <p className="mt-3 text-xs text-slate-300/80">{row.message}</p>}
                  {row.verifyUrl && (
                    <div className="mt-3 text-xs text-slate-300/80">
                      Verifier link:{" "}
                      <a
                        href={row.verifyUrl}
                        target="_blank"
                        rel="noreferrer"
                        className="font-semibold text-sky-200 hover:text-sky-100"
                      >
                        {row.verifyUrl}
                      </a>
                    </div>
                  )}
                </article>
              ))}
            </div>
          </div>

          <aside className="flex flex-col gap-6 rounded-2xl border border-white/10 bg-slate-900/60 p-6 text-sm text-slate-200">
            <div className="space-y-2">
              <h3 className="text-lg font-semibold text-white">Why the verifier may ask for your PDF</h3>
              <p className="text-slate-300/85">
                The QR contains only a link to the verifier. When you load the PDF here, hashing happens locally so the browser can prove the contents match what you issued without transmitting the document.
              </p>
            </div>
            <div className="space-y-2">
              <h3 className="text-lg font-semibold text-white">Best practices</h3>
              <ul className="space-y-2 text-slate-300/85">
                <li className="flex gap-3">
                  <span className="mt-1 inline-flex h-1.5 w-1.5 rounded-full bg-sky-300" aria-hidden />
                  Keep the sealed copies you deliver. The verifier highlights mismatches instantly.
                </li>
                <li className="flex gap-3">
                  <span className="mt-1 inline-flex h-1.5 w-1.5 rounded-full bg-sky-300" aria-hidden />
                  Revoked credentials show their status in real time on the verifier page.
                </li>
                <li className="flex gap-3">
                  <span className="mt-1 inline-flex h-1.5 w-1.5 rounded-full bg-sky-300" aria-hidden />
                  Filenames stay in this browser only. We never persist them server-side.
                </li>
              </ul>
            </div>
            <div className="rounded-xl border border-white/10 bg-white/5 p-4 text-xs text-slate-300/85">
              <div className="font-semibold uppercase tracking-[0.24em] text-slate-400">Need a reminder?</div>
              <p className="mt-2">
                Share the verifier link with recipients. They can upload the sealed PDF or scan the QR to confirm authenticity without contacting your team.
              </p>
            </div>
          </aside>
        </section>

        {/* Issued history */}
        <section className="rounded-3xl border border-white/10 bg-white/5 p-8 shadow-2xl shadow-black/40 backdrop-blur">
          <div className="flex flex-col gap-3 sm:flex-row sm:items-end sm:justify-between">
            <div>
              <h2 className="text-2xl font-semibold text-white">Issued credentials</h2>
              <p className="text-sm text-slate-300/85">Filenames are remembered locally per credential ID.</p>
            </div>
          </div>

          {history.length === 0 ? (
            <div className="mt-6 rounded-2xl border border-white/10 bg-slate-900/60 px-6 py-10 text-center text-sm text-slate-300">
              No credentials issued yet. Once you stamp a PDF, it appears here with status and verifier link.
            </div>
          ) : (
            <div className="mt-6 overflow-hidden rounded-2xl border border-white/10">
              <table className="w-full min-w-full text-sm text-slate-200/90">
                <thead className="bg-white/5 text-left text-xs uppercase tracking-[0.18em] text-slate-400">
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
                      <tr key={i} className="border-t border-white/10 text-slate-200/90">
                        <td className="whitespace-nowrap px-4 py-3 text-sm text-slate-300/85">{date}</td>
                        <td className="px-4 py-3">
                          <div className="font-medium text-white">{localName}</div>
                          <div className="text-[11px] text-slate-400">CID: {r.cid}</div>
                        </td>
                        <td className="px-4 py-3 font-mono text-xs text-sky-200">{code}</td>
                        <td className="px-4 py-3">
                          {r.status === "active" ? (
                            <span className="rounded-full border border-emerald-400/60 bg-emerald-500/10 px-3 py-1 text-xs font-medium text-emerald-200">
                              Active
                            </span>
                          ) : r.status === "revoked" ? (
                            <span className="rounded-full border border-rose-400/60 bg-rose-500/10 px-3 py-1 text-xs font-medium text-rose-200">
                              Revoked
                            </span>
                          ) : (
                            <span className="rounded-full border border-white/10 bg-white/5 px-3 py-1 text-xs text-slate-200/85">
                              {r.status}
                            </span>
                          )}
                        </td>
                        <td className="px-4 py-3">
                          <a
                            href={`/v/${r.cid}`}
                            target="_blank"
                            rel="noreferrer"
                            className="inline-flex items-center gap-2 rounded-full border border-white/15 bg-white/10 px-3 py-1 text-xs font-semibold text-sky-200 transition hover:border-white/25 hover:bg-white/20"
                          >
                            Open
                            <svg viewBox="0 0 16 16" className="h-3.5 w-3.5" fill="currentColor" aria-hidden>
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
