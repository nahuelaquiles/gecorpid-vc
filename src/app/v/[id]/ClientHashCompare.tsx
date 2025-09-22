'use client';

import React, { useState, DragEvent } from 'react';

export default function ClientHashCompare({ expected }: { expected: string }) {
  const [calc, setCalc] = useState<string | null>(null);
  const [match, setMatch] = useState<boolean | null>(null);
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState<string | null>(null);

  async function computeHash(file: File) {
    setBusy(true);
    setError(null);
    try {
      const buf = await file.arrayBuffer();
      const hashBuf = await crypto.subtle.digest('SHA-256', buf);
      const hex = Array.from(new Uint8Array(hashBuf))
        .map((b) => b.toString(16).padStart(2, '0'))
        .join('');
      setCalc(hex);
      setMatch(hex === expected);
    } catch (e: any) {
      setError(e.message || 'Error calculando hash');
    } finally {
      setBusy(false);
    }
  }

  function onDrop(e: DragEvent<HTMLDivElement>) {
    e.preventDefault();
    if (e.dataTransfer.files && e.dataTransfer.files[0]) {
      computeHash(e.dataTransfer.files[0]);
    }
  }

  return (
    <div>
      <h2 className="text-lg font-semibold mb-2">Verificación local (opcional)</h2>
      <p className="text-sm text-slate-600 mb-3">
        Arrastrá aquí el PDF para comprobar, SIN subirlo, que su hash coincide con la credencial.
      </p>

      <div
        onDragOver={(e) => e.preventDefault()}
        onDrop={onDrop}
        className="border-2 border-dashed border-slate-300 rounded-2xl p-8 text-center bg-white"
      >
        <input
          type="file"
          accept="application/pdf"
          onChange={(e) => e.target.files?.[0] && computeHash(e.target.files[0])}
          className="hidden"
          id="file"
        />
        <label
          htmlFor="file"
          className="cursor-pointer inline-block px-4 py-2 rounded-lg border bg-slate-800 text-white"
        >
          Seleccionar PDF
        </label>
        <div className="text-xs text-slate-500 mt-2">o arrastrá el archivo aquí</div>
      </div>

      {busy && <div className="mt-4 text-sm">Calculando…</div>}
      {calc && (
        <div className="mt-4 rounded-xl border bg-white p-4">
          <div className="text-xs text-slate-500">Hash calculado</div>
          <div className="font-mono text-sm break-all">{calc}</div>
          <div className={`mt-2 font-semibold ${match ? 'text-emerald-600' : 'text-rose-600'}`}>
            {match ? '✅ Coincide con la credencial' : '❌ NO coincide con la credencial'}
          </div>
        </div>
      )}
      {error && <div className="mt-4 text-rose-600 text-sm">{error}</div>}
    </div>
  );
}
