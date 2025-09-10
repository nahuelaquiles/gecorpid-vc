'use client';

import React, { useEffect, useState } from 'react';
import { useRouter } from 'next/navigation';

const DEFAULT_REDIRECT = '/client';

export default function LoginPage() {
  const router = useRouter();
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [errorMsg, setErrorMsg] = useState<string | null>(null);
  const [loading, setLoading] = useState(false);
  const [redirectTo, setRedirectTo] = useState<string>(DEFAULT_REDIRECT);

  // Read ?next=/some/path safely without useSearchParams (avoids Suspense requirement)
  useEffect(() => {
    try {
      const params = new URLSearchParams(window.location.search);
      const next = params.get('next');
      if (next && next.startsWith('/')) setRedirectTo(next);
    } catch {
      // ignore
    }
  }, []);

  const onSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setErrorMsg(null);
    setLoading(true);

    try {
      const res = await fetch('/api/login', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ email, password }),
      });

      const data = await res.json();

      if (!res.ok) {
        setErrorMsg(data?.error || 'Sign-in failed.');
        return;
        }

      // Persist client keys
      localStorage.setItem('apiKey', data.apiKey);
      localStorage.setItem('tenantId', data.tenantId);

      router.push(redirectTo);
    } catch (err: any) {
      setErrorMsg(err?.message || 'Unexpected error.');
    } finally {
      setLoading(false);
    }
  };

  return (
    <main style={{ minHeight: '100vh', display: 'grid', placeItems: 'center', background: '#f7f7f8', padding: '1.5rem' }}>
      <div style={{ width: '100%', maxWidth: 440, background: '#fff', borderRadius: 16, boxShadow: '0 10px 30px rgba(0,0,0,0.06)', padding: '1.5rem' }}>
        <header style={{ marginBottom: '1rem' }}>
          <h1 style={{ fontSize: '1.6rem', fontWeight: 700, margin: 0 }}>Client Sign In</h1>
          <p style={{ color: '#666', marginTop: 6 }}>
            Use your organization-provided credentials to access your dashboard.
          </p>
        </header>

        <form onSubmit={onSubmit} style={{ display: 'grid', gap: '0.85rem' }}>
          <label style={{ display: 'grid', gap: 6 }}>
            <span style={{ fontSize: 14, fontWeight: 600 }}>Email</span>
            <input
              type="email"
              value={email}
              onChange={(e) => setEmail(e.target.value)}
              required
              placeholder="you@company.com"
              autoComplete="email"
              style={{
                padding: '0.65rem 0.75rem',
                border: '1px solid #d0d0d5',
                borderRadius: 10,
                outline: 'none',
              }}
            />
          </label>

          <label style={{ display: 'grid', gap: 6 }}>
            <span style={{ fontSize: 14, fontWeight: 600 }}>Password</span>
            <input
              type="password"
              value={password}
              onChange={(e) => setPassword(e.target.value)}
              required
              placeholder="••••••••"
              autoComplete="current-password"
              style={{
                padding: '0.65rem 0.75rem',
                border: '1px solid #d0d0d5',
                borderRadius: 10,
                outline: 'none',
              }}
            />
          </label>

          <button
            type="submit"
            disabled={loading}
            style={{
              marginTop: 6,
              padding: '0.75rem 0.9rem',
              borderRadius: 12,
              border: '1px solid #111',
              background: '#111',
              color: '#fff',
              fontWeight: 700,
              cursor: loading ? 'not-allowed' : 'pointer',
              opacity: loading ? 0.7 : 1,
            }}
          >
            {loading ? 'Signing in…' : 'Sign in'}
          </button>

          {errorMsg && (
            <div style={{ color: '#b00020', background: '#fde7ea', border: '1px solid #f7c5cc', padding: '0.55rem 0.7rem', borderRadius: 10 }}>
              {errorMsg}
            </div>
          )}
        </form>

        <div style={{ marginTop: '0.9rem' }}>
          <a href="/" style={{ color: '#444', textDecoration: 'underline', fontSize: 14 }}>
            Back to home
          </a>
        </div>

        <hr style={{ margin: '1.1rem 0', border: 0, height: 1, background: '#eee' }} />

        <section style={{ fontSize: 12, color: '#666', display: 'grid', gap: 6 }}>
          <p>
            If you cannot sign in, please contact your administrator to confirm your account is enabled.
          </p>
          <p>
            Session info (API key and tenant) is stored locally on this device and will remain until you sign out or clear your browser data.
          </p>
          <p>
            By continuing, you agree to keep your credentials confidential and follow your organization’s security policy.
          </p>
        </section>
      </div>
    </main>
  );
}
