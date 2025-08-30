'use client';

import React, { useState } from 'react';

export default function VerifyPage() {
  const [jwt, setJwt] = useState('');
  const [result, setResult] = useState<any>(null);
  const [error, setError] = useState('');
  const [loading, setLoading] = useState(false);

  async function onVerify(e: React.FormEvent) {
    e.preventDefault();
    setError('');
    setResult(null);
    setLoading(true);

    try {
      const res = await fetch('/api/verify', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ jwt }),
      });

      if (!res.ok) {
        const txt = await res.text();
        throw new Error(`HTTP ${res.status}: ${txt}`);
      }

      const data = await res.json();
      setResult(data);
    } catch (err: any) {
      setError(err?.message ?? String(err));
    } finally {
      setLoading(false);
    }
  }

  return (
    <main className="max-w-2xl mx-auto p-6 space-y-6">
      <h1 className="text-2xl font-semibold">Verificar credencial</h1>

      <form onSubmit={onVerify} className="space-y-3">
        <label className="grid gap-1">
          <span className="text-sm font-medium">Pega el JWT</span>
          <textarea
            className="w-full h-48 border rounded p-3 font-mono text-xs"
            value={jwt}
            onChange={(e) => setJwt(e.target.value)}
            required
          />
        </label>

        <button
          type="submit"
          disabled={loading}
          className="border rounded px-4 py-2 disabled:opacity-50"
        >
          {loading ? 'Verificando…' : 'Verificar'}
        </button>
      </form>

      {!!error && (
        <div className="text-red-600 whitespace-pre-wrap break-words border border-red-300 rounded p-3 bg-red-50">
          {error}
        </div>
      )}

      {result && (
        <section className="space-y-2">
          <h2 className="text-lg font-medium">Resultado</h2>
          <pre className="w-full border rounded p-3 bg-gray-50 overflow-auto text-xs">
            {JSON.stringify(result, null, 2)}
          </pre>
        </section>
      )}
    </main>
  );
}
