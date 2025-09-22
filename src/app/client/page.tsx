'use client';

import React, { useCallback, useEffect, useMemo, useRef, useState } from 'react';
import QRCode from 'qrcode';
import { PDFDocument, StandardFonts, rgb } from 'pdf-lib';

// ---------- Utilidades cliente (100% local) ----------
async function fileToArrayBuffer(file: File) {
  return await file.arrayBuffer();
}
async function sha256HexClient(buf: ArrayBuffer): Promise<string> {
  const hash = await crypto.subtle.digest('SHA-256', buf);
  const bytes = Array.from(new Uint8Array(hash));
  return bytes.map(b => b.toString(16).padStart(2, '0')).join('');
}
function shortFingerprint(hex: string) {
  // 4 bytes altos
  return hex.substring(0, 8).toUpperCase();
}

async function stampPdfWithQr(pdfBytes: ArrayBuffer, qrText: string): Promise<Uint8Array> {
  const pdfDoc = await PDFDocument.load(pdfBytes);
  const pages = pdfDoc.getPages();

  // Generar PNG del QR
  const qrDataUrl = await QRCode.toDataURL(qrText, { errorCorrectionLevel: 'M', margin: 1, scale: 6 });
  const pngBytes = Uint8Array.from(atob(qrDataUrl.split(',')[1]), c => c.charCodeAt(0));
  const pngImage = await pdfDoc.embedPng(pngBytes);
  const pngDims = pngImage.scale(0.45);

  // Tipografía para títulos
  const font = await pdfDoc.embedFont(StandardFonts.HelveticaBold);

  // Sello en la primera página (y opcional en todas)
  pages.forEach((p, idx) => {
    const { width, height } = p.getSize();
    const margin = 24;
    const boxW = pngDims.width + 24;
    const boxH = pngDims.height + 54;

    // marco suave
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

    // títulos
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

// ---------- Tipos UI ----------
type Row = {
  name: string;
  cid?: string;
  verifyUrl?: string;
  sha256?: string;
  short?: string;
  status: 'pending' | 'stamped' | 'issued' | 'error';
  message?: string;
  downloadUrl?: string;
  vc_jwt?: string;
};

export default function ClientAutoIssue() {
  const [rows, setRows] = useState<Row[]>([]);
  const [credits, setCredits] = useState<number | null>(null);
  const [loading, setLoading] = useState(false);
  const [apiKeyUI, setApiKeyUI] = useState(''); // solo si hace falta pedirla 1ra vez
  const [needsKey, setNeedsKey] = useState(false);

  // --------- API KEY desde cookie/localStorage (no UI por defecto) ----------
  useEffect(() => {
    // si el server ya dejó cookie, no pedimos nada
    const cookieHasKey = document.cookie.split('; ').some(c => c.startsWith('client_api_key='));
    if (cookieHasKey) {
      setNeedsKey(false);
      return;
    }
    // fallback: localStorage de una sesión anterior
    const k = localStorage.getItem('client_api_key');
    if (k) {
      setNeedsKey(false);
      // set cookie para que el server la use en los proxys
      document.cookie = `client_api_key=${encodeURIComponent(k)}; Path=/; SameSite=Lax; Max-Age=${60 * 60 * 24 * 365}`;
    } else {
      // si no hay nada, mostramos una banda chiquita para cargarla 1 sola vez
      setNeedsKey(true);
    }
  }, []);

  const onSaveKey = useCallback(() => {
    if (!apiKeyUI.trim()) return;
    localStorage.setItem('client_api_key', apiKeyUI.trim());
    document.cookie = `client_api_key=${encodeURIComponent(apiKeyUI.trim())}; Path=/; SameSite=Lax; Max-Age=${60 * 60 * 24 * 365}`;
    setNeedsKey(false);
    setApiKeyUI('');
    void fetchCredits();
  }, [apiKeyUI]);

  // --------- Proxys server-side con cookie ----------
  async function proxyIssueRequest(): Promise<{ cid: string; verify_url: string }> {
    const res = await fetch('/api/client/issue-request', { method: 'POST' });
    const j = await res.json();
    if (!res.ok) throw new Error(j.error || 'issue-request failed');
    return j;
  }
  async function proxyIssueFinal(payload: { cid: string; sha256: string; doc_type?: string }): Promise<{ vc_jwt: string }> {
    const res = await fetch('/api/client/issue-final', {
      method: 'POST',
      headers: { 'content-type': 'application/json' },
      body: JSON.stringify(payload),
    });
    const j = await res.json();
    if (!res.ok) throw new Error(j.error || 'issue-final failed');
    return j;
  }
  async function fetchCredits() {
    try {
      const res = await fetch('/api/client/credits', { cache: 'no-store' });
      const j = await res.json();
      if (res.ok) setCredits(j.credits ?? null);
    } catch {}
  }

  useEffect(() => {
    fetchCredits();
  }, []);

  // --------- Flujo 1 paso: subir PDFs y listo ----------
  const onPickFiles = useCallback(async (ev: React.ChangeEvent<HTMLInputElement>) => {
    const files = ev.target.files;
    if (!files || files.length === 0) return;

    setLoading(true);
    const nextRows: Row[] = [];
    for (const file of Array.from(files)) {
      nextRows.push({ name: file.name, status: 'pending' });
    }
    setRows(nextRows);

    for (let i = 0; i < files.length; i++) {
      const file = files[i];

      try {
        // 1) pedir cid y verify_url
        const { cid, verify_url } = await proxyIssueRequest();

        // 2) estampar QR local (automático)
        const buf = await fileToArrayBuffer(file);
        const stamped = await stampPdfWithQr(buf, verify_url);

        // 3) hash local del PDF con QR
        const sha256 = await sha256HexClient(stamped.buffer);
        const short = shortFingerprint(sha256);

        // 4) emitir VC (servidor firma con EdDSA)
        const { vc_jwt } = await proxyIssueFinal({ cid, sha256, doc_type: 'pdf' });

        // 5) preparar descarga automática
        const blob = new Blob([stamped], { type: 'application/pdf' });
        const url = URL.createObjectURL(blob);
        const fname = file.name.replace(/\.pdf$/i, '') + `_VC_${short}.pdf`;

        // dispara descarga
        const a = document.createElement('a');
        a.href = url;
        a.download = fname;
        a.click();
        URL.revokeObjectURL(url);

        // actualizar fila
        setRows(prev => {
          const copy = [...prev];
          copy[i] = {
            name: file.name,
            cid,
            verifyUrl: verify_url,
            sha256,
            short,
            status: 'issued',
            downloadUrl: '', // ya descargado
            vc_jwt,
          };
          return copy;
        });
      } catch (err: any) {
        setRows(prev => {
          const copy = [...prev];
          copy[i] = {
            name: file.name,
            status: 'error',
            message: err?.message || 'Error',
          };
          return copy;
        });
      }
    }

    setLoading(false);
    void fetchCredits();
  }, []);

  // ---------- UI ----------
  return (
    <div className="min-h-screen bg-slate-50 text-slate-900">
      <header className="sticky top-0 z-10 bg-white/80 backdrop-blur border-b border-slate-200">
        <div className="mx-auto max-w-5xl px-4 py-3 flex items-center justify-between">
          <div className="flex items-center gap-3">
            <img
              src="https://www.gecorp.com.ar/wp-content/uploads/2021/12/cropped-GECORP-ISOLOGO-2021.png"
              alt="GECORP"
              className="h-9 w-9 rounded"
            />
            <div className="leading-tight">
              <div className="font-semibold">GecorpID • VC</div>
              <div className="text-xs text-slate-500">Emisión local sin subir PDFs</div>
            </div>
          </div>
          <div className="text-sm text-slate-600">
            Créditos:&nbsp;
            <span className="inline-flex items-center rounded-full bg-emerald-50 px-2 py-0.5 text-emerald-700 border border-emerald-200">
              {credits ?? '—'}
            </span>
          </div>
        </div>
      </header>

      {needsKey && (
        <div className="mx-auto max-w-5xl px-4 mt-4">
          <div className="rounded-xl border border-amber-300 bg-amber-50 p-4 text-sm">
            <div className="font-medium mb-2">Autorización del laboratorio</div>
            <p className="mb-3">
              Esta es la primera vez en este navegador. Ingresá tu API Key del laboratorio para
              recordarla (no se muestra luego). Se guarda en cookie de este dominio.
            </p>
            <div className="flex gap-2">
              <input
                value={apiKeyUI}
                onChange={e => setApiKeyUI(e.target.value)}
                placeholder="API Key del laboratorio"
                className="flex-1 rounded-lg border border-slate-300 px-3 py-2"
              />
              <button
                className="rounded-lg px-3 py-2 bg-slate-900 text-white hover:bg-slate-800"
                onClick={onSaveKey}
              >
                Guardar
              </button>
            </div>
          </div>
        </div>
      )}

      <main className="mx-auto max-w-5xl px-4 py-8">
        <div className="rounded-2xl bg-white shadow-soft border border-slate-200 p-6">
          <h1 className="text-xl font-semibold mb-4">Emití credenciales subiendo tus PDFs</h1>
          <p className="text-sm text-slate-600 mb-4">
            Cargá uno o varios archivos PDF. La plataforma estampa el QR, calcula el SHA-256 localmente,
            emite la VC y descarga el PDF sellado. El PDF nunca se sube al servidor.
          </p>

          <label className="inline-flex items-center gap-2 rounded-2xl border-2 border-dashed border-slate-300 bg-slate-50 hover:bg-slate-100 px-5 py-10 cursor-pointer">
            <div className="text-slate-600">
              <div className="font-medium">Hacé click o arrastrá tus PDF aquí</div>
              <div className="text-xs">Se emitirá una VC por cada PDF</div>
            </div>
            <input
              type="file"
              accept="application/pdf"
              multiple
              className="hidden"
              onChange={onPickFiles}
            />
          </label>

          {loading && (
            <div className="mt-4 text-sm text-slate-600">Procesando…</div>
          )}

          {rows.length > 0 && (
            <div className="mt-6">
              <table className="w-full text-sm">
                <thead>
                  <tr className="text-left text-slate-500">
                    <th className="py-2">Archivo</th>
                    <th className="py-2">CID</th>
                    <th className="py-2">Huella</th>
                    <th className="py-2">Estado</th>
                    <th className="py-2">Verificar</th>
                  </tr>
                </thead>
                <tbody>
                  {rows.map((r, i) => (
                    <tr key={i} className="border-t border-slate-200">
                      <td className="py-2">{r.name}</td>
                      <td className="py-2 text-xs">{r.cid || '—'}</td>
                      <td className="py-2">{r.short || '—'}</td>
                      <td className="py-2">
                        {r.status === 'pending' && <span className="text-slate-600">sellando…</span>}
                        {r.status === 'stamped' && <span className="text-slate-600">hash…</span>}
                        {r.status === 'issued' && <span className="text-emerald-700">emitida ✔</span>}
                        {r.status === 'error' && <span className="text-rose-700">error: {r.message}</span>}
                      </td>
                      <td className="py-2">
                        {r.verifyUrl ? (
                          <a href={r.verifyUrl} target="_blank" className="text-sky-700 underline">
                            Abrir
                          </a>
                        ) : (
                          '—'
                        )}
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
              <div className="mt-4 text-xs text-slate-500">
                Nota: El PDF sellado se descarga automáticamente; también podés usar el link de verificación.
              </div>
            </div>
          )}
        </div>
      </main>

      <footer className="py-8 text-center text-xs text-slate-500">
        © {new Date().getFullYear()} GECORP — Powered by GECORP
      </footer>
    </div>
  );
}
