'use client';
/* eslint-disable @next/next/no-img-element */

import { Suspense, useEffect, useState } from 'react';
import { useSearchParams } from 'next/navigation';
import QRCode from 'qrcode';

// Evita SSG y fuerza render dinámico de esta página
export const dynamic = 'force-dynamic';
export const revalidate = 0;

export default function VerifyPage() {
  return (
    <Suspense fallback={<div className="p-6 text-sm">Cargando verificación…</div>}>
      <VerifyClient />
    </Suspense>
  );
}

function VerifyClient() {
  const sp = useSearchParams();
  const [qr, setQr] = useState<string>('');

  const jwt = sp.get('jwt') ?? ''; // ?jwt=...

  useEffect(() => {
    let alive = true;
    async function makeQR() {
      try {
        if (!jwt) return;
        const dataUrl = await QRCode.toDataURL(jwt);
        if (alive) setQr(dataUrl);
      } catch {
        // silenciar
      }
    }
    makeQR();
    return () => {
      alive = false;
    };
  }, [jwt]);

  return (
    <main className="min-h-screen p-6 flex items-center justify-center bg-gray-50">
      <div className="w-full max-w-2xl bg-white rounded-2xl shadow p-6 grid gap-4">
        <h1 className="text-xl font-semibold">Verificar credencial</h1>

        {!jwt ? (
          <p className="text-sm text-gray-600">
            Pega un token en la URL como <code>?jwt=&lt;TU_JWT&gt;</code> para generar el QR y mostrar el contenido.
          </p>
        ) : (
          <>
            <div className="grid md:grid-cols-2 gap-4">
              <div className="border rounded-lg p-3">
                <h2 className="text-sm font-medium mb-2">QR del JWT</h2>
                {qr ? (
                  <img src={qr} alt="QR del JWT" className="w-full h-auto" />
                ) : (
                  <div className="text-xs text-gray-500">Generando QR…</div>
                )}
              </div>
              <div className="border rounded-lg p-3">
