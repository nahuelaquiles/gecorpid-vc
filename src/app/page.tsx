"use client";

import Link from "next/link";
import { useState } from "react";

/**
 * Landing page for GecorpID.
 * Hero SIN placa/fondo para que el logo (con transparencia) se funda con el fondo #f6f7fb.
 * Se removieron los estilos que agregaban “recuadro” (border-radius/shadow) al logo.
 */
export default function Home() {
  const year = new Date().getFullYear();

  // Bottom brand (GECORP) fallback
  const [logoOk, setLogoOk] = useState(true);
  // Hero GecorpID logo fallback
  const [heroLogoOk, setHeroLogoOk] = useState(true);

  return (
    <main className="wrap">
      {/* HERO sin placa */}
      <section className="hero" aria-labelledby="hero-title">
        {/* Logo centrado (PNG transparente recomendado) */}
        {heroLogoOk && (
          <div className="heroLogoWrap">
            <img
              src="/gecorpid_logo.png" // usa tu PNG transparente aquí
              alt="GecorpID"
              width={160}
              height={160}
              className="heroLogo"
              loading="eager"
              decoding="async"
              onError={() => setHeroLogoOk(false)}
            />
          </div>
        )}

        <h1 id="hero-title" className="title">
          GecorpID
        </h1>
        <p className="subtitle">Verifiable PDFs, made simple.</p>
        <div className="cta">
          <Link href="/login" className="btn btnPrimary" aria-label="Go to Client Login">
            Client Login
          </Link>
          <Link href="/admin" className="btn btnSecondary" aria-label="Go to Admin area">
            Admin
          </Link>
        </div>
      </section>

      {/* FEATURES */}
      <section className="features" aria-labelledby="features-title">
        <h2 id="features-title" className="sectionTitle">
          What you can do
        </h2>
        <div className="grid">
          <article className="card">
            <div className="icon" aria-hidden>
              🧾
            </div>
            <h3>Issue verifiable PDFs</h3>
            <p>
              Upload a PDF and get a verification page at <code>/v/&lt;id&gt;</code>. The original file
              stays immutable.
            </p>
          </article>
          <article className="card">
            <div className="icon" aria-hidden>
              🔍
            </div>
            <h3>One-click verification</h3>
            <p>
              The QR-stamped copy points to the public page so anyone can validate integrity and
              issuer authenticity.
            </p>
          </article>
          <article className="card">
            <div className="icon" aria-hidden>
              ⏱️
            </div>
            <h3>Clear issuance history</h3>
            <p>
              The client portal shows “Issued at” timestamps and keeps the most recent items on
              top.
            </p>
          </article>
          <article className="card">
            <div className="icon" aria-hidden>
              🏷️
            </div>
            <h3>Tenants &amp; credits</h3>
            <p>
              Multi-tenant, credit-based flow. Start processing when you’re ready—no silent
              background actions.
            </p>
          </article>
        </div>
      </section>

      {/* HOW IT WORKS */}
      <section className="how" aria-labelledby="how-title">
        <h2 id="how-title" className="sectionTitle contrast">
          How it works
        </h2>
        <ol className="steps">
          <li className="step">
            <span className="badge">1</span>
            <div>
              <h4>Upload</h4>
              <p>Send your PDF. The system stores the original and creates a QR-stamped copy.</p>
            </div>
          </li>
          <li className="step">
            <span className="badge">2</span>
            <div>
              <h4>Issue</h4>
              <p>
                The issuer signs the credential; a public page at <code>/v/&lt;id&gt;</code> is available
                immediately.
              </p>
            </div>
          </li>
          <li className="step">
            <span className="badge">3</span>
            <div>
              <h4>Verify</h4>
              <p>
                Anyone can confirm integrity and issuer authenticity—no need to trust a private
                database.
              </p>
            </div>
          </li>
        </ol>
      </section>

      {/* WHY VCs */}
      <section className="why" aria-labelledby="why-title">
        <h2 id="why-title" className="sectionTitle">
          Why Verifiable Credentials?
        </h2>
        <ul className="bullets">
          <li>
            <span className="check">✓</span>
            Cryptographic signatures prove origin and integrity.
          </li>
          <li>
            <span className="check">✓</span>
            Self-verifiable: no central database dependency.
          </li>
          <li>
            <span className="check">✓</span>
            Tamper-evident: any change breaks verification.
          </li>
          <li>
            <span className="check">✓</span>
            Works even if the original server is offline.
          </li>
        </ul>
      </section>

      {/* Brand block at the bottom: logo centered above the legend. Only the logo is a link. */}
      <div className="brand brandBottom">
        <a
          href="https://www.gecorp.com.ar"
          target="_blank"
          rel="noopener noreferrer"
          aria-label="Open GECORP website"
          className="logoLink"
        >
          {logoOk ? (
            <img
              src="/Gecorp-Logo.iso.jpg"
              alt="GECORP"
              width={40}
              height={40}
              className="logoImg"
              loading="eager"
              decoding="async"
              onError={() => setLogoOk(false)}
            />
          ) : (
            <span className="logoFallback">GECORP</span>
          )}
        </a>
        <span className="legend">developed by gecorp</span>
      </div>

      {/* FOOTER with DID link */}
      <footer className="footer">
        © {year} GecorpID —{" "}
        <a href="/.well-known/did.json" target="_blank" rel="noopener noreferrer">
          View issuer DID document
        </a>
      </footer>

      {/* Inline styles */}
      <style jsx>{`
        :root {
          --bg: #f6f7fb;    /* fondo página */
          --ink: #0b0d12;
          --muted: #4b5563;

          --panel: #ffffff; /* placas/cajas */
          --border: #e5e7eb;

          --brand: #1e40ff;
          --brand-600: #1a36d8;

          --radius: 16px;
          --shadow: 0 10px 30px rgba(16, 24, 40, 0.08);
        }

        * { box-sizing: border-box; }

        html, body, .wrap { min-height: 100%; }

        body {
          margin: 0;
          background: var(--bg);
          color: var(--ink);
        }

        .wrap {
          padding: 18px 20px 40px;
          display: grid;
          gap: 24px;
          background:
            radial-gradient(1400px 700px at 0% -10%, rgba(14, 165, 233, 0.1), transparent 60%),
            radial-gradient(1200px 620px at 100% 0%, rgba(30, 64, 255, 0.1), transparent 60%),
            var(--bg);
        }

        /* HERO sin placa: fondo transparente */
        .hero {
          max-width: 1160px;
          margin: 0 auto;
          text-align: center;
          background: transparent; /* <- clave */
          border: 0;               /* <- clave */
          box-shadow: none;        /* <- clave */
          padding: 28px 20px 16px;
        }

        .heroLogoWrap {
          display: flex;
          justify-content: center;
          margin-bottom: 10px;
        }

        /* Imagen del logo sin estilos que generen “recuadro” */
        .heroLogo {
          display: block;
          width: clamp(108px, 18vw, 160px);
          height: auto;
          object-fit: contain;
          background: transparent; /* asegurar transparencia */
          border-radius: 0;        /* <- quitar borde redondeado */
          box-shadow: none;        /* <- quitar sombra */
        }

        .title {
          font-size: clamp(34px, 6vw, 64px);
          line-height: 1.06;
          letter-spacing: -0.02em;
          margin: 0 0 6px;
        }
        .subtitle {
          margin: 0 auto 18px;
          max-width: 700px;
          color: var(--muted);
          font-size: clamp(14px, 1.8vw, 18px);
        }
        .cta {
          display: flex;
          gap: 12px;
          justify-content: center;
          flex-wrap: wrap;
        }
        .btn {
          appearance: none;
          display: inline-flex;
          align-items: center;
          justify-content: center;
          gap: 8px;
          height: 48px;
          padding: 0 22px;
          border-radius: 14px;
          text-decoration: none;
          font-weight: 800;
          letter-spacing: 0.2px;
          transition: transform 0.06s ease, background 0.2s ease, border-color 0.2s ease, color 0.2s ease, box-shadow 0.2s ease;
          border: 1px solid transparent;
          user-select: none;
        }
        .btn:active { transform: translateY(1px); }
        .btn:focus-visible { outline: none; box-shadow: 0 0 0 3px #fff, 0 0 0 5px var(--brand); }
        .btnPrimary {
          background: linear-gradient(180deg, #3b82f6, var(--brand));
          color: #fff;
          border-color: var(--brand-600);
          box-shadow: 0 8px 28px rgba(30, 64, 255, 0.28);
        }
        .btnPrimary:hover { filter: brightness(1.04); }
        .btnSecondary {
          background: #fff;
          color: var(--brand);
          border-color: rgba(30, 64, 255, 0.35);
          box-shadow: 0 8px 24px rgba(2, 6, 23, 0.06);
        }
        .btnSecondary:hover { background: rgba(30, 64, 255, 0.06); border-color: var(--brand-600); }

        /* FEATURES */
        .features { max-width: 1160px; margin: 0 auto; }
        .sectionTitle { font-size: 22px; margin: 0 6px 14px; letter-spacing: 0.2px; }
        .grid {
          display: grid;
          grid-template-columns: repeat(12, 1fr);
          gap: 14px;
        }
        .card {
          grid-column: span 12;
          background: var(--panel);
          border: 1px solid var(--border);
          border-radius: var(--radius);
          padding: 18px 16px;
          box-shadow: var(--shadow);
          transition: transform 0.12s ease, border-color 0.2s ease;
        }
        .card:hover { transform: translateY(-2px); border-color: #d6dbe6; }
        .icon {
          font-size: 20px;
          width: 32px;
          height: 32px;
          display: inline-flex;
          align-items: center;
          justify-content: center;
          border-radius: 10px;
          background: #eef2ff;
          color: var(--brand);
          margin-bottom: 6px;
        }
        .card h3 { margin: 4px 0 6px; font-size: 18px; }
        .card p { margin: 0; color: var(--muted); font-size: 15px; }
        @media (min-width: 740px) { .card { grid-column: span 6; } }
        @media (min-width: 1024px) { .card { grid-column: span 3; } }

        /* HOW IT WORKS */
        .how {
          max-width: 1160px;
          margin: 0 auto;
          background: var(--panel);
          border: 1px solid var(--border);
          border-radius: var(--radius);
          box-shadow: var(--shadow);
          padding: 20px 16px 10px;
          color: var(--ink);
        }
        .contrast { color: var(--ink); }
        .steps {
          list-style: none;
          margin: 10px 0 14px;
          padding: 0;
          display: grid;
          gap: 10px;
        }
        .step {
          display: grid;
          grid-template-columns: 34px 1fr;
          gap: 12px;
          align-items: start;
          background: #f9fafb;
          border: 1px solid var(--border);
          border-radius: 12px;
          padding: 12px;
        }
        .badge {
          display: inline-flex;
          align-items: center;
          justify-content: center;
          width: 34px;
          height: 34px;
          font-weight: 800;
          border-radius: 10px;
          background: var(--brand);
          color: #fff;
          border: none;
        }
        .step h4 { margin: 2px 0 6px; font-size: 16px; color: var(--ink); }
        .step p { margin: 0; color: var(--muted); font-size: 14.5px; }

        /* WHY VCs */
        .why {
          max-width: 1160px;
          margin: 0 auto;
          background: var(--panel);
          border: 1px solid var(--border);
          border-radius: var(--radius);
          box-shadow: var(--shadow);
          padding: 18px 16px;
        }
        .bullets {
          list-style: none;
          margin: 8px 0 0;
          padding: 0;
          display: grid;
          gap: 8px;
        }
        .bullets li {
          display: grid;
          grid-template-columns: 24px 1fr;
          align-items: start;
          gap: 8px;
          color: var(--muted);
          font-size: 15px;
        }
        .check {
          display: inline-flex;
          align-items: center;
          justify-content: center;
          width: 24px;
          height: 24px;
          border-radius: 8px;
          background: #ecfdf5;
          color: #10b981;
          font-weight: 800;
          border: 1px solid #d1fae5;
        }

        /* BOTTOM BRAND */
        .brand { display: flex; flex-direction: column; align-items: center; gap: 6px; }
        .logoLink { display: inline-flex; align-items: center; }
        .logoImg {
          display: block; width: 40px; height: 40px; object-fit: cover;
          border-radius: 6px; box-shadow: 0 4px 16px rgba(0,0,0,0.08);
        }
        .logoFallback { font-weight: 800; letter-spacing: 0.2px; font-size: 18px; }
        .legend { font-size: 12px; color: var(--muted); }
        .brandBottom { max-width: 1160px; margin: 0 auto; }

        /* FOOTER */
        .footer {
          max-width: 1160px; margin: 0 auto; text-align: center;
          color: var(--muted); font-size: 13px; padding: 6px 16px 12px;
        }
        .footer a { color: #1e40ff; text-decoration: underline; }
        .footer a:hover { color: #162fb3; }
      `}</style>
    </main>
  );
}
