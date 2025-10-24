"use client";

import Link from "next/link";
import { useState } from "react";

/**
 * Landing (dark gradient + glassmorphism) a juego con el área de cliente.
 * - Fondo: bg-slate-950 + capas radiales (como cliente)
 * - Tarjetas: border white/10 + bg white/5 + blur/shadow
 * - Tipografía clara con buen contraste
 */
export default function Home() {
  const year = new Date().getFullYear();
  const [logoOk, setLogoOk] = useState(true);
  const [heroLogoOk, setHeroLogoOk] = useState(true);

  return (
    <div className="relative min-h-screen overflow-hidden bg-slate-950 text-slate-100">
      {/* Degradado radial idéntico al cliente */}
      <div
        className="pointer-events-none absolute inset-0 bg-[radial-gradient(130%_140%_at_15%_10%,rgba(56,189,248,0.16),transparent_55%),radial-gradient(120%_120%_at_85%_-10%,rgba(165,180,252,0.14),transparent_60%),linear-gradient(180deg,#020617,rgba(2,6,23,0.92))]"
        aria-hidden
      />

      {/* HERO */}
      <header className="relative mx-auto max-w-6xl px-6 pt-20 pb-10 text-center">
        {heroLogoOk && (
          <img
            src="/gecorpid_logo.png"
            alt="GecorpID"
            className="mx-auto mb-4 h-28 w-auto"
            loading="eager"
            decoding="async"
            onError={() => setHeroLogoOk(false)}
          />
        )}
        <h1 className="text-4xl font-semibold tracking-tight text-white md:text-5xl">GecorpID</h1>
        <p className="mx-auto mt-2 max-w-xl text-base text-slate-300/90">
          Verifiable PDFs, made simple.
        </p>

        <div className="mt-6 flex flex-wrap justify-center gap-3">
          <Link
            href="/login"
            className="inline-flex items-center gap-2 rounded-full border border-white/15 bg-white/10 px-5 py-2.5 text-sm font-semibold text-slate-100 transition hover:border-white/25 hover:bg-white/20"
            aria-label="Go to Client Login"
          >
            Client Login
          </Link>
          <Link
            href="/admin"
            className="inline-flex items-center gap-2 rounded-full border border-sky-300/30 bg-sky-600/90 px-5 py-2.5 text-sm font-semibold text-white transition hover:bg-sky-500"
            aria-label="Go to Admin area"
          >
            Admin
          </Link>
        </div>
      </header>

      {/* CONTENIDO */}
      <main className="relative mx-auto max-w-6xl px-6 pb-20">
        {/* WHAT YOU CAN DO */}
        <section aria-labelledby="features-title">
          <h2 id="features-title" className="mb-3 text-lg font-semibold text-white">
            What you can do
          </h2>
          <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-4">
            <article className="rounded-2xl border border-white/10 bg-white/5 p-5 shadow-2xl shadow-black/30 backdrop-blur">
              <div className="mb-2 inline-flex h-8 w-8 items-center justify-center rounded-xl border border-white/15 bg-white/10 text-sky-300">
                🧾
              </div>
              <h3 className="text-base font-semibold text-white">Issue verifiable PDFs</h3>
              <p className="mt-1 text-sm text-slate-300/90">
                Upload a PDF and get a verification page at <code className="font-mono">/v/&lt;id&gt;</code>.
                The original file stays immutable.
              </p>
            </article>

            <article className="rounded-2xl border border-white/10 bg-white/5 p-5 shadow-2xl shadow-black/30 backdrop-blur">
              <div className="mb-2 inline-flex h-8 w-8 items-center justify-center rounded-xl border border-white/15 bg-white/10 text-indigo-300">
                🔍
              </div>
              <h3 className="text-base font-semibold text-white">One-click verification</h3>
              <p className="mt-1 text-sm text-slate-300/90">
                The QR-stamped copy points to the public page so anyone can validate integrity and issuer authenticity.
              </p>
            </article>

            <article className="rounded-2xl border border-white/10 bg-white/5 p-5 shadow-2xl shadow-black/30 backdrop-blur">
              <div className="mb-2 inline-flex h-8 w-8 items-center justify-center rounded-xl border border-white/15 bg-white/10 text-fuchsia-300">
                ⏱️
              </div>
              <h3 className="text-base font-semibold text-white">Clear issuance history</h3>
              <p className="mt-1 text-sm text-slate-300/90">
                The client portal shows “Issued at” timestamps and keeps the most recent items on top.
              </p>
            </article>

            <article className="rounded-2xl border border-white/10 bg-white/5 p-5 shadow-2xl shadow-black/30 backdrop-blur">
              <div className="mb-2 inline-flex h-8 w-8 items-center justify-center rounded-xl border border-white/15 bg-white/10 text-amber-300">
                🏷️
              </div>
              <h3 className="text-base font-semibold text-white">Tenants &amp; credits</h3>
              <p className="mt-1 text-sm text-slate-300/90">
                Multi-tenant, credit-based flow. Start processing when you’re ready—no silent background actions.
              </p>
            </article>
          </div>
        </section>

        {/* HOW IT WORKS (alto contraste en oscuro) */}
        <section className="mt-8 grid gap-6 rounded-3xl border border-white/10 bg-white/5 p-8 shadow-2xl shadow-black/40 backdrop-blur">
          <h2 className="text-lg font-semibold text-white">How it works</h2>
          <ol className="grid gap-3">
            <li className="flex items-start gap-3">
              <span className="mt-0.5 inline-flex h-7 w-7 items-center justify-center rounded-full bg-sky-500 text-xs font-semibold text-white">
                1
              </span>
              <div>
                <h4 className="text-sm font-semibold text-white">Upload</h4>
                <p className="text-sm text-slate-300/90">
                  Send your PDF. The system stores the original and creates a QR-stamped copy.
                </p>
              </div>
            </li>
            <li className="flex items-start gap-3">
              <span className="mt-0.5 inline-flex h-7 w-7 items-center justify-center rounded-full bg-sky-500 text-xs font-semibold text-white">
                2
              </span>
              <div>
                <h4 className="text-sm font-semibold text-white">Issue</h4>
                <p className="text-sm text-slate-300/90">
                  The issuer signs the credential; a public page at <code className="font-mono">/v/&lt;id&gt;</code> is available immediately.
                </p>
              </div>
            </li>
            <li className="flex items-start gap-3">
              <span className="mt-0.5 inline-flex h-7 w-7 items-center justify-center rounded-full bg-sky-500 text-xs font-semibold text-white">
                3
              </span>
              <div>
                <h4 className="text-sm font-semibold text-white">Verify</h4>
                <p className="text-sm text-slate-300/90">
                  Anyone can confirm integrity and issuer authenticity—no need to trust a private database.
                </p>
              </div>
            </li>
          </ol>
        </section>

        {/* WHY VCs */}
        <section className="mt-8 rounded-3xl border border-white/10 bg-white/5 p-8 shadow-2xl shadow-black/40 backdrop-blur">
          <h2 className="text-lg font-semibold text-white">Why Verifiable Credentials?</h2>
          <ul className="mt-3 grid gap-2 text-slate-300/90">
            <li className="flex items-start gap-2">
              <span className="inline-flex h-5 w-5 items-center justify-center rounded-md border border-emerald-400/40 bg-emerald-500/10 text-[13px] font-bold text-emerald-300">
                ✓
              </span>
              Cryptographic signatures prove origin and integrity.
            </li>
            <li className="flex items-start gap-2">
              <span className="inline-flex h-5 w-5 items-center justify-center rounded-md border border-emerald-400/40 bg-emerald-500/10 text-[13px] font-bold text-emerald-300">
                ✓
              </span>
              Self-verifiable: no central database dependency.
            </li>
            <li className="flex items-start gap-2">
              <span className="inline-flex h-5 w-5 items-center justify-center rounded-md border border-emerald-400/40 bg-emerald-500/10 text-[13px] font-bold text-emerald-300">
                ✓
              </span>
              Tamper-evident: any change breaks verification.
            </li>
            <li className="flex items-start gap-2">
              <span className="inline-flex h-5 w-5 items-center justify-center rounded-md border border-emerald-400/40 bg-emerald-500/10 text-[13px] font-bold text-emerald-300">
                ✓
              </span>
              Works even if the original server is offline.
            </li>
          </ul>
        </section>

        {/* BRAND / FOOTER */}
        <div className="mt-12 flex flex-col items-center gap-2">
          <a
            href="https://www.gecorp.com.ar"
            target="_blank"
            rel="noopener noreferrer"
            aria-label="Open GECORP website"
            className="inline-flex items-center"
          >
            {logoOk ? (
              <img
                src="/Gecorp-Logo.iso.jpg"
                alt="GECORP"
                width={40}
                height={40}
                className="h-10 w-10 rounded-md shadow-lg shadow-black/30"
                loading="eager"
                decoding="async"
                onError={() => setLogoOk(false)}
              />
            ) : (
              <span className="text-sm font-bold tracking-wide">GECORP</span>
            )}
          </a>
          <span className="text-xs text-slate-400">developed by gecorp</span>
        </div>

        <footer className="mt-6 text-center text-xs text-slate-400">
          © {year} GecorpID —{" "}
          <a
            href="/.well-known/did.json"
            target="_blank"
            rel="noopener noreferrer"
            className="underline decoration-slate-500 hover:text-slate-300"
          >
            View issuer DID document
          </a>
        </footer>
      </main>
    </div>
  );
}
