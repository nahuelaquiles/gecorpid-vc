"use client";

import { useEffect, useMemo, useState } from "react";
import Dropzone from "@/components/ui/Dropzone";
import StatusBadge from "@/components/ui/StatusBadge";
import CopyButton from "@/components/ui/CopyButton";

type VerifyRecord = {
  cid: string;
  sha256: string;
  status: "active" | "revoked" | string;
  issued_at: string;
  doc_type?: string | null;
};

function hex(buf: ArrayBuffer) {
  const v = new Uint8Array(buf);
  return [...v].map((b) => b.toString(16).padStart(2, "0")).join("");
}
async function sha256(buf: ArrayBuffer) {
  const h = await crypto.subtle.digest("SHA-256", buf);
  return hex(h);
}

export default function VerifyPage({ params }: { params: { cid: string } }) {
  const { cid } = params;
  const [record, setRecord] = useState<VerifyRecord | null>(null);
  const [localHash, setLocalHash] = useState<string | null>(null);
  const [match, setMatch] = useState<boolean | null>(null);
  const [error, setError] = useState<string | null>(null);

  // Format dates robustly; return an em dash when invalid or missing
  function formatDate(value: string | number | null | undefined) {
    if (value === null || value === undefined || value === "") return "—";
    const dt = new Date(value);
    if (isNaN(dt.getTime())) return "—";
    try {
      return dt.toLocaleString();
    } catch {
      return "—";
    }
  }

  const short = useMemo(() => (record?.sha256 || "").slice(0, 8), [record]);

  useEffect(() => {
    (async () => {
      try {
        const res = await fetch(`/api/verify/${cid}`, { cache: "no-store" });
        if (!res.ok) throw new Error("Verification record not found.");
        let json: VerifyRecord | null = null;
        try {
          json = (await res.json()) as any;
        } catch {
          json = null;
        }
        if (!json || typeof json !== "object") throw new Error("Invalid verification response.");
        setRecord(json as VerifyRecord);
      } catch (e: any) {
        setError(e?.message || "Unable to load verification record.");
      }
    })();
  }, [cid]);

  async function handleLocalFile(file: File) {
    setError(null);
    setLocalHash(null);
    setMatch(null);
    try {
      const buf = await file.arrayBuffer();
      const h = await sha256(buf);
      setLocalHash(h);
      if (record?.sha256) setMatch(h === record.sha256);
    } catch (e: any) {
      setError(e?.message || "Failed to compute hash.");
    }
  }

  return (
    <div className="max-w-5xl mx-auto px-4 py-10">
      <header className="mb-8">
        <div className="flex items-start justify-between gap-3">
          <div>
            <h1 className="hero">Document Verifier</h1>
            <p className="text-muted mt-2 max-w-2xl">
              You likely arrived here by scanning the QR on a document. This page shows the credential status and lets you
              optionally verify your local PDF <strong>without uploading it</strong>. Drag & drop your file below to compute its hash in your
              browser and compare it with the registered one (zero‑knowledge).
            </p>
          </div>
          {record && <StatusBadge status={record.status} />}
        </div>
      </header>

      <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
        {/* Left: Record */}
        <div className="card p-5">
          <h3 className="text-lg font-semibold mb-3">Credential status</h3>
          {record ? (
            <>
              <div className="text-sm">
                <div className="text-muted">CID</div>
                <div className="flex items-center gap-2">
                  <code className="px-2 py-1 rounded-md bg-black/30 break-all">{record.cid}</code>
                  <CopyButton text={record.cid} label="Copy CID" />
                </div>
              </div>
              <div className="hr" />
              <div className="text-sm">
                <div className="text-muted">Registered hash (SHA‑256)</div>
                <div className="flex items-center gap-2">
                  <code className="px-2 py-1 rounded-md bg-black/30 break-all">{record.sha256}</code>
                  <CopyButton text={record.sha256} label="Copy hash" />
                </div>
                <div className="text-xs text-muted mt-1">Short code: <code>{short}</code></div>
              </div>
              <div className="hr" />
              <div className="text-sm grid grid-cols-2 gap-2">
                <div>
                  <div className="text-muted">Issued at</div>
                  <div>{formatDate(record.issued_at)}</div>
                </div>
                <div>
                  <div className="text-muted">Type</div>
                  <div>{record.doc_type || "pdf"}</div>
                </div>
              </div>
            </>
          ) : (
            <div className="text-muted text-sm">{error ?? "Loading..."}</div>
          )}
        </div>

        {/* Right: Local check */}
        <div className="card p-5">
          <h3 className="text-lg font-semibold">Local zero‑knowledge check</h3>
          <p className="text-sm text-muted mt-1">
            Drag & drop your stamped PDF. We will compute its SHA‑256 <em>locally</em> and compare.
          </p>
          <div className="mt-3">
            <Dropzone onFile={handleLocalFile} />
          </div>

          {localHash && (
            <div className="mt-4 text-sm">
              <div className="text-muted">Computed (local) hash</div>
              <code className="px-2 py-1 rounded-md bg-black/30 break-all">{localHash}</code>
            </div>
          )}

          {match !== null && (
            <div className="mt-4">
              {match ? (
                <div className="badge">
                  <span className="inline-block h-2 w-2 rounded-full bg-[color:var(--accent-2)]" /> Match verified ✓
                </div>
              ) : (
                <div className="badge">
                  <span className="inline-block h-2 w-2 rounded-full bg-[color:var(--danger)]" /> No match
                </div>
              )}
            </div>
          )}

          {error && <div className="mt-4 text-sm text-danger">{error}</div>}
        </div>
      </div>

      <div className="card p-5 mt-6">
        <h3 className="text-lg font-semibold">FAQ (short)</h3>
        <div className="mt-3 space-y-2 text-sm">
          <div>
            <div className="font-medium">Why does the QR bring me here?</div>
            <div className="text-muted">
              The QR encodes this verification URL containing the document’s credential ID (<code>cid</code>). This page shows the registered hash and status.
            </div>
          </div>
          <div>
            <div className="font-medium">Do I need to upload my PDF?</div>
            <div className="text-muted">
              No. For privacy, you can verify locally: drop your file and we compute the hash in your browser to compare (zero‑knowledge).
            </div>
          </div>
          <div>
            <div className="font-medium">What’s the short code printed in the stamp?</div>
            <div className="text-muted">
              It’s the first 8 hex chars of SHA‑256. It enables quick visual cross‑checks before any upload/drag‑and‑drop.
            </div>
          </div>
          <div>
            <div className="font-medium">What does Active/Revoked mean?</div>
            <div className="text-muted">
              <span className="text-ok">Active</span> means the credential is valid. <span className="text-danger">Revoked</span> means it is no longer trusted.
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}
