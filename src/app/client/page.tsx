 (cd "$(git rev-parse --show-toplevel)" && git apply --3way <<'EOF' 
diff --git a/src/app/client/page.tsx b/src/app/client/page.tsx
index dd39e7e3165831a6bb161590ed21000618949d3c..df16a93c9e5f36d8512cdb4240252f112e6612dd 100644
--- a/src/app/client/page.tsx
+++ b/src/app/client/page.tsx
@@ -1,354 +1,518 @@
 "use client";
 
-import React, { useCallback, useEffect, useState } from "react";
+import React, { useCallback, useEffect, useMemo, useState } from "react";
 import QRCode from "qrcode";
-import { PDFDocument, StandardFonts, rgb } from "pdf-lib";
+import { PDFDocument, rgb } from "pdf-lib";
 
-// Compute a SHA‑256 hex digest of an ArrayBuffer using the Web Crypto API
+// Compute a SHA-256 hex digest of an ArrayBuffer using the Web Crypto API
 async function sha256HexClient(buf: ArrayBuffer): Promise<string> {
   const digest = await crypto.subtle.digest("SHA-256", buf);
   return [...new Uint8Array(digest)].map((b) => b.toString(16).padStart(2, "0")).join("");
 }
+
 // Return a shortened code from a hex digest
 function shortHash(hex: string) {
   return hex.slice(0, 8).toUpperCase();
 }
 
 /**
- * Stamp every page of a PDF with a QR code pointing to verifyUrl. The QR card
- * contains a label and subtitle to explain the credential. Returns a new PDF
- * as a Uint8Array.
+ * Stamp every page of a PDF with a compact QR badge pointing to verifyUrl.
+ * Returns a new PDF as a Uint8Array.
  */
 async function stampPdfWithQr(pdfBytes: ArrayBuffer, verifyUrl: string): Promise<Uint8Array> {
   const pdf = await PDFDocument.load(pdfBytes);
   const pages = pdf.getPages();
-  const font = await pdf.embedFont(StandardFonts.HelveticaBold);
-  const qrDataUrl = await QRCode.toDataURL(verifyUrl, { errorCorrectionLevel: "M", margin: 1, scale: 6 });
+  const qrDataUrl = await QRCode.toDataURL(verifyUrl, {
+    errorCorrectionLevel: "M",
+    margin: 0,
+    scale: 6,
+  });
   const pngBytes = Uint8Array.from(atob(qrDataUrl.split(",")[1]), (c) => c.charCodeAt(0));
   const pngImage = await pdf.embedPng(pngBytes);
-  const pngDims = pngImage.scale(0.45);
+  const maxSide = Math.max(pngImage.width, pngImage.height);
+  const targetSize = 88;
+  const scale = targetSize / maxSide;
+  const pngDims = pngImage.scale(scale);
+
   pages.forEach((p) => {
     const { width, height } = p.getSize();
-    const margin = 24;
-    const boxW = pngDims.width + 24;
-    const boxH = pngDims.height + 54;
-    // card background
+    const offset = 18;
+    const qrX = width - pngDims.width - offset;
+    const qrY = offset;
+    const pad = 6;
+
     p.drawRectangle({
-      x: width - boxW - margin,
-      y: height - boxH - margin,
-      width: boxW,
-      height: boxH,
+      x: qrX - pad,
+      y: qrY - pad,
+      width: pngDims.width + pad * 2,
+      height: pngDims.height + pad * 2,
       color: rgb(1, 1, 1),
-      borderColor: rgb(0.87, 0.9, 0.95),
+      opacity: 0.9,
+      borderColor: rgb(230 / 255, 234 / 255, 240 / 255),
       borderWidth: 1,
-      opacity: 0.95,
-    });
-    // label
-    p.drawText("Verifiable Digital Credential", {
-      x: width - boxW - margin + 12,
-      y: height - boxH - margin + boxH - 18,
-      size: 9,
-      font,
-      color: rgb(0.08, 0.1, 0.16),
     });
-    // subtitle
-    p.drawText("developed by gecorp.com.ar", {
-      x: width - boxW - margin + 12,
-      y: height - boxH - margin + boxH - 32,
-      size: 7,
-      font,
-      color: rgb(0.25, 0.28, 0.35),
-    });
-    // QR image
+
     p.drawImage(pngImage, {
-      x: width - boxW - margin + 12,
-      y: height - boxH - margin + 10,
+      x: qrX,
+      y: qrY,
       width: pngDims.width,
       height: pngDims.height,
     });
   });
+
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
+  doc_filename?: string | null;
 };
 
+const STORAGE_KEY = "gecorpid-vc-file-names";
+
 export default function ClientPage() {
   const [rows, setRows] = useState<Row[]>([]);
   const [loading, setLoading] = useState(false);
   const [credits, setCredits] = useState<number | null>(null);
   const [dragActive, setDragActive] = useState(false);
   const [history, setHistory] = useState<HistoryRow[]>([]);
+  const [nameIndex, setNameIndex] = useState<Record<string, string>>({});
+
+  // Load remembered file names from localStorage once we're on the client.
+  useEffect(() => {
+    if (typeof window === "undefined") return;
+    try {
+      const raw = window.localStorage.getItem(STORAGE_KEY);
+      if (!raw) return;
+      const parsed = JSON.parse(raw) as Record<string, string>;
+      setNameIndex(parsed || {});
+    } catch {
+      // ignore parsing errors and start with an empty cache
+    }
+  }, []);
+
+  const rememberFileName = useCallback((sha: string, name: string) => {
+    const key = sha.toLowerCase();
+    setNameIndex((prev) => {
+      if (prev[key] === name) return prev;
+      const next = { ...prev, [key]: name };
+      if (typeof window !== "undefined") {
+        try {
+          window.localStorage.setItem(STORAGE_KEY, JSON.stringify(next));
+        } catch {
+          // ignore quota/storage failures
+        }
+      }
+      return next;
+    });
+  }, []);
 
-  // Fetch tenant credit balance
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
-  // Fetch issued history for current tenant
+
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
+
   async function callIssueFinal(body: { cid: string; sha256: string; doc_type: string }) {
     const res = await fetch("/api/issue-final", {
       method: "POST",
       headers: { "content-type": "application/json" },
       body: JSON.stringify(body),
     });
     const ct = res.headers.get("content-type") || "";
     const data = ct.includes("application/json") ? await res.json() : { error: await res.text() };
     if (!res.ok) throw new Error((data as any)?.error || "issue-final failed");
-    return data;
+    return data as { cid: string; sha256: string; doc_type: string; issued_at: string | null };
   }
 
-  const processFiles = useCallback(
-    async (files: FileList) => {
-      if (!files || files.length === 0) return;
+  const handleFiles = useCallback(
+    async (files: FileList | null) => {
+      if (!files?.length) return;
+      const file = files[0];
       setLoading(true);
-      setRows(Array.from(files).map((f) => ({ name: f.name, status: "pending" })));
+      setRows((prev) => [
+        {
+          name: file.name,
+          status: "pending",
+          message: "Preparing issue request…",
+        },
+        ...prev,
+      ]);
 
-      for (let i = 0; i < files.length; i++) {
-        const file = files[i];
-        try {
-          const { cid, verify_url } = await callIssueRequest();
-          const buf = await file.arrayBuffer();
-          const stamped = await stampPdfWithQr(buf, verify_url);
-          const sha = await sha256HexClient(stamped.buffer);
-          const short = shortHash(sha);
-          await callIssueFinal({ cid, sha256: sha, doc_type: "pdf" });
-          // Auto‑download stamped PDF
-          const blob = new Blob([stamped], { type: "application/pdf" });
-          const url = URL.createObjectURL(blob);
-          const fname = file.name.replace(/\.pdf$/i, "") + `_VC_${short}.pdf`;
-          const a = document.createElement("a");
-          a.href = url;
-          a.download = fname;
-          a.style.display = "none";
-          document.body.appendChild(a);
-          a.click();
-          document.body.removeChild(a);
-          URL.revokeObjectURL(url);
-
-          setRows((prev) => {
-            const copy = [...prev];
-            copy[i] = { name: file.name, cid, verifyUrl: verify_url, sha256: sha, short, status: "issued" };
-            return copy;
-          });
-        } catch (err: any) {
-          setRows((prev) => {
-            const copy = [...prev];
-            copy[i] = { name: file.name, status: "error", message: err?.message || "Error" };
-            return copy;
-          });
-        }
-      }
-      setLoading(false);
-      fetchCredits();
-      fetchHistory();
-    },
-    [],
-  );
+      try {
+        const pdfBytes = await file.arrayBuffer();
+        const sha = await sha256HexClient(pdfBytes);
+        rememberFileName(sha, file.name);
+
+        const { cid, verify_url: verifyUrl } = await callIssueRequest();
+        setRows((prev) => [{ ...prev[0], cid, verifyUrl, sha256: sha, short: shortHash(sha) }, ...prev.slice(1)]);
+
+        setRows((prev) => [{ ...prev[0], message: "Stamping PDF with secure QR…" }, ...prev.slice(1)]);
+        const stampedBytes = await stampPdfWithQr(pdfBytes, verifyUrl);
+        const stampedBlob = new Blob([stampedBytes], { type: "application/pdf" });
+        const stampedFile = new File([stampedBlob], file.name.replace(/\.pdf$/i, "") + "_sealed.pdf", {
+          type: "application/pdf",
+        });
 
-  const onFilePick = useCallback(
-    (e: React.ChangeEvent<HTMLInputElement>) => {
-      if (e.target.files) processFiles(e.target.files);
+        const formData = new FormData();
+        formData.append("file", stampedFile);
+        formData.append("cid", cid);
+        formData.append("sha256", sha);
+        formData.append("doc_type", "pdf");
+
+        setRows((prev) => [{ ...prev[0], message: "Finishing issuance…" }, ...prev.slice(1)]);
+        await callIssueFinal({ cid, sha256: sha, doc_type: "pdf" });
+        setRows((prev) => [{ ...prev[0], status: "issued", message: "Issued successfully." }, ...prev.slice(1)]);
+
+        const url = URL.createObjectURL(stampedBlob);
+        const a = document.createElement("a");
+        a.href = url;
+        a.download = stampedFile.name;
+        a.click();
+        URL.revokeObjectURL(url);
+
+        fetchCredits();
+        fetchHistory();
+      } catch (e: any) {
+        setRows((prev) => [{ ...prev[0], status: "error", message: e?.message || "Failed to issue" }, ...prev.slice(1)]);
+      } finally {
+        setLoading(false);
+      }
     },
-    [processFiles],
+    [rememberFileName],
   );
 
-  const onDragOver = useCallback((e: React.DragEvent<HTMLLabelElement>) => {
-    e.preventDefault();
-    e.stopPropagation();
-    setDragActive(true);
-  }, []);
-  const onDragLeave = useCallback((e: React.DragEvent<HTMLLabelElement>) => {
-    e.preventDefault();
-    e.stopPropagation();
-    setDragActive(false);
-  }, []);
   const onDrop = useCallback(
-    (e: React.DragEvent<HTMLLabelElement>) => {
+    (e: React.DragEvent<HTMLDivElement>) => {
       e.preventDefault();
       e.stopPropagation();
       setDragActive(false);
-      if (e.dataTransfer?.files?.length) processFiles(e.dataTransfer.files);
+      handleFiles(e.dataTransfer?.files || null);
     },
-    [processFiles],
+    [handleFiles],
   );
 
+  const creditsLabel = useMemo(() => {
+    if (credits === null) return "Balance unavailable";
+    if (credits === 0) return "No credits remaining";
+    if (credits === 1) return "1 issuance credit left";
+    return `${credits} issuance credits left`;
+  }, [credits]);
+
   return (
     <div className="min-h-screen bg-slate-50 text-slate-900">
-      <header className="sticky top-0 z-10 bg-white/80 backdrop-blur border-b border-slate-200">
-        <div className="mx-auto max-w-3xl px-4 py-3 flex items-center justify-between">
-          <div className="leading-tight">
-            <div className="font-semibold">GecorpID • VC</div>
-            <div className="text-xs text-slate-500">Local issuance of verifiable PDFs</div>
-          </div>
-          <div className="text-sm text-slate-600">
-            Credits:&nbsp;
-            <span className="inline-flex items-center rounded-full bg-emerald-50 px-2 py-0.5 text-emerald-700 border border-emerald-200">
-              {credits ?? "—"}
+      <header className="relative overflow-hidden border-b border-slate-200 bg-white">
+        <div className="absolute inset-0 bg-gradient-to-r from-sky-50 via-white to-transparent" />
+        <div className="relative mx-auto flex max-w-6xl flex-col gap-8 px-6 py-12 lg:flex-row lg:items-center lg:justify-between">
+          <div className="max-w-2xl space-y-4">
+            <span className="inline-flex items-center gap-2 rounded-full border border-sky-200 bg-sky-50 px-3 py-1 text-xs font-semibold uppercase tracking-[0.28em] text-sky-600">
+              Issuer workspace
             </span>
+            <h1 className="text-4xl font-semibold tracking-tight text-slate-900">Seal and issue trusted PDFs</h1>
+            <p className="text-base text-slate-600">
+              Upload a document, let us hash it locally, and download the QR-stamped version instantly. The verifier portal
+              linked inside each QR explains how authenticity is checked without ever uploading the PDF.
+            </p>
+            <div className="flex flex-wrap items-center gap-3 text-sm text-slate-600">
+              <div className="inline-flex items-center gap-2 rounded-full border border-slate-200 bg-white px-3 py-1 font-medium text-slate-700">
+                <span className="inline-block h-2 w-2 rounded-full bg-emerald-500" aria-hidden />
+                {creditsLabel}
+              </div>
+              <div className="text-xs text-slate-500">
+                Need more? Contact your GecorpID admin to top-up your balance.
+              </div>
+            </div>
+          </div>
+          <div className="grid gap-3 rounded-2xl border border-slate-200 bg-white/80 p-6 text-sm text-slate-600 shadow-xl shadow-slate-200/60">
+            <h2 className="text-lg font-semibold text-slate-800">How the seal works</h2>
+            <p>We hash the PDF on your device, register the digest with GecorpID, and stamp every page with a verification QR.</p>
+            <ul className="grid gap-2 text-sm text-slate-600">
+              <li className="flex items-start gap-3">
+                <span className="mt-1 inline-flex h-6 w-6 items-center justify-center rounded-full bg-sky-500 text-xs font-semibold text-white">1</span>
+                Drop the PDF to generate a sealed copy.
+              </li>
+              <li className="flex items-start gap-3">
+                <span className="mt-1 inline-flex h-6 w-6 items-center justify-center rounded-full bg-sky-500 text-xs font-semibold text-white">2</span>
+                We return the sealed file immediately—no document leaves your device.
+              </li>
+              <li className="flex items-start gap-3">
+                <span className="mt-1 inline-flex h-6 w-6 items-center justify-center rounded-full bg-sky-500 text-xs font-semibold text-white">3</span>
+                Anyone scanning the QR can match the original PDF hash against our records.
+              </li>
+            </ul>
           </div>
         </div>
       </header>
 
-      <main className="mx-auto max-w-3xl px-4 py-8 space-y-12">
-        {/* Issuance form */}
-        <div className="rounded-2xl bg-white shadow-soft border border-slate-200 p-6">
-          <h1 className="text-xl font-semibold mb-3">Issue verifiable credentials for your PDFs</h1>
-          <p className="text-sm text-slate-600 mb-5">
-            Drop one or more PDF files below. The app will stamp a QR code, compute the SHA‑256 hash locally,
-            send the hash to the server to create a verifiable credential, and automatically download the sealed
-            PDF. Your PDFs never leave your computer.
-          </p>
-          <label
-            className={`flex w-full items-center justify-center rounded-2xl border-2 border-dashed px-5 py-10 cursor-pointer ${
-              dragActive ? "bg-slate-100 border-slate-400" : "bg-slate-50 hover:bg-slate-100 border-slate-300"
-            }`}
-            onDragOver={onDragOver}
-            onDragLeave={onDragLeave}
-            onDrop={onDrop}
-          >
-            <div className="text-slate-600 text-center">
-              <div className="font-medium">Click or drag your PDFs here</div>
-              <div className="text-xs">One verifiable credential will be issued per file</div>
+      <main className="mx-auto flex max-w-6xl flex-col gap-12 px-6 py-12">
+        <section className="grid gap-6 rounded-3xl border border-slate-200 bg-white/90 p-8 shadow-2xl shadow-slate-200/70 lg:grid-cols-[1.4fr_1fr]">
+          <div>
+            <div className="flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
+              <div>
+                <h2 className="text-2xl font-semibold text-slate-900">Upload and seal</h2>
+                <p className="text-sm text-slate-600">
+                  Drag a PDF anywhere into this panel or click to browse. We will stamp each page with a discreet QR located in
+                  the bottom-right corner.
+                </p>
+              </div>
+              <div className="text-xs text-slate-500">
+                Supported format: <span className="font-medium text-slate-700">PDF</span>
+              </div>
             </div>
-            <input type="file" accept="application/pdf" multiple className="hidden" onChange={onFilePick} />
-          </label>
-          {loading && <div className="mt-4 text-sm text-slate-600">Processing…</div>}
-          {rows.length > 0 && (
-            <div className="mt-6 overflow-x-auto">
-              <table className="w-full text-sm">
-                <thead>
-                  <tr className="text-left text-slate-500">
-                    <th className="py-2">File</th>
-                    <th className="py-2">Result</th>
-                    <th className="py-2">Code</th>
-                    <th className="py-2">Verify</th>
-                  </tr>
-                </thead>
-                <tbody>
-                  {rows.map((r, i) => (
-                    <tr key={i} className="border-t border-slate-200">
-                      <td className="py-2 whitespace-nowrap">{r.name}</td>
-                      <td className="py-2">
-                        {r.status === "pending" && <span className="text-slate-600">issuing…</span>}
-                        {r.status === "issued" && <span className="text-emerald-700">issued ✔</span>}
-                        {r.status === "error" && <span className="text-rose-700">error: {r.message}</span>}
-                      </td>
-                      <td className="py-2">{r.short ?? "—"}</td>
-                      <td className="py-2">
-                        {r.verifyUrl ? (
-                          <a href={r.verifyUrl} target="_blank" className="text-sky-700 underline">
-                            Open
-                          </a>
-                        ) : (
-                          "—"
-                        )}
-                      </td>
-                    </tr>
-                  ))}
-                </tbody>
-              </table>
-              <div className="mt-4 text-xs text-slate-500">
-                Note: The stamped PDF is downloaded automatically; you can also use the verification link.
+
+            <div
+              className={`mt-6 flex min-h-[220px] flex-col items-center justify-center rounded-2xl border-2 border-dashed px-6 py-12 text-center transition ${
+                dragActive
+                  ? "border-sky-400 bg-sky-50"
+                  : "border-slate-200 bg-slate-50 hover:border-sky-200 hover:bg-sky-50/60"
+              }`}
+              onDragOver={(e) => {
+                e.preventDefault();
+                e.stopPropagation();
+                setDragActive(true);
+              }}
+              onDragLeave={(e) => {
+                e.preventDefault();
+                e.stopPropagation();
+                setDragActive(false);
+              }}
+              onDrop={onDrop}
+            >
+              <div className="pointer-events-none flex flex-col items-center gap-4 text-slate-600">
+                <div className="flex h-14 w-14 items-center justify-center rounded-full border border-slate-200 bg-white text-sky-500">
+                  <svg viewBox="0 0 24 24" className="h-7 w-7" fill="none" stroke="currentColor" strokeWidth="1.5">
+                    <path d="M12 5v14" strokeLinecap="round" />
+                    <path d="M5 12h14" strokeLinecap="round" />
+                    <rect x="3" y="3" width="18" height="18" rx="4" />
+                  </svg>
+                </div>
+                <div className="text-lg font-semibold text-slate-800">Drop the PDF to start sealing</div>
+                <p className="text-sm text-slate-500">We never upload or store your documents.</p>
               </div>
+              <input
+                type="file"
+                accept="application/pdf"
+                className="hidden"
+                onChange={(e) => handleFiles(e.target.files)}
+              />
             </div>
-          )}
-        </div>
 
-        {/* Issued history section */}
-        <div className="rounded-2xl bg-white shadow-soft border border-slate-200 p-6">
-          <h2 className="text-lg font-semibold mb-3">Issued credentials</h2>
+            <div className="mt-6 space-y-4">
+              {loading && <div className="text-sm text-slate-500">Processing document…</div>}
+              {rows.map((row, index) => (
+                <article
+                  key={`${row.name}-${index}`}
+                  className="rounded-2xl border border-slate-200 bg-white p-4 shadow-sm shadow-slate-200/60"
+                >
+                  <div className="flex flex-wrap items-center justify-between gap-2">
+                    <div className="space-y-1">
+                      <div className="text-sm font-semibold text-slate-800">{row.name}</div>
+                      {row.short && (
+                        <div className="text-xs text-slate-500">
+                          Issuance code <span className="font-mono text-slate-600">{row.short}</span>
+                        </div>
+                      )}
+                    </div>
+                    <div>
+                      {row.status === "pending" && (
+                        <span className="inline-flex items-center gap-2 rounded-full border border-amber-300 bg-amber-100/80 px-3 py-1 text-xs font-medium text-amber-800">
+                          <span className="h-1.5 w-1.5 animate-pulse rounded-full bg-amber-500" aria-hidden />
+                          In progress
+                        </span>
+                      )}
+                      {row.status === "issued" && (
+                        <span className="inline-flex items-center gap-2 rounded-full border border-emerald-300 bg-emerald-100/80 px-3 py-1 text-xs font-medium text-emerald-800">
+                          <span className="h-1.5 w-1.5 rounded-full bg-emerald-500" aria-hidden />
+                          Issued
+                        </span>
+                      )}
+                      {row.status === "error" && (
+                        <span className="inline-flex items-center gap-2 rounded-full border border-rose-300 bg-rose-100 px-3 py-1 text-xs font-medium text-rose-800">
+                          <span className="h-1.5 w-1.5 rounded-full bg-rose-500" aria-hidden />
+                          Failed
+                        </span>
+                      )}
+                    </div>
+                  </div>
+                  {row.message && <p className="mt-3 text-xs text-slate-500">{row.message}</p>}
+                  {row.verifyUrl && (
+                    <div className="mt-3 text-xs text-slate-500">
+                      Verifier link:{" "}
+                      <a
+                        href={row.verifyUrl}
+                        target="_blank"
+                        rel="noreferrer"
+                        className="font-medium text-sky-600 hover:text-sky-700"
+                      >
+                        {row.verifyUrl}
+                      </a>
+                    </div>
+                  )}
+                </article>
+              ))}
+            </div>
+          </div>
+
+          <aside className="flex flex-col gap-6 rounded-2xl border border-slate-200 bg-slate-50/80 p-6 text-sm text-slate-600">
+            <div>
+              <h3 className="text-lg font-semibold text-slate-900">Why the verifier asks for the PDF</h3>
+              <p className="mt-2 text-sm text-slate-600">
+                The QR encodes a link to our verification portal. When someone scans it, they are asked to provide the original
+                PDF so we can hash it locally in their browser and compare the digest with what you issued. The document never
+                leaves their device; the upload field exists only to perform this local comparison.
+              </p>
+            </div>
+            <div>
+              <h3 className="text-lg font-semibold text-slate-900">Best practices</h3>
+              <ul className="mt-2 space-y-2 text-sm">
+                <li className="flex gap-2">
+                  <span className="mt-1 h-1.5 w-1.5 rounded-full bg-sky-500" aria-hidden />
+                  Encourage recipients to keep the sealed copy you send. The verifier will highlight any mismatch instantly.
+                </li>
+                <li className="flex gap-2">
+                  <span className="mt-1 h-1.5 w-1.5 rounded-full bg-sky-500" aria-hidden />
+                  If you revoke a credential, the verifier page will show the revoked status in real time.
+                </li>
+                <li className="flex gap-2">
+                  <span className="mt-1 h-1.5 w-1.5 rounded-full bg-sky-500" aria-hidden />
+                  Use descriptive file names; we remember them locally so the history table is easy to scan later.
+                </li>
+              </ul>
+            </div>
+          </aside>
+        </section>
+
+        <section className="rounded-3xl border border-slate-200 bg-white p-8 shadow-2xl shadow-slate-200/70">
+          <div className="flex flex-col gap-3 sm:flex-row sm:items-end sm:justify-between">
+            <div>
+              <h2 className="text-2xl font-semibold text-slate-900">Issued credentials log</h2>
+              <p className="text-sm text-slate-600">
+                Recent seals issued under your account. File names are stored only in your browser for privacy.
+              </p>
+            </div>
+            <a
+              href="/v"
+              className="inline-flex items-center gap-2 rounded-full border border-sky-200 bg-sky-50 px-4 py-2 text-xs font-medium text-sky-700 transition hover:border-sky-300 hover:bg-sky-100"
+            >
+              Open verifier portal
+              <svg viewBox="0 0 16 16" className="h-3.5 w-3.5" fill="currentColor">
+                <path d="M6.75 3.5a.75.75 0 0 0 0 1.5h2.69L3.22 11.22a.75.75 0 1 0 1.06 1.06l6.22-6.22v2.69a.75.75 0 0 0 1.5 0V3.5a.75.75 0 0 0-.75-.75h-4.5z" />
+              </svg>
+            </a>
+          </div>
+
           {history.length === 0 ? (
-            <p className="text-sm text-slate-600">No credentials issued yet.</p>
+            <div className="mt-6 rounded-2xl border border-dashed border-slate-200 bg-slate-50 px-6 py-10 text-center text-sm text-slate-500">
+              No credentials issued yet. When you stamp a PDF, it will appear here along with its status and verifier link.
+            </div>
           ) : (
-            <div className="overflow-x-auto">
-              <table className="w-full text-sm">
-                <thead>
-                  <tr className="text-left text-slate-500">
-                    <th className="py-2">Date</th>
-                    <th className="py-2">Code</th>
-                    <th className="py-2">Status</th>
-                    <th className="py-2">Verify</th>
+            <div className="mt-6 overflow-hidden rounded-2xl border border-slate-200">
+              <table className="w-full min-w-full text-sm">
+                <thead className="bg-slate-50 text-left text-slate-500">
+                  <tr>
+                    <th className="px-4 py-3 font-medium">Issued</th>
+                    <th className="px-4 py-3 font-medium">Document</th>
+                    <th className="px-4 py-3 font-medium">Code</th>
+                    <th className="px-4 py-3 font-medium">Status</th>
+                    <th className="px-4 py-3 font-medium">Verify</th>
                   </tr>
                 </thead>
                 <tbody>
                   {history.map((r, i) => {
                     const code = shortHash(r.sha256 || "");
-                    const date = r.issued_at ? new Date(r.issued_at).toLocaleString() : "";
+                    const date = r.issued_at ? new Date(r.issued_at).toLocaleString() : "—";
+                    const storedName = r.doc_filename || (r.sha256 ? nameIndex[r.sha256.toLowerCase()] : undefined);
                     return (
-                      <tr key={i} className="border-t border-slate-200">
-                        <td className="py-2 whitespace-nowrap">{date}</td>
-                        <td className="py-2 whitespace-nowrap">{code}</td>
-                        <td className="py-2 whitespace-nowrap">
-                          {r.status === "active" && <span className="text-emerald-700">active</span>}
-                          {r.status === "revoked" && <span className="text-rose-700">revoked</span>}
-                          {r.status !== "active" && r.status !== "revoked" && <span>{r.status}</span>}
+                      <tr key={i} className="border-t border-slate-100 text-slate-700">
+                        <td className="whitespace-nowrap px-4 py-3 text-sm text-slate-600">{date}</td>
+                        <td className="px-4 py-3">
+                          <div className="font-medium text-slate-800">{storedName || "—"}</div>
+                          <div className="text-[11px] text-slate-400">CID: {r.cid}</div>
+                        </td>
+                        <td className="px-4 py-3 font-mono text-xs text-slate-500">{code}</td>
+                        <td className="px-4 py-3">
+                          {r.status === "active" && (
+                            <span className="rounded-full border border-emerald-300 bg-emerald-100/90 px-3 py-1 text-xs font-medium text-emerald-700">
+                              Active
+                            </span>
+                          )}
+                          {r.status === "revoked" && (
+                            <span className="rounded-full border border-rose-300 bg-rose-100/90 px-3 py-1 text-xs font-medium text-rose-700">
+                              Revoked
+                            </span>
+                          )}
+                          {r.status !== "active" && r.status !== "revoked" && (
+                            <span className="rounded-full border border-slate-200 bg-slate-100 px-3 py-1 text-xs text-slate-600">{r.status}</span>
+                          )}
                         </td>
-                        <td className="py-2 whitespace-nowrap">
-                          <a href={`/v/${r.cid}`} target="_blank" className="text-sky-700 underline">
+                        <td className="px-4 py-3">
+                          <a
+                            href={`/v/${r.cid}`}
+                            target="_blank"
+                            rel="noreferrer"
+                            className="inline-flex items-center gap-2 rounded-full border border-sky-200 bg-sky-50 px-3 py-1 text-xs font-medium text-sky-700 transition hover:border-sky-300 hover:bg-sky-100"
+                          >
                             Open
+                            <svg viewBox="0 0 16 16" className="h-3.5 w-3.5" fill="currentColor">
+                              <path d="M6.75 3.5a.75.75 0 0 0 0 1.5h2.69L3.22 11.22a.75.75 0 1 0 1.06 1.06l6.22-6.22v2.69a.75.75 0 0 0 1.5 0V3.5a.75.75 0 0 0-.75-.75h-4.5z" />
+                            </svg>
                           </a>
                         </td>
                       </tr>
                     );
                   })}
                 </tbody>
               </table>
             </div>
           )}
-        </div>
+        </section>
       </main>
-
-      <footer className="py-8 text-center text-xs text-slate-500">
-        © {new Date().getFullYear()} GecorpID — Powered by GECORP
-      </footer>
     </div>
   );
 }
 
EOF
)
