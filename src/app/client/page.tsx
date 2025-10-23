"use client";

import { useEffect, useMemo, useState } from "react";
import Dropzone from "@/components/ui/Dropzone";
import StatusBadge from "@/components/ui/StatusBadge";
import CopyButton from "@/components/ui/CopyButton";

type HistoryItem = {
  cid: string;
  sha256: string;
  status: "active" | "revoked" | string;
  issued_at: string | number | null;
  doc_type?: string | null;
};

const LS_KEY = "gecorpid-filenames";
const SITE_URL = process.env.NEXT_PUBLIC_SITE_URL;

/* ---------- utils ---------- */
function hex(buf: ArrayBuffer) {
  const v = new Uint8Array(buf);
  return [...v].map((b) => b.toString(16).padStart(2, "0")).join("");
}
async function sha256(arrayBuffer: ArrayBuffer) {
  const h = await crypto.subtle.digest("SHA-256", arrayBuffer);
  return hex(h);
}
function formatDate(d: string | number | null | undefined) {
  if (d === null || d === undefined || d === "") return "—";
  const dt = new Date(d);
  if (isNaN(dt.getTime())) return "—";
  try { return dt.toLocaleString(); } catch { return "—"; }
}
function loadNameMap(): Record<string, string> {
  try { return JSON.parse(localStorage.getItem(LS_KEY) || "{}"); } catch { return {}; }
}
function saveNameMap(map: Record<string, string>) {
  localStorage.setItem(LS_KEY, JSON.stringify(map));
}

/** Recoge posibles credenciales del login cliente */
function authHeaders(): Record<string, string> {
  if (typeof window === "undefined") return {};
  // If the browser already has cookies (e.g. a logged-in session), prefer using them and avoid sending custom headers.
  const cookies = document?.cookie ?? "";
  if (cookies && cookies.split(";").some((c) => c.trim() !== "")) {
    return {};
  }
  const h: Record<string, string> = {};
  // Try several known keys we use across the project to fetch credentials from localStorage
  const apiKey =
    localStorage.getItem("gecorpid_api_key") ||
    localStorage.getItem("client_api_key") ||
    localStorage.getItem("api_key") ||
    "";
  const tenant =
    localStorage.getItem("gecorpid_tenant") ||
    localStorage.getItem("tenant") ||
    "";
  const token =
    localStorage.getItem("gecorpid_token") ||
    localStorage.getItem("token") ||
    "";
  if (apiKey) h["x-api-key"] = apiKey;
  if (tenant) h["x-tenant"] = tenant;
  if (token) h["authorization"] = token.startsWith("Bearer ") ? token : `Bearer ${token}`;
  return h;
}

