"use client";

import { useEffect, useMemo, useState } from "react";
import Dropzone from "@/components/ui/Dropzone";
import StatusBadge from "@/components/ui/StatusBadge";
import CopyButton from "@/components/ui/CopyButton";
import { PDFDocument, rgb, StandardFonts } from "pdf-lib";
// @ts-ignore - qrcode has no types by default
import QRCode from "qrcode";

type HistoryItem = {
  cid: string;
  sha256: string;
  status: "active" | "revoked" | string;
  issued_at: string; // ISO
  doc_type?: string | null;
};

const LS_KEY = "gecorpid-filenames";
const SITE_URL = process.env.NEXT_PUBLIC_SITE_URL;

function hex(buf: ArrayBuffer) {
  const v = new Uint8Array(buf);
  return [...v].map((b) => b.toString(16).padStart(2, "0")).join("");
}

async function sha256(arrayBuffer: ArrayBuffer) {
  const h = await crypto.subtle.digest("SHA-256", arrayBuffer);
  return hex(h);
}

function loadNameMap(): Record<string, string> {
  try {
    const raw = localStorage.getItem(LS_KEY);
    if (!raw) return {};
    return JSON.parse(raw);
  } catch {
    return {};
  }
}

function saveNameMap(map: Record<string, string>) {
  localStorage.setItem(LS_KEY, JSON.stringify(map));
}

async function generateQRDataUrl(url: string): Promise<string> {
  return await QRCode.toDataURL(url, {
    errorCorrectionLevel: "M",
    margin: 0,
    scale: 4,
  });
}

/**
 * Stamp: bottom-right, small QR with inline short code.
 * Subtle: muted text; QR stays crisp for scan reliability.
 */
async function stampPdfWithQrAndShort({
  pdfBytes,
  verifyUrl,
  shortCode,
}: {
  pdfBytes: ArrayBuffer;
  verifyUrl: string;
  shortCode: string;
}): Promise<Uint8Array> {
  const doc = await PDFDocument.load(pdfBytes);
  const qrPngDataUrl = await generateQRDataUrl(verifyUrl);
  const qrImage = await doc.embedPng(qrPngDataUrl);

  const font = await doc.embedFont(StandardFonts.Helvetica);
  const fontSize = 8.5;

  for (const page of doc.getPages()) {
    const { width, height } = page.getSize();

    // Stamp geometry
    const margin = 14; // pts safe inset
    const qrSize = 54; // small & crisp
    const textPad = 6;
    const textWidth = font.widthOfTextAtSize(shortCode, fontSize);
    const stampWidth = qrSize + textPad + Math.max(36, textWidth);
    const stampHeight = Math.max(qrSize, fontSize + 10);

    const x = width - margin - stampWidth;
    const y = margin;

    // Subtle plate behind (slight translucent to suggest a "stamp" without covering content)
    page.drawRectangle({
      x,
      y,
      width: stampWidth,
      height: stampHeight,
      color: rgb(0.08, 0.09, 0.12),
      opacity: 0.35,
      borderColor: rgb(1, 1, 1),
      borderOpacity: 0.08,
      borderWidth: 0.6,
      borderDashArray: [3, 2],
    });

    // QR (full opacity for reliability)
    page.drawImage(qrImage, {
      x: x + 6,
      y: y + (stampHeight - qrSize) / 2,
      width: qrSize,
      height: qrSize,
    });

    // Short code text (muted)
    page.drawText(shortCode, {
      x: x + 6 + qrSize + textPad,
      y: y + (stampHeight - fontSize) / 2,
      size: fontSize,
      font,
      color: rgb(0.7, 0.76, 0.82),
    });

    // NOTE: Removed any “developed by …” text per requirements.
  }

  const out = await doc.save();
  return out;
}

