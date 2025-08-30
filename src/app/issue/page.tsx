'use client';

import React, { useState } from 'react';

type IssueResponse = { jwt: string };

export default function IssuePage() {
  const [givenName, setGivenName] = useState('');
  const [familyName, setFamilyName] = useState('');
  const [email, setEmail] = useState('');
  const [subjectId, setSubjectId] = useState('did:example:holder');
  const [apiKey, setApiKey] = useState('');
  const [jwt, setJwt] = useState<string | null>(null);
  const [error, setError] = useState<string>('');
  const [loading, setLoading] = useState<boolean>(false);

  async function onSubmit(e: React.FormEvent<HTMLFormElement>) {
    e.preventDefault();
    setError('');
    setJwt(null);
    setLoading(true);

    try {
      const res = await fetch('/api/issue', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'x-api-key': apiKey,
        },
        body: JSON.stringify({
          subjectId,
          claims: { givenName, familyName, email },
        }),
      });

      if (!res.ok) {
        const txt = await res.text();
        throw new Error(`HTTP ${res.status}: ${txt}`);
      }

      const data = (await res.json()) as IssueResponse;
      setJwt(data.jwt);
    } catch (err: unknown) {
      const msg =
        err instanceof Error ? err.message : typeof err === 'string' ? err : 'Unknown error';
      setError(msg);
    } finally {
      setLoading(false);
    }
  }

  return (
    <main className="max-w-2xl mx-auto p-6 space-y-6">
      <h1 className="text-2xl font-semibold">Emitir credencial</h1>

      <form onSubmit={onSubmit} className="space-y-4">
        <div className="grid md:grid-cols-2 gap-4">
          <label className="grid gap-1">
            <span className="text-sm font-medium">Nombre</span>
            <input
              className="border rounded px-3 py-2"
              value={givenName}
              onChange={(e) => setGivenName(e.target.value)}
              required
            />
          </label>

          <label className="grid gap-1">
            <span className="text-sm font-medium">Apellido</span>
            <input
              className="border rounded px-3 py-2"
              value={familyName}
              onChange={(e) => setFamilyName(e.target.value)}
              required
            />
          </label>

          <label className="grid gap-1 md:col-span-2">
            <span className="text-sm font-medium">Email</span>
            <input
              type="email"
              className="border rounded px-3 py-2"
              value={email}
              onChange={(e) => setEmail(e.target.value)}
              required
            />
          </label>

          <label className="grid gap-1 md:col-span-2">
            <span className="text-sm font-medium">Subject DID/ID (titular)</span>
            <input
              className="border rounded px-3 py-2"
              value={subjectId}
              onChange={(e) => setSubjectId(e.target.value)}
              placeholder="e.g., did:web:gecorpid.com:user123"
              required
            />
          </label>

          <label className="grid gap-1 md:col-span-2">
            <span className="text-sm font-medium">API Key (server)</span>
            <input
              className="border rounded px-3 py-2"
              value={apiKey}
              onChange={(e) => setApiKey(e.target.value)}
              placeholder="ADMIN_SECRET o API_KEY"
              required
            />
          </label>
        </div>

        <button
          type="submit"
          disabled={loading}
          className="border rounded px-4 py-2 disabled:opacity-50"
        >
          {loading ? 'Emitiendo…' : 'Emitir'}
        </button>
      </form>

      {!!error && (
        <div className="text-red-600 whitespace-pre-wrap break-words border border-red-300 rounded p-3 bg-red-50">
          {error}
        </div>
      )}

      {jwt && (
        <section className="space-y-2">
          <h2 className="text-lg font-medium">JWT emitido</h2>
          <textarea
            className="w-full h-48 border rounded p-3 font-mono text-xs"
            value={jwt}
            readOnly
          />
          <div className="flex gap-2">
            <a href="/verify" className="underline">Ir a verificar</a>
            <button
              type="button"
              className="border rounded px-3 py-1"
              onClick={() => navigator.clipboard.writeText(jwt)}
            >
              Copiar
            </button>
          </div>
        </section>
      )}
    </main>
  );
}
