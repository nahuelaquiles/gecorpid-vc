"use client";

import { useEffect, useMemo, useState } from "react";
import Dropzone from "@/components/ui/Dropzone";
import StatusBadge from "@/components/ui/StatusBadge";
import CopyButton from "@/components/ui/CopyButton";

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
    (async () => {
      try {
        const res = await fetch("/api/history", { cache: "no-store" });
        if (!res.ok) return;
        const data = (await res.json()) as HistoryItem[];
        setHistory(data || []);
      } catch {}
    })();
  }, [issuing]);

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
      // Lazy-load libraries only when needed (prevents client load errors)
      const pdfLib: any = await import("pdf-lib");
      const qrMod: any = await import("qrcode");
      const QRCode = qrMod?.default ?? qrMod;

      const { PDFDocument, rgb, StandardFonts } = pdfLib;

      const generateQRDataUrl = async (url: string): Promise<string> => {
        return await QRCode.toDataURL(url, {
          errorCorrectionLevel: "M",
          margin: 0,
          scale: 4,
        });
      };

      const stampPdfWithQrAndShort = async ({
        pdfBytes,
        verifyUrl,
        shortCode,
      }: {
        pdfBytes: ArrayBuffer;
        verifyUrl: string;
        shortCode: string;
      }): Promise<Uint8Array> => {
        const doc = await PDFDocument.load(pdfBytes);
        const qrPngDataUrl = await generateQRDataUrl(verifyUrl);
        const qrImage = await doc.embedPng(qrPngDataUrl);

        const font = await doc.embedFont(StandardFonts.Helvetica);
        const fontSize = 8.5;

        for (const page of doc.getPages()) {
          const { width, height } = page.getSize();

          const margin = 14; // safe inset
          const qrSize = 54; // small & crisp
          const textPad = 6;
          const textWidth = font.widthOfTextAtSize(shortCode, fontSize);
          const stampWidth = qrSize + textPad + Math.max(36, textWidth);
          const stampHeight = Math.max(qrSize, fontSize + 10);

          const x = width - margin - stampWidth;
          const y = margin;

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

          page.drawImage(qrImage, {
            x: x + 6,
            y: y + (stampHeight - qrSize) / 2,
            width: qrSize,
            height: qrSize,
          });

          page.drawText(shortCode, {
            x: x + 6 + qrSize + textPad,
            y: y + (stampHeight - fontSize) / 2,
            size: fontSize,
            font,
            color: rgb(0.7, 0.76, 0.82),
          });
        }

        const out = await doc.save();
        return out;
      };

      // 1) Initiate issuance to get CID
      const initRes = await fetch("/api/issue", {
        method: "POST",
        headers: { "content-type": "application/json" },
        body: JSON.stringify({ init: true }),
      });
      if (!initRes.ok) throw new Error("Failed to initiate issuance");
      const initData = (await initRes.json()) as any;
      const cid = initData.cid as string;

      // 2) Stamp with final verify URL (requires CID)
      const arrayBuffer = await file.arrayBuffer();
      const verifyUrl = `${SITE_URL}/v/${cid}`;
      const stampedBytes = await stampPdfWithQrAndShort({
        pdfBytes: arrayBuffer,
        verifyUrl,
        shortCode: "--------", // temporary placeholder
      });

      // 3) Compute hash of stamped PDF; re-stamp with short code text
      const stampedHash = await sha256(stampedBytes);
      const shortCode = stampedHash.slice(0, 8);

      const stampedWithShortBytes = await stampPdfWithQrAndShort({
        pdfBytes: stampedBytes,
        verifyUrl,
        shortCode,
      });

      // 4) Finalize issuance (server stores sha256 & decrements credits)
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
      await finalizeRes.json();

      // 5) Save local filename map
      const nextMap = { ...nameMap, [cid]: file.name };
      saveNameMap(nextMap);
      setNameMap(nextMap);

      // 6) Auto-download
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
              {issuing ? "Iss
