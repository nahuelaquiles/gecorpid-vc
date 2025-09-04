// src/app/login/page.tsx
'use client';

import { useState } from 'react';
import { useRouter } from 'next/navigation';
import Link from 'next/link';

export default function LoginPage() {
  const router = useRouter();
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [errorMsg, setErrorMsg] = useState('');
  const [loading, setLoading] = useState(false);

  const onSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setErrorMsg('');
    setLoading(true);

    try {
      const res = await fetch('/api/login', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ email, password }),
      });

      const data = await res.json();

      if (!res.ok) {
        setErrorMsg(data?.error || 'Login failed');
        return;
      }

      // Guarda las credenciales de trabajo para el cliente
      localStorage.setItem('apiKey', data.apiKey);
      localStorage.setItem('tenantId', data.tenantId);

      // Redirige al panel del cliente (lo crearemos en el paso 4)
      router.push('/client');
    } catch (err: unknown) {
      const message = err instanceof Error ? err.message : 'Unexpected error';
      setErrorMsg(message);
    } finally {
      setLoading(false);
    }
  };

  return (
    <main style={{ display: 'grid', placeItems: 'center', minHeight: '70vh', padding: '2rem' }}>
      <div style={{ width: '100%', maxWidth: 420 }}>
        <h1 style={{ fontSize: '1.6rem', marginBottom: '0.75rem' }}>Ingreso de cliente</h1>
        <p style={{ color: '#666', marginBottom: '1.25rem' }}>
          Usa el <b>email</b> y <b>password</b> del tenant que creaste en Supabase.
        </p>

        <form onSubmit={onSubmit} style={{ display: 'grid', gap: '0.75rem' }}>
          <label style={{ display: 'grid', gap: '0.35rem' }}>
            <span>Email</span>
            <input
              type="email"
              value={email}
              onChange={(e) => setEmail(e.target.value)}
              required
              placeholder="cliente@ejemplo.com"
              style={{
                padding: '0.6rem 0.7rem',
                border: '1px solid #ccc',
                borderRadius: 8,
              }}
            />
          </label>

          <label style={{ display: 'grid', gap: '0.35rem' }}>
            <span>Password</span>
            <input
              type="password"
              value={password}
              onChange={(e) => setPassword(e.target.value)}
              required
              placeholder="••••••"
              style={{
                padding: '0.6rem 0.7rem',
                border: '1px solid #ccc',
                borderRadius: 8,
              }}
            />
          </label>

          <button
            type="submit"
            disabled={loading}
            style={{
              padding: '0.7rem 0.9rem',
              borderRadius: 10,
              border: '1px solid #222',
              background: loading ? '#999' : '#222',
              color: '#fff',
              fontWeight: 600,
              cursor: loading ? 'not-allowed' : 'pointer',
              transition: 'opacity .2s',
            }}
          >
            {loading ? 'Verificando…' : 'Entrar'}
          </button>

          {errorMsg ? (
            <div style={{ color: '#b00020', marginTop: '0.25rem' }}>{errorMsg}</div>
          ) : null}
        </form>

        <div style={{ marginTop: '1rem', fontSize: '0.92rem' }}>
          <Link href="/" style={{ color: '#555', textDecoration: 'underline' }}>
            Volver al inicio
          </Link>
        </div>

        <div style={{ marginTop: '1rem', color: '#666', fontSize: '0.9rem' }}>
          <p>
            Tras un login exitoso, te redirige a <code>/client</code>. Si ves “Not Found” es normal
            hasta que creemos esa página en el paso 4. Las claves quedan guardadas en tu navegador.
          </p>
        </div>
      </div>
    </main>
  );
}
