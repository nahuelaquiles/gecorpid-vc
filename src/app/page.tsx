// src/app/page.tsx
"use client";

import Link from "next/link";

export default function Home() {
  const year = new Date().getFullYear();

  return (
    <main className="wrap">
      {/* NAV */}
      <header className="nav">
        <div className="brand" aria-label="GECORPID VC">
          <span className="logoDot" aria-hidden />
          <span className="logoText">GECORPID • VC</span>
        </div>
        <nav className="navActions" aria-label="Primary">
          <Link href="/login" className="btn btnPrimary" aria-label="Go to Client Login">
            Client Login
          </Link>
          <Link href="/admin" className="btn btnSecondary" aria-label="Go to Admin">
            Admin
          </Link>
        </nav>
      </header>

      {/* HERO */}
      <section className="hero" aria-labelledby="hero-title">
        <h1 id="hero-title" className="title">
          Verifiable PDFs, made simple
        </h1>
        <p className="subtitle">
          Issue trusted documents with cryptographic signatures and a public verification page.
          Preserve the original PDF and provide a QR-stamped copy for frictionless checks.
        </p>
        <div className="cta">
          <Link href="/login" className="btn btnPrimary btnLg" aria-label="Start issuing credentials">
            Get started
          </Link>
          <Link href="/v/demo" className="btn btnTertiary btnLg" aria-label="See a verification example">
            See verification example
          </Link>
        </div>
      </section>

      {/* FEATURES */}
      <section className="features" aria-labelledby="features-title">
        <h2 id="features-title" className="sectionTitle">What you can do</h2>
        <div className="grid">
          <article className="card">
            <div className="icon" aria-hidden>🧾</div>
            <h3>Issue verifiable PDFs</h3>
            <p>
              Upload a PDF and get a verification page at <code>/v/&lt;id&gt;</code>. The original file stays immutable.
            </p>
          </article>
          <article className="card">
            <div className="icon" aria-hidden>🔍</div>
            <h3>One-click verification</h3>
            <p>
              The QR-stamped copy points to the public page so anyone can validate integrity and issuer authenticity.
            </p>
          </article>
          <article className="card">
            <div className="icon" aria-hidden>⏱️</div>
            <h3>Clear issuance history</h3>
            <p>
              A client portal shows “Issued at” timestamps and keeps the most recent items on top.
            </p>
          </article>
          <article className="card">
            <div className="icon" aria-hidden>🏷️</div>
            <h3>Tenants & credits</h3>
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
              <p>The issuer signs the credential; a public page at <code>/v/&lt;id&gt;</code> is available immediately.</p>
            </div>
          </li>
          <li className="step">
            <span className="badge">3</span>
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
          <li><span className="check" aria-hidden>✓</span> Cryptographic signatures prove origin and integrity.</li>
          <li><span className="check" aria-hidden>✓</span> Self-verifiable: no central database dependency.</li>
          <li><span className="check" aria-hidden>✓</span> Tamper-evident: any change breaks verification.</li>
          <li><span className="check" aria-hidden>✓</span> Works even if the original server is offline.</li>
        </ul>
      </section>

      {/* FOOTER */}
      <footer className="footer">
        <p>
          © {year} GECORPID • VC — <a href="/.well-known/did.json">View issuer DID document</a>
        </p>
      </footer>

      {/* STYLES */}
      <style jsx>{`
        :root {
          /* Light, high-contrast palette */
          --bg: #f7fafc;
          --ink: #0a0a0a;
          --muted: #4a5568;
          --panel: #ffffff;
          --border: #e5e7eb;
          --brand: #1e62ff; /* primary blue */
          --brand-600: #1a56e6;
          --brand-700: #164acc;
          --accent: #10b981; /* green accent */
          --accent-700: #059669;
          --shadow: 0 8px 30px rgba(0, 0, 0, 0.07);
          --radius: 16px;
          --radius-sm: 12px;
        }

        * { box-sizing: border-box; }
        html, body, .wrap { min-height: 100%; }

        .wrap {
          background:
            radial-gradient(1200px 600px at 0% -10%, rgba(30, 98, 255, 0.10), transparent 55%),
            radial-gradient(1000px 520px at 100% 0%, rgba(16, 185, 129, 0.10), transparent 60%),
            var(--bg);
          color: var(--ink);
          padding: 24px 20px 40px;
          display: grid;
          gap: 28px;
        }

        /* NAV */
        .nav {
          display: flex;
          align-items: center;
          justify-content: space-between;
          max-width: 1140px;
          margin: 0 auto;
          padding: 14px 16px;
          background: var(--panel);
          border: 1px solid var(--border);
          border-radius: var(--radius);
          box-shadow: var(--shadow);
        }

        .brand { display: flex; align-items: center; gap: 10px; }
        .logoDot {
          width: 12px; height: 12px; border-radius: 50%;
          background: linear-gradient(180deg, var(--brand), var(--brand-600));
          box-shadow: 0 0 0 4px rgba(30, 98, 255, 0.15);
        }
        .logoText { font-weight: 800; letter-spacing: .2px; }

        .navActions { display: flex; gap: 10px; flex-wrap: wrap; }

        .btn {
          appearance: none;
          display: inline-flex;
          align-items: center;
          justify-content: center;
          gap: 8px;
          height: 42px;
          padding: 0 16px;
          border-radius: 12px;
          text-decoration: none;
          font-weight: 700;
          letter-spacing: .2px;
          transition: transform .06s ease, box-shadow .2s ease, background .2s ease, border-color .2s ease, color .2s ease;
          border: 1px solid transparent;
          user-select: none;
        }
        .btn:active { transform: translateY(1px); }

        .btnPrimary {
          background: var(--brand);
          color: #fff;
          border-color: var(--brand-600);
          box-shadow: 0 6px 24px rgba(30, 98, 255, 0.25);
        }
        .btnPrimary:hover { background: var(--brand-600); }

        .btnSecondary {
          background: #fff;
          color: var(--brand);
          border-color: rgba(30, 98, 255, 0.35);
        }
        .btnSecondary:hover {
          background: rgba(30, 98, 255, 0.06);
          border-color: var(--brand-600);
        }

        .btnTertiary {
          background: #fff;
          color: var(--accent);
          border-color: rgba(16, 185, 129, 0.35);
        }
        .btnTertiary:hover {
          background: rgba(16, 185, 129, 0.06);
          border-color: var(--accent-700);
        }

        .btnLg { height: 48px; padding: 0 20px; border-radius: 14px; }

        /* HERO */
        .hero {
          max-width: 1140px;
          margin: 0 auto;
          text-align: center;
          background: var(--panel);
          border: 1px solid var(--border);
          border-radius: var(--radius);
          box-shadow: var(--shadow);
          padding: 40px 20px 28px;
        }
        .title {
          font-size: clamp(28px, 4.8vw, 56px);
          line-height: 1.08;
          letter-spacing: -0.02em;
          margin: 0 0 12px;
        }
        .subtitle {
          margin: 0 auto;
          max-width: 820px;
          color: var(--muted);
          font-size: clamp(15px, 2vw, 18px);
        }
        .cta { display: flex; gap: 12px; justify-content: center; margin-top: 22px; flex-wrap: wrap; }

        /* FEATURES */
        .features {
          max-width: 1140px;
          margin: 0 auto;
          padding: 4px;
        }
        .sectionTitle {
          font-size: 22px;
          margin: 0 6px 12px;
          letter-spacing: .2px;
        }
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
          transition: transform .12s ease, border-color .2s ease;
        }
        .card:hover { transform: translateY(-2px); border-color: #cdd6e0; }
        .icon {
          font-size: 20px; width: 32px; height: 32px;
          display: inline-flex; align-items: center; justify-content: center;
          border-radius: 10px; background: #f3f6ff; color: var(--brand);
          margin-bottom: 6px;
        }
        .card h3 { margin: 4px 0 6px; font-size: 18px; }
        .card p { margin: 0; color: var(--muted); font-size: 15px; }
        @media (min-width: 740px) { .card { grid-column: span 6; } }
        @media (min-width: 1024px) { .card { grid-column: span 3; } }

        /* HOW IT WORKS */
        .how {
          max-width: 1140px; margin: 0 auto;
          background: #0b1220; /* dark block for contrast */
          color: #fff;
          border-radius: var(--radius);
          border: 1px solid #111827;
          box-shadow: var(--shadow);
          padding: 18px 16px 8px;
        }
        .how .sectionTitle { color: #fff; }
        .steps {
          list-style: none; margin: 10px 0 14px; padding: 0;
          display: grid; gap: 10px;
        }
        .step {
          display: grid; grid-template-columns: 34px 1fr; gap: 12px;
          align-items: start;
          background: rgba(255, 255, 255, 0.06);
          border: 1px solid rgba(255, 255, 255, 0.12);
          border-radius: 12px;
          padding: 12px;
        }
        .badge {
          display: inline-flex; align-items: center; justify-content: center;
          width: 34px; height: 34px; font-weight: 800; border-radius: 10px;
          background: #1e62ff; color: #fff; border: 1px solid rgba(255,255,255,.2);
        }
        .step h4 { margin: 2px 0 6px; font-size: 16px; color: #fff; }
        .step p { margin: 0; color: #e5e7eb; font-size: 14.5px; }

        /* WHY VCs */
        .why {
          max-width: 1140px; margin: 0 auto;
          background: var(--panel);
          border: 1px solid var(--border);
          border-radius: var(--radius);
          box-shadow: var(--shadow);
          padding: 18px 16px;
        }
        .bullets {
          list-style: none; margin: 8px 0 0; padding: 0;
          display: grid; gap: 8px;
        }
        .bullets li {
          display: grid; grid-template-columns: 24px 1fr; align-items: start; gap: 8px;
          color: var(--muted);
          font-size: 15px;
        }
        .check {
          display: inline-flex; align-items: center; justify-content: center;
          width: 24px; height: 24px; border-radius: 8px;
          background: #ecfdf5; color: var(--accent); font-weight: 800;
          border: 1px solid #d1fae5;
        }

        /* FOOTER */
        .footer {
          max-width: 1140px; margin: 0 auto; text-align: center;
          color: var(--muted); font-size: 13px; padding: 8px 16px 12px;
        }
        .footer a { color: var(--brand); text-decoration: underline; }
        .footer a:hover { color: var(--brand-700); }
      `}</style>
    </main>
  );
}
