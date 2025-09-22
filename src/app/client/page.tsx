/* eslint-disable @next/next/no-img-element */
'use client';

import React, { useState } from 'react';
import QRCode from 'qrcode';
import { PDFDocument } from 'pdf-lib';

const SITE_URL = process.env.NEXT_PUBLIC_SITE_URL || 'https://gecorpid.com';

type Step = 1 | 2 | 3 | 4;

export default function ClientPortal() {
  const [apiKey, setApiKey] = useState('');
  const [cid, setCid] = useState<string | null>(null);
  const [verifyUrl, setVerifyUrl] = useState<string | null>(null);
  const [file, setFile] = useState<File | null>(null);
  const [stampedBytes, setStampedBytes] = useState<Uint8Array | null>(null);
  const [sha256, setSha256] = useState<string | null>(null);
  const [vcJwt, setVcJwt] = useState<string | null>(null);
  const [busy, setBusy] = useState(false);
  const [step, setStep] = useState<Step>(1);
  const [msg, setMsg] = useState<string | null>(null);

  async function requestCID() {
    if (!apiKey) { setMsg('Ingresá tu API Key'); return; }
    setBusy(true); setMsg(null);
    try {
      const r = await fetch('/api/issue-request', { method: 'POST', headers: { 'x-api-key': apiKey } });
      const j = await r.json();
      if (!r.ok) throw new Error(j.error || 'Error solicitando CID');
      setCid(j.cid);
      setVerifyUrl(j.verify_url);
      setStep(2);
    } catch (e: any) {
      setMsg(e.message);
    } finally {
      setBusy(false);
    }
  }

  async function stampQrLocally() {
    if (!file || !verifyUrl) { setMsg('Elegí un PDF y solicitá CID primero'); return; }
    setBusy(true); setMsg(null);
    try {
      const qrDataUrl = await QRCode.toDataURL(verifyUrl);
      const pdfBytes = new Uint8Array(await file.arrayBuffer());
      const pdf = await PDFDocument.load(pdfBytes);

      // Incrustar QR en primera página (esquinas inferiores derechas)
      const page = pdf.getPages()[0];
      const { width } = page.getSize();
      const png = await pdf.embedPng(qrDataUrl);
      const size = 120;
      page.drawImage(png, { x: width - size - 20, y: 20, width: size, height: size });

      const saved = await pdf.save({ useObjectStreams: false }); // estable para hashing
      const stamped = new Uint8Array(saved);
      setStampedBytes(stamped);
      setStep(3);
    } catch (e: any) {
      setMsg(e.message);
    } finally {
      setBusy(false);
    }
  }

  async function computeHash() {
    if (!stampedBytes) { setMsg('Primero generá el PDF con QR'); return; }
    setBusy(true); setMsg(null);
    try {
      const hashBuf = await crypto.subtle.digest('SHA-256', stampedBytes);
      const hex = Array.from(new Uint8Array(hashBuf)).map(b => b.toString(16).padStart(2, '0')).join('');
      setSha256(hex);
      setStep(4);
    } catch (e: any) {
      setMsg(e.message);
    } finally {
      setBusy(false);
    }
  }

  async function issueFinal() {
    if (!apiKey || !cid || !sha256) { setMsg('Faltan datos (API Key, CID, SHA-256)'); return; }
    setBusy(true); setMsg(null);
    try {
      const r = await fetch('/api/issue-final', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json', 'x-api-key': apiKey },
        body: JSON.stringify({ cid, sha256, doc_type: 'genetic_report' })
      });
      const j = await r.json();
      if (!r.ok) throw new Error(j.error || 'Error emitiendo la VC');
      setVcJwt(j.vc_jwt);
      setMsg('¡Credencial emitida con éxito! (se descontó 1 crédito)');
    } catch (e: any) {
      setMsg(e.message);
    } finally {
      setBusy(false);
    }
  }

  function downloadStamped() {
    if (!stampedBytes) return;
    const blob = new Blob([stampedBytes], { type: 'application/pdf' });
    const a = document.createElement('a');
    a.href = URL.createObjectURL(blob);
    a.download = `documento_con_QR_${cid || 'verificable'}.pdf`;
    a.click();
  }

  return (
    <div className="min-h-screen bg-slate-50 text-slate-800">
      <div className="max-w-3xl mx-auto py-10 px-6">
        <h1 className="text-2xl font-semibold mb-4">Portal del Cliente — Emisión local sin subir PDFs</h1>
        <p className="text-sm text-slate-600 mb-6">
          Flujo: <b>Solicitar CID → Estampar QR local → Calcular SHA-256 → Emitir VC</b>. 
          El PDF nunca sale de tu computadora/servidor.
        </p>

        <div className="space-y-6">
          {/* Paso 1 */}
          <div className="rounded-2xl border bg-white p-5 shadow-sm">
            <div className="flex items-center justify-between mb-3">
              <h2 className="font-semibold">Paso 1 — Solicitar CID</h2>
              <span className="text-xs px-2 py-1 rounded bg-slate-100">Estado: {step >= 2 ? 'OK' : 'Pendiente'}</span>
            </div>
            <div className="flex gap-2">
              <input
                type="password"
                placeholder="Tu API Key"
                className="flex-1 rounded-lg border px-3 py-2"
                value={apiKey}
                onChange={(e) => setApiKey(e.target.value)}
              />
              <button onClick={requestCID} className="px-4 py-2 rounded-lg bg-slate-800 text-white" disabled={busy}>
                Obtener CID
              </button>
            </div>
            {cid && verifyUrl && (
              <div className="mt-3 text-sm">
                <div><b>CID:</b> <span className="font-mono">{cid}</span></div>
                <div><b>URL de verificación:</b> <a className="text-blue-600 underline" href={verifyUrl} target="_blank">{verifyUrl}</a></div>
              </div>
            )}
          </div>

          {/* Paso 2 */}
          <div className="rounded-2xl border bg-white p-5 shadow-sm">
            <div className="flex items-center justify-between mb-3">
              <h2 className="font-semibold">Paso 2 — Elegí PDF y estampá QR local</h2>
              <span className="text-xs px-2 py-1 rounded bg-slate-100">Estado: {step >= 3 ? 'OK' : 'Pendiente'}</span>
            </div>
            <div className="flex items-center gap-2">
              <input type="file" accept="application/pdf" onChange={(e) => setFile(e.target.files?.[0] || null)} />
              <button onClick={stampQrLocally} className="px-4 py-2 rounded-lg bg-slate-800 text-white" disabled={busy || !cid || !verifyUrl || !file}>
                Estampar QR (local)
              </button>
              <button onClick={downloadStamped} className="px-4 py-2 rounded-lg border" disabled={!stampedBytes}>
                Descargar PDF con QR
              </button>
            </div>
          </div>

          {/* Paso 3 */}
          <div className="rounded-2xl border bg-white p-5 shadow-sm">
            <div className="flex items-center justify-between mb-3">
              <h2 className="font-semibold">Paso 3 — Calcular SHA-256 (local)</h2>
              <span className="text-xs px-2 py-1 rounded bg-slate-100">Estado: {step >= 4 ? 'OK' : 'Pendiente'}</span>
            </div>
            <button onClick={computeHash} className="px-4 py-2 rounded-lg bg-slate-800 text-white" disabled={busy || !stampedBytes}>
              Calcular Hash
            </button>
            {sha256 && (
              <div className="mt-3 text-sm">
                <div><b>SHA-256:</b> <span className="font-mono break-all">{sha256}</span></div>
                <div><b>Huella corta:</b> <span className="font-mono">{sha256.slice(-8).toUpperCase()}</span></div>
              </div>
            )}
          </div>

          {/* Paso 4 */}
          <div className="rounded-2xl border bg-white p-5 shadow-sm">
            <div className="flex items-center justify-between mb-3">
              <h2 className="font-semibold">Paso 4 — Emitir VC (sin subir PDF)</h2>
            </div>
            <button onClick={issueFinal} className="px-4 py-2 rounded-lg bg-emerald-600 text-white" disabled={busy || !sha256 || !cid}>
              Emitir Credencial
            </button>
            {vcJwt && (
              <div className="mt-4">
                <div className="text-sm font-semibold mb-1">VC (JWT):</div>
                <textarea className="w-full h-40 text-xs font-mono rounded-lg border p-2" readOnly value={vcJwt} />
                {verifyUrl && (
                  <div className="mt-2 text-sm">
                    Verificación pública: <a className="text-blue-600 underline" href={verifyUrl} target="_blank">{verifyUrl}</a>
                  </div>
                )}
              </div>
            )}
          </div>

          {busy && <div className="text-sm">Procesando…</div>}
          {msg && <div className="text-sm text-rose-600">{msg}</div>}
        </div>
      </div>
    </div>
  );
}
