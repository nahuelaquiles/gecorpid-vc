"use client";

import Link from "next/link";
import { useEffect, useState } from "react";

/**
 * Landing page — fuerza tema CLARO en <html> y <body>.
 * - Fondo gris muy claro (no blanco puro)
 * - Mayor contraste en "How it works"
 * - Look más profesional/tech
 */
export default function Home() {
  const year = new Date().getFullYear();
  const [logoOk, setLogoOk] = useState(true);
  const [heroLogoOk, setHeroLogoOk] = useState(true);

  // Activa tema claro a nivel global SOLO en esta página
  useEffect(() => {
    document.documentElement.classList.add("theme-light");
    document.body.classList.add("theme-light");
    return () => {
      document.documentElement.classList.remove("theme-light");
      document.body.classList.remove("theme-light");
    };
  }, []);

  return (
    <main className="wrap">
      {/* HERO */}
      <section className="heroSection" aria-labelledby="hero-title">
        {heroLogoOk && (
          <div className="heroLogoWrap">
            <img
              src="/gecorpid_logo.png"
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

        <h1 id="hero-title" className="title">GecorpID</h1>
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
        <h2 id="features-title" className="sectionTitle">What you can do</h2>
        <div className="grid">
          <article className="card featureCard">
            <div className="icon" aria-hidden>🧾</div>
            <h3>Issue verifiable PDFs</h3>
            <p>
              Upload a PDF and get a verification page at <code>/v/&lt;id&gt;</code>. The original file
              stays immutable.
            </p>
          </article>

          <article className="card featureCard">
            <div className="icon" aria-hidden>🔍</div>
            <h3>One-click verification</h3>
            <p>
              The QR-stamped copy points to the public page so anyone can validate integrity and issuer authenticity.
            </p>
          </article>

          <article className="card featureCard">
            <div className="icon" aria-hidden>⏱️</div>
            <h3>Clear issuance history</h3>
            <p>
              The client portal shows “Issued at” timestamps and keeps the most recent items on top.
            </p>
          </article>

          <article className="card featureCard">
            <div className="icon" aria-hidden>🏷️</div>
            <h3>Tenants &amp; credits</h3>
            <p>
              Multi-tenant, credit-based flow. Start processing when you’re ready—no silent background actions.
            </p>
          </article>
        </div>
      </section>

      {/* HOW IT WORKS */}
      <section className="how" aria-labelledby="how-title">
        <h2 id="how-title" className="sectionTitle">How it works</h2>
        <ol className="steps">
          <li className="step">
            <span className="num">1</span>
            <div>
              <h4>Upload</h4>
              <p>Send your PDF. The system stores the original and creates a QR-stamped copy.</p>
            </div>
          </li>
          <li className="step">
            <span className="num">2</span>
            <div>
              <h4>Issue</h4>
              <p>
                The issuer signs the credential; a public page at <code>/v/&lt;id&gt;</code> is available immediately.
              </p>
            </div>
          </li>
          <li className="step">
            <span className="num">3</span>
            <div>
              <h4>Verify</h4>
              <p>Anyone can confirm integrity and issuer authenticity—no need to trust a private database.</p>
            </div>
          </li>
        </ol>
      </section>

      {/* WHY VCs */}
      <section className="why" aria-labelledby="why-title">
        <h2 id="why-title" className="sectionTitle">Why Verifiable Credentials?</h2>
        <ul className="bullets">
          <li><span className="check">✓</span> Cryptographic signatures prove origin and integrity.</li>
          <li><span className="check">✓</span> Self-verifiable: no central database dependency.</li>
          <li><span className="check">✓</span> Tamper-evident: any change breaks verification.</li>
          <li><span className="check">✓</span> Works even if the original server is offline.</li>
        </ul>
      </section>

      {/* BRAND */}
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

      {/* FOOTER */}
      <footer className="footer">
        © {year} GecorpID —{" "}
        <a href="/.well-known/did.json" target="_blank" rel="noopener noreferrer">
          View issuer DID document
        </a>
      </footer>

      {/* Styles locales del landing */}
      <style jsx>{`
        * { box-sizing: border-box; }
        html, body, .wrap { min-height: 100%; }

        /* ---------- HERO ---------- */
        .heroSection {
          max-width: 1160px;
          margin: 0 auto;
          text-align: center;
          background: transparent;
          padding: 28px 20px 16px;
        }
        .heroLogoWrap { display: flex; justify-content: center; margin-bottom: 10px; }
        .heroLogo { display: block; width: clamp(108px, 18vw, 160px); height: auto; object-fit: contain; }

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
          display: flex; gap: 12px; justify-content: center; flex-wrap: wrap;
        }
        .btnPrimary {
          background: linear-gradient(180deg, #3b82f6, var(--accent));
          color: #fff;
          border: 1px solid rgba(30, 64, 255, 0.35);
          box-shadow: 0 8px 28px rgba(30, 64, 255, 0.24);
        }
        .btnPrimary:hover { filter: brightness(1.04); }
        .btnSecondary {
          background: #fff; color: var(--accent);
          border: 1px solid rgba(30, 64, 255, 0.35);
          box-shadow: 0 8px 24px rgba(2, 6, 23, 0.06);
        }
        .btnSecondary:hover { background: rgba(30, 64, 255, 0.06); }

        /* ---------- FEATURES ---------- */
        .features { max-width: 1160px; margin: 0 auto; }
        .sectionTitle { font-size: 22px; margin: 0 6px 14px; letter-spacing: 0.2px; }
        .grid { display: grid; grid-template-columns: repeat(12, 1fr); gap: 14px; }
        .featureCard { grid-column: span 12; transition: transform 0.12s ease, border-color 0.2s ease; }
        .featureCard:hover { transform: translateY(-2px); }
        .icon {
          font-size: 20px; width: 32px; height: 32px;
          display: inline-flex; align-items: center; justify-content: center;
          border-radius: 10px; background: #eef2ff; color: var(--accent);
          margin-bottom: 6px;
        }
        .card h3 { margin: 4px 0 6px; font-size: 18px; color: var(--text); }
        .card p { margin: 0; color: var(--muted); font-size: 15px; }
        @media (min-width: 740px) { .featureCard { grid-column: span 6; } }
        @media (min-width: 1024px) { .featureCard { grid-column: span 3; } }

        /* ---------- HOW IT WORKS (alto contraste) ---------- */
        .how {
          max-width: 1160px;
          margin: 0 auto;
          background: var(--card);
          border: 1px solid #e5e7eb;
          border-radius: 16px;
          box-shadow: 0 10px 30px rgba(16, 24, 40, 0.08);
          padding: 20px 16px 12px;
          color: var(--text);
        }
        .steps { list-style: none; margin: 12px 0 14px; padding: 0; display: grid; gap: 12px; }
        .step {
          display: grid; grid-template-columns: 36px 1fr; gap: 12px; align-items: start;
          background: #f9fafb; border: 1px solid #e5e7eb; border-radius: 12px; padding: 12px;
        }
        .num {
          display: inline-flex; align-items: center; justify-content: center;
          width: 36px; height: 36px; font-weight: 800; border-radius: 10px;
          background: #1e40ff; color: #fff; border: 0;
          box-shadow: 0 6px 18px rgba(30,64,255,0.25);
        }
        .step h4 { margin: 2px 0 6px; font-size: 16px; color: #0b0d12; }
        .step p  { margin: 0; font-size: 15px; color: #374151; }
        .step code { background: #eef2ff; color: #1e40ff; padding: 0 6px; border-radius: 6px; }

        /* ---------- WHY VCs ---------- */
        .why {
          max-width: 1160px;
          margin: 0 auto;
          background: var(--card);
          border: 1px solid #e5e7eb;
          border-radius: 16px;
          box-shadow: 0 10px 30px rgba(16, 24, 40, 0.08);
          padding: 18px 16px;
        }
        .bullets {
          list-style: none; margin: 8px 0 0; padding: 0; display: grid; gap: 8px; color: #374151;
        }
        .bullets li {
          display: grid; grid-template-columns: 24px 1fr; align-items: start; gap: 8px; font-size: 15px;
        }
        .check {
          display: inline-flex; align-items: center; justify-content: center;
          width: 24px; height: 24px; border-radius: 8px;
          background: #ecfdf5; color: #10b981; font-weight: 800; border: 1px solid #d1fae5;
        }

        /* ---------- BRAND ---------- */
        .brand { display: flex; flex-direction: column; align-items: center; gap: 6px; }
        .logoLink { display: inline-flex; align-items: center; }
        .logoImg { display: block; width: 40px; height: 40px; object-fit: cover; border-radius: 6px; box-shadow: 0 4px 16px rgba(0,0,0,0.08); }
        .logoFallback { font-weight: 800; letter-spacing: 0.2px; font-size: 18px; }
        .legend { font-size: 12px; color: var(--muted); }
        .brandBottom { max-width: 1160px; margin: 0 auto; }

        /* ---------- FOOTER ---------- */
        .footer {
          max-width: 1160px; margin: 0 auto; text-align: center;
          color: var(--muted); font-size: 13px; padding: 6px 16px 12px;
        }
        .footer a { color: var(--accent); text-decoration: underline; }
        .footer a:hover { opacity: 0.9; }
      `}</style>
    </main>
  );
}
