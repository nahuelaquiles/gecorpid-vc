"use client";

import Link from "next/link";
import { useState } from "react";

/**
 * Landing (dark gradient + glassmorphism) con copy actualizado:
 * - Local-first (no uploads)
 * - Hash/QR en el navegador
 * - Registro guarda solo hash + firma (DID)
 * - Verificación compara localmente
 * - Diagrama de flujo privacy-first
 */
export default function Home() {
  const year = new Date().getFullYear();
  const [logoOk, setLogoOk] = useState(true);
  const [heroLogoOk, setHeroLogoOk] = useState(true);

  return (
    <div className="relative min-h-screen overflow-hidden bg-slate-950 text-slate-100">
      {/* Fondo degradado igual que el cliente */}
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
        <div className="mx-auto mb-3 flex max-w-2xl justify-center">
          <span className="inline-flex items-center gap-2 rounded-full border border-emerald-400/40 bg-emerald-500/10 px-4 py-1.5 text-[11px] font-semibold uppercase tracking-[0.28em] text-emerald-200">
            Local processing — No uploads
          </span>
        </div>
        <h1 className="text-4xl font-semibold tracking-tight text-white md:text-5xl">GecorpID</h1>
        <p className="mx-auto mt-2 max-w-xl text-base text-slate-300/90">
          Local-first verifiable PDFs. Your files never leave your device.
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
              <h3 className="text-base font-semibold text-white">Seal locally (no uploads)</h3>
              <p className="mt-1 text-sm text-slate-300/90">
                Drop a PDF and we add a discreet QR badge. Hashing (SHA-256) and sealing happen in your browser—nothing is sent to our servers.
              </p>
            </article>

            <article className="rounded-2xl border border-white/10 bg-white/5 p-5 shadow-2xl shadow-black/30 backdrop-blur">
              <div className="mb-2 inline-flex h-8 w-8 items-center justify-center rounded-xl border border-white/15 bg-white/10 text-indigo-300">
                🔏
              </div>
              <h3 className="text-base font-semibold text-white">Register the credential</h3>
              <p className="mt-1 text-sm text-slate-300/90">
                We register only the file hash, issuance ID and issuer <span className="font-semibold">DID</span>. No document copies are stored.
              </p>
            </article>

            <article className="rounded-2xl border border-white/10 bg-white/5 p-5 shadow-2xl shadow-black/30 backdrop-blur">
              <div className="mb-2 inline-flex h-8 w-8 items-center justify-center rounded-xl border border-white/15 bg-white/10 text-fuchsia-300">
                🔍
              </div>
              <h3 className="text-base font-semibold text-white">Verify anywhere</h3>
              <p className="mt-1 text-sm text-slate-300/90">
                Scan the QR or open <code className="font-mono">/v/&lt;id&gt;</code>. The verifier recomputes the hash <em>locally</em> and compares it to the registry.
              </p>
            </article>

            <article className="rounded-2xl border border-white/10 bg-white/5 p-5 shadow-2xl shadow-black/30 backdrop-blur">
              <div className="mb-2 inline-flex h-8 w-8 items-center justify-center rounded-xl border border-white/15 bg-white/10 text-amber-300">
                🏷️
              </div>
              <h3 className="text-base font-semibold text-white">Tenants &amp; credits</h3>
              <p className="mt-1 text-sm text-slate-300/90">
                Multi-tenant, credit-based flow. Issue when you’re ready—no background uploads, ever.
              </p>
            </article>
          </div>
        </section>

        {/* HOW IT WORKS — actualizado (local-first) */}
        <section className="mt-8 grid gap-6 rounded-3xl border border-white/10 bg-white/5 p-8 shadow-2xl shadow-black/40 backdrop-blur">
          <h2 className="text-lg font-semibold text-white">How it works</h2>
          <ol className="grid gap-3">
            <li className="flex items-start gap-3">
              <span className="mt-0.5 inline-flex h-7 w-7 items-center justify-center rounded-full bg-sky-500 text-xs font-semibold text-white">1</span>
              <div>
                <h4 className="text-sm font-semibold text-white">Seal on your device</h4>
                <p className="text-sm text-slate-300/90">
                  You open the PDF locally. We add a QR badge and compute the SHA-256 in the browser. <strong>No upload takes place.</strong>
                </p>
              </div>
            </li>
            <li className="flex items-start gap-3">
              <span className="mt-0.5 inline-flex h-7 w-7 items-center justify-center rounded-full bg-sky-500 text-xs font-semibold text-white">2</span>
              <div>
                <h4 className="text-sm font-semibold text-white">Register hash + signature</h4>
                <p className="text-sm text-slate-300/90">
                  We register only the hash, issuance ID and issuer DID/signature. The original file never leaves your device.
                </p>
              </div>
            </li>
            <li className="flex items-start gap-3">
              <span className="mt-0.5 inline-flex h-7 w-7 items-center justify-center rounded-full bg-sky-500 text-xs font-semibold text-white">3</span>
              <div>
                <h4 className="text-sm font-semibold text-white">Verify with the sealed copy</h4>
                <p className="text-sm text-slate-300/90">
                  Recipients scan the QR or open the public page and (optionally) load the sealed PDF. The check runs locally and matches the registry entry.
                </p>
              </div>
            </li>
          </ol>
        </section>

        {/* DIAGRAMA DE FLUJO — Privacy-first */}
        <section className="mt-8">
          <h2 className="mb-3 text-lg font-semibold text-white">Privacy-first flow</h2>
          <div className="flex flex-col items-stretch gap-3 sm:flex-row sm:items-center">
            {/* Issuer */}
            <article className="flex-1 rounded-2xl border border-white/10 bg-white/5 p-5 shadow-2xl shadow-black/30 backdrop-blur">
              <h3 className="text-sm font-semibold text-white">Issuer (your device)</h3>
              <ul className="mt-2 space-y-1.5 text-sm text-slate-300/90">
                <li>• Open/drag PDF locally</li>
                <li>• Seal + QR badge</li>
                <li>• Compute SHA-256 in browser</li>
              </ul>
            </article>

            {/* Arrow */}
            <div className="hidden items-center justify-center sm:flex">
              <svg viewBox="0 0 48 16" className="h-6 w-16 text-slate-300/70" aria-hidden>
                <path d="M0 8h42M42 8l-4-4M42 8l-4 4" stroke="currentColor" strokeWidth="1.5" fill="none" strokeLinecap="round" />
              </svg>
            </div>

            {/* Registry */}
            <article className="flex-1 rounded-2xl border border-white/10 bg-white/5 p-5 shadow-2xl shadow-black/30 backdrop-blur">
              <h3 className="text-sm font-semibold text-white">Credential registry</h3>
              <ul className="mt-2 space-y-1.5 text-sm text-slate-300/90">
                <li>• <span className="font-semibold">ID / CID</span></li>
                <li>• <span className="font-semibold">SHA-256 hash</span></li>
                <li>• <span className="font-semibold">Issuer DID + signature</span></li>
                <li>• Status (active / revoked)</li>
              </ul>
            </article>

            {/* Arrow */}
            <div className="hidden items-center justify-center sm:flex">
              <svg viewBox="0 0 48 16" className="h-6 w-16 text-slate-300/70" aria-hidden>
                <path d="M0 8h42M42 8l-4-4M42 8l-4 4" stroke="currentColor" strokeWidth="1.5" fill="none" strokeLinecap="round" />
              </svg>
            </div>

            {/* Verifier */}
            <article className="flex-1 rounded-2xl border border-white/10 bg-white/5 p-5 shadow-2xl shadow-black/30 backdrop-blur">
              <h3 className="text-sm font-semibold text-white">Verifier (recipient device)</h3>
              <ul className="mt-2 space-y-1.5 text-sm text-slate-300/90">
                <li>• Scan QR / open <code className="font-mono">/v/&lt;id&gt;</code></li>
                <li>• Recompute hash locally</li>
                <li>• Compare to registry → authenticity</li>
              </ul>
            </article>
          </div>
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
