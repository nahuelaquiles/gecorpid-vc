'use client';
import { useState } from 'react';

export default function AdminLogin() {
  const [password, setPassword] = useState('');
  const [err, setErr] = useState<string|null>(null);

  async function onSubmit(e: React.FormEvent) {
    e.preventDefault();
    setErr(null);
    const r = await fetch('/api/admin/login', {
      method: 'POST',
      headers: { 'content-type': 'application/json' },
      body: JSON.stringify({ password }),
    });
    if (r.ok) window.location.href = '/admin';
    else {
      const j = await r.json();
      setErr(j.error || 'Error');
    }
  }

  return (
    <div className="p-6 max-w-sm mx-auto">
      <h1 className="text-xl font-semibold mb-4">Admin Login</h1>
      <form onSubmit={onSubmit} className="space-y-3">
        <input type="password" className="border rounded w-full p-2"
          placeholder="Admin password"
          onChange={e=>setPassword(e.target.value)} value={password}/>
        {err && <div className="text-red-600 text-sm">{err}</div>}
        <button className="border rounded px-4 py-2">Entrar</button>
      </form>
    </div>
  );
}
