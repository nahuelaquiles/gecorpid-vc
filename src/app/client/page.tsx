"use client";

import React, { useCallback, useEffect, useState } from "react";
import QRCode from "qrcode";
import { PDFDocument, StandardFonts, rgb } from "pdf-lib";

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
 * Stamp every page of a PDF with a QR code pointing to verifyUrl. The QR card
 * contains a label and subtitle to explain the credential. Returns a new PDF
 * as a Uint8Array.
 */
async function stampPdfWithQr(pdfBytes: ArrayBuffer, verifyUrl: string): Promise<Uint8Array> {
  const pdf = await PDFDocument.load(pdfBytes);
  const pages = pdf.getPages();
  const font = await pdf.embedFont(StandardFonts.HelveticaBold);
  const qrDataUrl = await QRCode.toDataURL(verifyUrl, { errorCorrectionLevel: "M", margin: 1, scale: 6 });
  const pngBytes = Uint8Array.from(atob(qrDataUrl.split(",")[1]), (c) => c.charCodeAt(0));
  const pngImage = await pdf.embedPng(pngBytes);
  const pngDims = pngImage.scale(0.45);
  pages.forEach((p) => {
    const { width, height } = p.getSize();
    const margin = 24;
    const boxW = pngDims.width + 24;
    const boxH = pngDims.height + 54;
    // card background
    p.drawRectangle({
      x: width - boxW - margin,
      y: height - boxH - margin,
      width: boxW,
      height: boxH,
      color: rgb(1, 1, 1),
      borderColor: rgb(0.87, 0.9, 0.95),
      borderWidth: 1,
      opacity: 0.95,
    });
    // label
    p.drawText("Verifiable Digital Credential", {
      x: width - boxW - margin + 12,
      y: height - boxH - margin + boxH - 18,
      size: 9,
      font,
      color: rgb(0.08, 0.1, 0.16),
    });
    // subtitle
    p.drawText("developed by gecorp.com.ar", {
      x: width - boxW - margin + 12,
      y: height - boxH - margin + boxH - 32,
      size: 7,
      font,
      color: rgb(0.25, 0.28, 0.35),
    });
    // QR image
    p.drawImage(pngImage, {
      x: width - boxW - margin + 12,
      y: height - boxH - margin + 10,
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
};

export default function ClientPage() {
  const [rows, setRows] = useState<Row[]>([]);
  const [loading, setLoading] = useState(false);
  const [credits, setCredits] = useState<number | null>(null);
  const [dragActive, setDragActive] = useState(false);
  const [history, setHistory] = useState<HistoryRow[]>([]);

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
    [],
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

  return (
    <div className="min-h-screen bg-slate-50 text-slate-900">
      <header className="sticky top-0 z-10 bg-white/80 backdrop-blur border-b border-slate-200">
        <div className="mx-auto max-w-3xl px-4 py-3 flex items-center justify-between">
          <div className="leading-tight">
            <div className="font-semibold">GecorpID • VC</div>
            <div className="text-xs text-slate-500">Local issuance of verifiable PDFs</div>
          </div>
          <div className="text-sm text-slate-600">
            Credits:&nbsp;
            <span className="inline-flex items-center rounded-full bg-emerald-50 px-2 py-0.5 text-emerald-700 border border-emerald-200">
              {credits ?? "—"}
            </span>
          </div>
        </div>
      </header>

      <main className="mx-auto max-w-3xl px-4 py-8 space-y-12">
        {/* Issuance form */}
        <div className="rounded-2xl bg-white shadow-soft border border-slate-200 p-6">
          <h1 className="text-xl font-semibold mb-3">Issue verifiable credentials for your PDFs</h1>
          <p className="text-sm text-slate-600 mb-5">
            Drop one or more PDF files below. The app will stamp a QR code, compute the SHA‑256 hash locally,
            send the hash to the server to create a verifiable credential, and automatically download the sealed
            PDF. Your PDFs never leave your computer.
          </p>
          <label
            className={`flex w-full items-center justify-center rounded-2xl border-2 border-dashed px-5 py-10 cursor-pointer ${
              dragActive ? "bg-slate-100 border-slate-400" : "bg-slate-50 hover:bg-slate-100 border-slate-300"
            }`}
            onDragOver={onDragOver}
            onDragLeave={onDragLeave}
            onDrop={onDrop}
          >
            <div className="text-slate-600 text-center">
              <div className="font-medium">Click or drag your PDFs here</div>
              <div className="text-xs">One verifiable credential will be issued per file</div>
            </div>
            <input type="file" accept="application/pdf" multiple className="hidden" onChange={onFilePick} />
          </label>
          {loading && <div className="mt-4 text-sm text-slate-600">Processing…</div>}
          {rows.length > 0 && (
            <div className="mt-6 overflow-x-auto">
              <table className="w-full text-sm">
                <thead>
                  <tr className="text-left text-slate-500">
                    <th className="py-2">File</th>
                    <th className="py-2">Result</th>
                    <th className="py-2">Code</th>
                    <th className="py-2">Verify</th>
                  </tr>
                </thead>
                <tbody>
                  {rows.map((r, i) => (
                    <tr key={i} className="border-t border-slate-200">
                      <td className="py-2 whitespace-nowrap">{r.name}</td>
                      <td className="py-2">
                        {r.status === "pending" && <span className="text-slate-600">issuing…</span>}
                        {r.status === "issued" && <span className="text-emerald-700">issued ✔</span>}
                        {r.status === "error" && <span className="text-rose-700">error: {r.message}</span>}
                      </td>
                      <td className="py-2">{r.short ?? "—"}</td>
                      <td className="py-2">
                        {r.verifyUrl ? (
                          <a href={r.verifyUrl} target="_blank" className="text-sky-700 underline">
                            Open
                          </a>
                        ) : (
                          "—"
                        )}
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
              <div className="mt-4 text-xs text-slate-500">
                Note: The stamped PDF is downloaded automatically; you can also use the verification link.
              </div>
            </div>
          )}
        </div>

        {/* Issued history section */}
        <div className="rounded-2xl bg-white shadow-soft border border-slate-200 p-6">
          <h2 className="text-lg font-semibold mb-3">Issued credentials</h2>
          {history.length === 0 ? (
            <p className="text-sm text-slate-600">No credentials issued yet.</p>
          ) : (
            <div className="overflow-x-auto">
              <table className="w-full text-sm">
                <thead>
                  <tr className="text-left text-slate-500">
                    <th className="py-2">Date</th>
                    <th className="py-2">Code</th>
                    <th className="py-2">Status</th>
                    <th className="py-2">Verify</th>
                  </tr>
                </thead>
                <tbody>
                  {history.map((r, i) => {
                    const code = shortHash(r.sha256 || "");
                    const date = r.issued_at ? new Date(r.issued_at).toLocaleString() : "";
                    return (
                      <tr key={i} className="border-t border-slate-200">
                        <td className="py-2 whitespace-nowrap">{date}</td>
                        <td className="py-2 whitespace-nowrap">{code}</td>
                        <td className="py-2 whitespace-nowrap">
                          {r.status === "active" && <span className="text-emerald-700">active</span>}
                          {r.status === "revoked" && <span className="text-rose-700">revoked</span>}
                          {r.status !== "active" && r.status !== "revoked" && <span>{r.status}</span>}
                        </td>
                        <td className="py-2 whitespace-nowrap">
                          <a href={`/v/${r.cid}`} target="_blank" className="text-sky-700 underline">
                            Open
                          </a>
                        </td>
                      </tr>
                    );
                  })}
                </tbody>
              </table>
            </div>
          )}
        </div>
      </main>

      <footer className="py-8 text-center text-xs text-slate-500">
        © {new Date().getFullYear()} GecorpID — Powered by GECORP
      </footer>
    </div>
  );
}