/* ---------- page ---------- */
export default function ClientPage() {
  const [file, setFile] = useState<File | null>(null);
  const [history, setHistory] = useState<HistoryItem[]>([]);
  const [nameMap, setNameMap] = useState<Record<string, string>>({});
  const [issuing, setIssuing] = useState(false);
  const [message, setMessage] = useState<string | null>(null);

  useEffect(() => { setNameMap(loadNameMap()); }, []);

  useEffect(() => {
    (async () => {
      try {
        const res = await fetch("/api/history", {
          cache: "no-store",
          headers: authHeaders(),
        });
        if (!res.ok) return;
        let data: HistoryItem[] = [];
        try {
          data = (await res.json()) as HistoryItem[];
          if (!Array.isArray(data)) data = [];
        } catch { data = []; }
        setHistory(data);
      } catch {}
    })();
  }, [issuing]);

  const mappedHistory = useMemo(() => {
    return (history || []).map((row) => {
      const filename = (nameMap && row?.cid && nameMap[row.cid]) || "(local name unavailable)";
      const short = ((row?.sha256 as string) || "").slice(0, 8);
      return { ...row, filename, short };
    });
  }, [history, nameMap]);

  async function handleIssue() {
    if (!file) return;
    setIssuing(true);
    setMessage(null);

    try {
      // Imports perezosos
      const pdfLib: any = await import("pdf-lib");
      const qrMod: any = await import("qrcode");
      const QRCode = qrMod?.default ?? qrMod;
      const { PDFDocument, rgb, StandardFonts } = pdfLib;

      const generateQRDataUrl = async (url: string): Promise<string> => {
        return await QRCode.toDataURL(url, { errorCorrectionLevel: "M", margin: 0, scale: 4 });
      };

      const stampPdfWithQrAndShort = async ({
        pdfBytes, verifyUrl, shortCode,
      }: { pdfBytes: ArrayBuffer; verifyUrl: string; shortCode: string; }): Promise<Uint8Array> => {
        const doc = await PDFDocument.load(pdfBytes);
        const qrPngDataUrl = await generateQRDataUrl(verifyUrl);
        const qrImage = await doc.embedPng(qrPngDataUrl);
        const font = await doc.embedFont(StandardFonts.Helvetica);
        const fontSize = 8.5;

        for (const page of doc.getPages()) {
          const { width } = page.getSize();
          const margin = 14;
          const qrSize = 54;
          const textPad = 6;
          const textWidth = font.widthOfTextAtSize(shortCode, fontSize);
          const stampWidth = qrSize + textPad + Math.max(36, textWidth);
          const stampHeight = Math.max(qrSize, fontSize + 10);
          const x = width - margin - stampWidth;
          const y = margin;

          page.drawRectangle({
            x, y, width: stampWidth, height: stampHeight,
            color: rgb(0.08, 0.09, 0.12), opacity: 0.35,
            borderColor: rgb(1, 1, 1), borderOpacity: 0.08, borderWidth: 0.6,
            borderDashArray: [3, 2],
          });

          page.drawImage(qrImage, { x: x + 6, y: y + (stampHeight - qrSize) / 2, width: qrSize, height: qrSize });

          page.drawText(shortCode, {
            x: x + 6 + qrSize + textPad, y: y + (stampHeight - fontSize) / 2,
            size: fontSize, font, color: rgb(0.7, 0.76, 0.82),
          });
        }
        return await doc.save();
      };

      // 1) iniciar emisión (algunos backends exigen headers)
      const initRes = await fetch("/api/issue", {
        method: "POST",
        headers: { "content-type": "application/json", ...authHeaders() },
        body: JSON.stringify({ init: true }),
      });
      if (!initRes.ok) {
        if (initRes.status === 401 || initRes.status === 403) {
          throw new Error("Not authorized. Please sign in again or check your client API key/tenant.");
        }
        throw new Error("Failed to initiate issuance");
      }
      const initData = (await initRes.json()) as any;
      const cid = initData.cid as string;

      // 2) sellar con URL final
      const arrayBuffer = await file.arrayBuffer();
      const verifyUrl = `${SITE_URL}/v/${cid}`;
      const stampedBytes = await stampPdfWithQrAndShort({ pdfBytes: arrayBuffer, verifyUrl, shortCode: "--------" });

      // 3) hash y re-sello con short
      const stampedHash = await sha256(stampedBytes);
      const shortCode = stampedHash.slice(0, 8);
      const stampedWithShortBytes = await stampPdfWithQrAndShort({ pdfBytes: stampedBytes, verifyUrl, shortCode });

      // 4) finalizar (credits decrement en backend)
      const finalizeRes = await fetch("/api/issue", {
        method: "POST",
        headers: { "content-type": "application/json", ...authHeaders() },
        body: JSON.stringify({ cid, sha256: stampedHash, doc_type: "pdf" }),
      });
      if (!finalizeRes.ok) throw new Error("Failed to finalize issuance");
      await finalizeRes.json();

      // 5) map local filename
      const nextMap = { ...nameMap, [cid]: file.name };
      saveNameMap(nextMap);
      setNameMap(nextMap);

      // 6) autodescarga
      const outName = `${file.name.replace(/\\.pdf$/i, "")}_VC_${shortCode}.pdf`;
      const blob = new Blob([stampedWithShortBytes], { type: "application/pdf" });
      const url = URL.createObjectURL(blob);
      const a = document.createElement("a");
      a.href = url; a.download = outName; document.body.appendChild(a); a.click(); a.remove();
      URL.revokeObjectURL(url);

      setMessage("Issued successfully. Your file has been downloaded.");
      setFile(null);
      // refrescar historial
      try { setIssuing((v) => !v); } catch {}
    } catch (e: any) {
      setMessage(e?.message || "Issue failed.");
      console.error(e);
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
        {/* LEFT */}
        <div className="lg:col-span-1">
          <div className="card p-5">
            <Dropzone onFile={setFile} />
            {file && (
              <div className="mt-4 text-sm">
                <div className="text-muted">Selected:</div>
                <div className="font-medium break-words">{file.name}</div>
              </div>
            )}
            <button className="btn mt-4 w-full disabled:opacity-50" disabled={!file || issuing} onClick={handleIssue}>
              {issuing ? "Issuing…" : "Issue & Download VC-stamped PDF"}
            </button>
            <p className="text-xs text-muted mt-3">
              The small stamp sits bottom-right with a QR and the short code (first 8 of SHA-256) for quick visual checks.
            </p>
            {message && <p className="mt-3 text-sm">{message}</p>}
          </div>

          <div className="card p-5 mt-6">
            <h3 className="text-lg font-semibold">Why this is private</h3>
            <ul className="list-disc pl-5 mt-2 text-sm text-muted space-y-1">
              <li>PDF never leaves your device — stamping and hashing happen in your browser.</li>
              <li>Server only stores: <code>{'{ tenant_id, cid, sha256, vc_jwt, status, issued_at, doc_type }'}</code>.</li>
              <li>QR resolves to <code>/v/[cid]</code> for public verification.</li>
            </ul>
          </div>
        </div>

        {/* RIGHT */}
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
                  {(mappedHistory || []).map((row) => (
                    <tr key={row.cid}>
                      <td className="text-sm text-muted">{formatDate(row.issued_at)}</td>
                      <td className="text-sm">
                        <div className="font-medium">{row.filename}</div>
                        <div className="text-xs text-muted">Type: {row.doc_type || "pdf"}</div>
                      </td>
                      <td className="text-sm">
                        <code className="px-2 py-1 rounded-md bg-black/30">{row.short}</code>
                      </td>
                        <td><StatusBadge status={row.status} /></td>
                        <td><a href={`/v/${row.cid}`} className="btn-ghost text-sm" title="Open verifier">Verify</a></td>
                    </tr>
                  ))}
                  {(!mappedHistory || mappedHistory.length === 0) && (
                    <tr>
                      <td colSpan={5} className="py-10 text-center text-muted">No documents issued yet.</td>
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
