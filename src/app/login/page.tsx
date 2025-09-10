'use client';

import * as React from 'react';
import { useRouter, useSearchParams } from 'next/navigation';
import { createClient, SupabaseClient } from '@supabase/supabase-js';

type Mode = 'signin' | 'signup';

function getSupabaseClient(): SupabaseClient {
  const url = process.env.NEXT_PUBLIC_SUPABASE_URL;
  const anon = process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY;

  if (!url || !anon) {
    throw new Error(
      'Missing NEXT_PUBLIC_SUPABASE_URL or NEXT_PUBLIC_SUPABASE_ANON_KEY. ' +
      'Please set them in your environment variables.'
    );
  }
  return createClient(url, anon);
}

export default function LoginPage() {
  const router = useRouter();
  const search = useSearchParams();
  const [supabase] = React.useState(() => getSupabaseClient());

  const [mode, setMode] = React.useState<Mode>('signin');
  const [email, setEmail] = React.useState('');
  const [password, setPassword] = React.useState('');
  const [showPw, setShowPw] = React.useState(false);

  const [loading, setLoading] = React.useState(false);
  const [message, setMessage] = React.useState<string | null>(null);
  const [error, setError] = React.useState<string | null>(null);

  // Allow ?next=/some/path to override where we go after auth
  const next = React.useMemo(() => {
    const n = search?.get('next');
    // Simple guard to avoid open redirects; only allow internal paths.
    return n && n.startsWith('/') ? n : '/client';
  }, [search]);

  async function handleSignIn() {
    setLoading(true);
    setError(null);
    setMessage(null);
    const { data, error } = await supabase.auth.signInWithPassword({
      email: email.trim(),
      password,
    });
    setLoading(false);

    if (error) {
      setError(error.message);
      return;
    }

    // If MFA/email confirmation is required, Supabase may return a message instead of a session.
    if (!data.session) {
      setMessage('Check your inbox to complete sign-in.');
      return;
    }

    router.push(next);
  }

  async function handleSignUp() {
    setLoading(true);
    setError(null);
    setMessage(null);
    const redirectTo =
      typeof window !== 'undefined'
        ? `${window.location.origin}${next}`
        : undefined;

    const { data, error } = await supabase.auth.signUp({
      email: email.trim(),
      password,
      options: {
        // If your project requires email confirmation, this helps the user land back in-app.
        emailRedirectTo: redirectTo,
      },
    });
    setLoading(false);

    if (error) {
      setError(error.message);
      return;
    }

    // If your Supabase project requires email confirmation:
    if (data.user && !data.session) {
      setMessage('Account created. Please check your email to confirm your address.');
      return;
    }

    // Otherwise, if session is immediately available:
    router.push(next);
  }

  async function onSubmit(e: React.FormEvent) {
    e.preventDefault();
    if (loading) return;
    if (mode === 'signin') {
      await handleSignIn();
    } else {
      await handleSignUp();
    }
  }

  return (
    <main className="min-h-screen w-full bg-gray-50 flex items-center justify-center p-4">
      <div className="w-full max-w-md bg-white rounded-2xl shadow-lg p-8">
        <header className="mb-6">
          <h1 className="text-2xl font-semibold tracking-tight">Client Access</h1>
          <p className="text-sm text-gray-500 mt-1">
            Sign in with your organization-provided credentials to access your dashboard.
          </p>
        </header>

        <form onSubmit={onSubmit} className="space-y-4">
          <div>
            <label htmlFor="email" className="block text-sm font-medium mb-1">
              Email
            </label>
            <input
              id="email"
              type="email"
              autoComplete="email"
              required
              value={email}
              onChange={(e) => setEmail(e.target.value)}
              className="w-full rounded-lg border border-gray-300 px-3 py-2 focus:outline-none focus:ring-2 focus:ring-gray-800"
              placeholder="you@company.com"
            />
          </div>

          <div>
            <label htmlFor="password" className="block text-sm font-medium mb-1">
              Password
            </label>
            <div className="relative">
              <input
                id="password"
                type={showPw ? 'text' : 'password'}
                autoComplete={mode === 'signin' ? 'current-password' : 'new-password'}
                required
                value={password}
                onChange={(e) => setPassword(e.target.value)}
                className="w-full rounded-lg border border-gray-300 px-3 py-2 pr-24 focus:outline-none focus:ring-2 focus:ring-gray-800"
                placeholder={mode === 'signin' ? 'Your password' : 'Create a strong password'}
              />
              <button
                type="button"
                onClick={() => setShowPw((v) => !v)}
                className="absolute right-2 top-1/2 -translate-y-1/2 text-sm text-gray-600 hover:text-gray-900"
                aria-label={showPw ? 'Hide password' : 'Show password'}
              >
                {showPw ? 'Hide' : 'Show'}
              </button>
            </div>
          </div>

          {error && (
            <div className="rounded-lg border border-red-200 bg-red-50 px-3 py-2 text-sm text-red-700">
              {error}
            </div>
          )}
          {message && (
            <div className="rounded-lg border border-blue-200 bg-blue-50 px-3 py-2 text-sm text-blue-800">
              {message}
            </div>
          )}

          <button
            type="submit"
            disabled={loading}
            className="w-full rounded-xl px-4 py-2.5 bg-black text-white font-medium hover:opacity-90 disabled:opacity-60"
          >
            {loading ? (mode === 'signin' ? 'Signing in…' : 'Creating account…') : (mode === 'signin' ? 'Sign in' : 'Create account')}
          </button>
        </form>

        <div className="mt-4 text-sm text-gray-600">
          {mode === 'signin' ? (
            <p>
              Don&apos;t have an account?{' '}
              <button
                className="underline underline-offset-4 hover:text-gray-900"
                onClick={() => {
                  setMode('signup');
                  setError(null);
                  setMessage(null);
                }}
              >
                Create one
              </button>
              .
            </p>
          ) : (
            <p>
              Already have an account?{' '}
              <button
                className="underline underline-offset-4 hover:text-gray-900"
                onClick={() => {
                  setMode('signin');
                  setError(null);
                  setMessage(null);
                }}
              >
                Sign in
              </button>
              .
            </p>
          )}
        </div>

        <hr className="my-6" />

        <section className="space-y-2 text-xs text-gray-500">
          <p>
            Authentication is securely handled by Supabase. Your session is stored locally on
            this device and will persist until you sign out or clear your browser data.
          </p>
          <p>
            If you were invited by a genetics service provider and cannot sign in,
            please contact their support or your administrator to confirm your email is registered.
          </p>
          <p>
            By continuing, you agree not to share credentials and to comply with your organization’s security policy.
          </p>
        </section>
      </div>
    </main>
  );
}
