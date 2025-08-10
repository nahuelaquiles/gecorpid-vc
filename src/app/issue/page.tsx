'use client';

import { useState } from 'react';

export default function IssuePage() {
  const [subjectId, setSubjectId] = useState('did:key:z6MkZSubject');
  const [givenName, setGivenName] = useState('María');
  const [familyName, setFamilyName] = useState('Pérez');
  const [email, setEmail] = useState('maria@example.com');
  const [loading, setLoading] = useState(false);
  const [jwt, setJwt] = useState('');
  const [vc, setVc] = useState<any>(null);
  const [error, setError] = useState('');

  async function onSubmit(e: React.FormEvent) {
    e.preventDefault();
    setLoading(true);
    setError('');
    setJwt('');
    setVc(null);
    try {
      const res = await fetch('/api/issue', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          subjectId,
          claims: { givenName, familyName, email }
        })
      });
      const data = await res.json();
      if (!res.ok) throw new Error(data?.error || 'Error emitiendo VC');
      setJwt(data.jwt);
      setVc(data.vc);
    } catch (err: any) {
      setError(err?.message || 'Error desconocido');
    } finally {
      setLoading(false);
    }
  }

  return (
    <main className="min-h-screen flex items-center justify-center p-6 bg-gray-50">
      <div className="w-full max-w-3xl rounded-2xl shadow bg-white p-6 grid gap-4">
        <h1 className="text-xl font-semibold">Emitir credencial (JWT VC)</h1>

        <form onSubmit={onSubmit} className="grid gap-3">
          <label className="grid gap-1">
            <span className="text-sm font-medium">Subject DID</span>
            <input className="border rounded px-3 py-2" value={subjectId}
                   onChange={e=>setSubjectId(e.target.value)} required />
          </label>

          <div className="grid md:grid-cols-2 gap-3">
            <label className="grid gap-1">
              <span className="text-sm font-medium">Nombre</span>
              <input className="border rounded px-3 py-2" value={givenName}
                     onChange={e=>setGivenName(e.target.value)} required />
            </label>
            <label className="grid gap-1">
              <span className="text-sm font-medium">Apellido</span>
              <input className="border rounded px-3 py-2" value={familyName}
                     onChange={e=>setFamilyName(e.target.value)} required />
            </label>
          </div>

          <label className="grid gap-1">
            <span className="text-sm font-medium">Email</span>
            <input type="email" className="border rounded px-3 py-2" value={email}
                   onChange={e=>setEmail(e.target.value)} required />
          </label>

          <button disabled={loading}
                  className="rounded-xl bg-black text-white px-4 py-2 disabled:opacity-60">
            {loading ? 'Firmando…' : 'Emitir'}
          </button>
        </form>

        {error && <div className="p-3 text-sm bg-red-50 border border-red-200 rounded">{error}</div>}

        {vc && (
          <>
            <div>
              <h2 className="text-sm font-medium mb-2">VC (payload)</h2>
              <pre className="text-xs bg-gray-100 p-3 rounded overflow-auto">
                {JSON.stringify(vc, null, 2)}
              </pre>
            </div>
            <div>
              <h2 className="text-sm font-medium mb-2">JWT</h2>
              <textarea readOnly className="w-full h-40 text-xs bg-gray-100 p-3 rounded">{jwt}</textarea>
              <div className="mt-2 text-xs">
                Abrir verificación: <a className="underline text-blue-600"
                  href={`/verify?jwt=${encodeURIComponent(jwt)}`}>/verify?jwt=…</a>
              </div>
            </div>
          </>
        )}
      </div>
    </main>
  );
}
