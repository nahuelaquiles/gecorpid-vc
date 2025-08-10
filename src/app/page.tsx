'use client';

import Link from 'next/link';

export default function Home() {
  return (
    <main className="min-h-screen flex items-center justify-center p-6 bg-gray-50">
      <div className="w-full max-w-xl bg-white rounded-2xl shadow p-8 grid gap-4 text-center">
        <h1 className="text-2xl font-semibold">GECORP ID — Credenciales Verificables</h1>
        <p className="text-sm text-gray-600">
          Emite una Verifiable Credential (JWT) firmada con <code>did:web</code> y genera su QR para verificación.
        </p>
        <div className="flex gap-3 justify-center">
          <Link href="/issue" className="px-4 py-2 rounded-xl bg-black text-white">Emitir credencial</Link>
          <Link href="/verify" className="px-4 py-2 rounded-xl border">Verificar (pegar ?jwt=...)</Link>
        </div>
        <p className="text-xs text-gray-500">Issuer: did:web:gecorpid.com</p>
      </div>
    </main>
  );
}