export default function ClientPage() {
  const [file, setFile] = useState<File | null>(null);
  const [history, setHistory] = useState<HistoryItem[]>([]);
  const [nameMap, setNameMap] = useState<Record<string, string>>({});
  const [issuing, setIssuing] = useState(false);
  const [message, setMessage] = useState<string | null>(null);

  useEffect(() => {
    setNameMap(loadNameMap());
  }, []);

  useEffect(() => {
    // Load history
    (async () => {
      try {
        const res = await fetch("/api/history", { cache: "no-store" });
        if (!res.ok) return;
        const data = (await res.json()) as HistoryItem[];
        setHistory(data || []);
      } catch {}
    })();
  }, [issuing]);

  const shortCodesByCid = useMemo(() => {
    const map: Record<string, string> = {};
    for (const row of history) {
      map[row.cid] = (row.sha256 || "").slice(0, 8);
    }
    return map;
  }, [history]);

  const mappedHistory = useMemo(() => {
    return history.map((row) => {
      const filename = nameMap[row.cid] || "(local name unavailable)";
      const short = (row.sha256 || "").slice(0, 8);
      return { ...row, filename, short };
    });
  }, [history, nameMap]);

  async function handleIssue() {
    if (!file) return;
    setIssuing(true);
    setMessage(null);

    try {
      // Step 1: Ask server to open issuance & get CID (keeps engine as-is conceptually)
      const initRes = await fetch("/api/issue", {
        method: "POST",
        headers: { "content-type": "application/json" },
        body: JSON.stringify({ init: true }), // if your API doesn’t need this, it will ignore it
      });
      if (!initRes.ok) throw new Error("Failed to initiate issuance");
      const initData = await initRes.json() as any;
      const cid = initData.cid as string;

      // Step 2: Stamp PDF with the *final* verify URL (requires CID)
      const arrayBuffer = await file.arrayBuffer();
      // We'll compute hash *after* stamping per canonical flow
      const verifyUrl = `${SITE_URL}/v/${cid}`;
      const stampedBytes = await stampPdfWithQrAndShort({
        pdfBytes: arrayBuffer,
        verifyUrl,
        shortCode: "--------", // temporary until we compute hash
      });

      // Step 3: Compute hash of stamped PDF, then re-stamp only the short code text inside stamp
      const stampedHash = await sha256(stampedBytes);
      const shortCode = stampedHash.slice(0, 8);

      const stampedWithShortBytes = await stampPdfWithQrAndShort({
        pdfBytes: stampedBytes,
        verifyUrl,
        shortCode,
      });

      // Step 4: Finalize issuance with hash (server stores { cid, sha256, ... } & decrements credits)
      const finalizeRes = await fetch("/api/issue", {
        method: "POST",
        headers: { "content-type": "application/json" },
        body: JSON.stringify({
          cid,
          sha256: stampedHash,
          doc_type: "pdf",
        }),
      });
      if (!finalizeRes.ok) throw new Error("Failed to finalize issuance");
      const finalized = await finalizeRes.json();

      // Step 5: Local filename mapping (cid -> original filename)
      const nextMap = { ...nameMap, [cid]: file.name };
      saveNameMap(nextMap);
      setNameMap(nextMap);

      // Step 6: Auto-download: <original>_VC_<SHORT>.pdf
      const outName = `${file.name.replace(/\.pdf$/i, "")}_VC_${shortCode}.pdf`;
      const blob = new Blob([stampedWithShortBytes], { type: "application/pdf" });
      const url = URL.createObjectURL(blob);
      const a = document.createElement("a");
      a.href = url;
      a.download = outName;
      document.body.appendChild(a);
      a.click();
      a.remove();
      URL.revokeObjectURL(url);

      setMessage("Issued successfully. Your file has been downloaded.");
      setFile(null);
    } catch (e: any) {
      setMessage(e?.message || "Issue failed.");
    } finally {
      setIssuing(false);
    }
  }

  return (
    <div className="max-w-6xl mx-auto px-4 py-10">
      <header className="mb-8">
        <h1 className="hero">Issue Verifiable Credentials (PDF)</h1>
        <p className="text-muted mt-2">
          Zero-knowledge by default — we never upload your PDF. The QR points to this verifier page and your browser
          computes the document hash locally.
        </p>
      </header>

      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
        {/* LEFT: Uploader */}
        <div className="lg:col-span-1">
          <div className="card p-5">
            <Dropzone onFile={setFile} />
            {file && (
              <div className="mt-4 text-sm">
                <div className="text-muted">Selected:</div>
                <div className="font-medium break-words">{file.name}</div>
              </div>
            )}
            <button
              className="btn mt-4 w-full disabled:opacity-50"
              disabled={!file || issuing}
              onClick={handleIssue}
            >
              {issuing ? "Issuing…" : "Issue & Download VC-stamped PDF"}
            </button>
            <p className="text-xs text-muted mt-3">
              The small stamp sits bottom-right with a QR and the short code (first 8 of SHA-256) for quick visual checks.
            </p>
          </div>

          <div className="card p-5 mt-6">
            <h3 className="text-lg font-semibold">Why this is private</h3>
            <ul className="list-disc pl-5 mt-2 text-sm text-muted space-y-1">
              <li>PDF never leaves your device — stamping and hashing happen in your browser.</li>
              <li>Server only stores: <code>{'{ tenant_id, cid, sha256, vc_jwt, status, issued_at, doc_type }'}</code>.</li>
              <li>QR resolves to <code>/v/[cid]</code> for public verification.</li>
            </ul>
          </div>

          {message && (
            <div className="card p-4 mt-6">
              <div className="text-sm">{message}</div>
            </div>
          )}
        </div>

        {/* RIGHT: History */}
        <div className="lg:col-span-2">
          <div className="card p-5">
            <div className="flex items-center justify-between">
              <h3 className="text-lg font-semibold">Issued documents</h3>
              <span className="text-xs text-muted">Local names are stored in your browser only.</span>
            </div>
            <div className="overflow-x-auto mt-3">
              <table className="table">
                <thead>
                  <tr>
                    <th className="w-[22%]">Issued</th>
                    <th>Filename (local)</th>
                    <th className="w-[18%]">Short code</th>
                    <th className="w-[16%]">Status</th>
                    <th className="w-[1%]"></th>
                  </tr>
                </thead>
                <tbody>
                  {mappedHistory.map((row) => (
                    <tr key={row.cid}>
                      <td className="text-sm text-muted">
                        {new Date(row.issued_at).toLocaleString()}
                      </td>
                      <td className="text-sm">
                        <div className="font-medium">{row.filename}</div>
                        <div className="text-xs text-muted">Type: {row.doc_type || "pdf"}</div>
                      </td>
                      <td className="text-sm">
                        <code className="px-2 py-1 rounded-md bg-black/30">{row.short}</code>
                      </td>
                      <td><StatusBadge status={row.status} /></td>
                      <td>
                        <a href={`/v/${row.cid}`} className="btn-ghost text-sm" title="Open verifier">Verify</a>
                      </td>
                    </tr>
                  ))}

                  {mappedHistory.length === 0 && (
                    <tr>
                      <td colSpan={5} className="py-10 text-center text-muted">
                        No documents issued yet.
                      </td>
                    </tr>
                  )}
                </tbody>
              </table>
            </div>
            <div className="hr" />
            <p className="text-xs text-muted">
              We hide raw CIDs and full hashes here to reduce clutter; use the short code and the public verifier instead.
            </p>
          </div>
        </div>
      </div>
    </div>
  );
}
