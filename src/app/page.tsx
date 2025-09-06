// src/app/page.tsx
"use client";

import Link from "next/link";

export default function Home() {
  const year = new Date().getFullYear();

  return (
    <main className="home">
      {/* NAV */}
      <header className="nav">
        <div className="brand">
          <span className="dot" aria-hidden />
          <span className="logo">GECORPID • VC</span>
        </div>
        <nav className="links">
          <Link href="/login" className="link" aria-label="Go to Client Login">
            Client Login
          </Link>
          <Link href="/admin" className="link alt" aria-label="Go to Admin">
            Admin
          </Link>
        </nav>
      </header>

      {/* HERO */}
      <section className="hero">
        <span className="pill">DID:web • QR-stamped copy • Audit trail</span>
        <h1 className="title">Verifiable PDFs, made simple</h1>
        <p className="subtitle">
          Upload a PDF → we embed a QR pointing to a public verification page{" "}
          <code>/v/&lt;id&gt;</code>. Original and processed files are stored,
          and credits are tracked per tenant.
        </p>

        <div className="cta">
          <Link href="/login" className="btn primary" aria-label="Go to Client Login">
            Client Login
          </Link>
          <Link href="/admin" className="btn ghost" aria-label="Go to Admin">
            Admin
          </Link>
        </div>

        <p className="tiny">
          Legacy demo routes remain available: <code>/issue</code> and{" "}
          <code>/verify</code>.
        </p>
      </section>

      {/* FEATURES GRID */}
      <section className="grid">
        <article className="card">
          <div className="icon">🔒</div>
          <h3>Upload once, verify anywhere</h3>
          <p>
            Each upload gets a stable public verifier at <code>/v/&lt;id&gt;</code>{" "}
            showing original and QR-stamped PDFs.
          </p>
        </article>

        <article className="card">
          <div className="icon">🏷️</div>
          <h3>Tenants & credits built-in</h3>
          <p>
            Multi-tenant flow with credit tracking. Simple “Start” processing and a clear
            issuance history with timestamps.
          </p>
        </article>

        <article className="card">
          <div className="icon">🧾</div>
          <h3>Privacy-focused & auditable</h3>
          <p>
            Original file stays immutable. The QR is embedded only in a copy to
            facilitate verification—no silent overwrites.
          </p>
        </article>

        <article className="card">
          <div className="icon">🧩</div>
          <h3>Open APIs</h3>
          <p>
            Minimal endpoints for issuing and verifying. Existing integrations with{" "}
            <code>/api/issue</code> and <code>/api/verify</code> are preserved.
          </p>
        </article>
      </section>

      {/* HOW IT WORKS */}
      <section className="section">
        <h2 className="sectionTitle">How it works</h2>
        <div className="steps">
          <div className="step">
            <span className="num">1</span>
            <div>
              <h4>Upload</h4>
              <p>
                Send your PDF. We store the original and generate a QR-stamped copy for
                easy verification.
              </p>
            </div>
          </div>
          <div className="step">
            <span className="num">2</span>
            <div>
              <h4>Issue</h4>
              <p>
                The issuer signs the credential. A public page at{" "}
                <code>/v/&lt;id&gt;</code> is created with links to both files.
              </p>
            </div>
          </div>
          <div className="step">
            <span className="num">3</span>
            <div>
              <h4>Verify</h4>
              <p>
                Anyone can check integrity and issuer authenticity—no need to trust a
                private database.
              </p>
            </div>
          </div>
        </div>
      </section>

      {/* WHY VCs */}
      <section className="section muted">
        <h2 className="sectionTitle">Why Verifiable Credentials?</h2>
        <ul className="bullets">
          <li>Cryptographic signatures prove origin and integrity.</li>
          <li>Self-verifiable: no central database dependency.</li>
          <li>Tamper-evident: any change breaks verification.</li>
          <li>Works even if the original server is offline.</li>
        </ul>
      </section>

      {/* FOOTER */}
      <footer className="footer">
        <p>
          © {year} GECORPID • VC — DID:web available at <code>/.well-known/did.json</code>
        </p>
      </footer>

      <style jsx>{`
        :root {
          /* Palette */
          --bg: #0b0e14;
          --bg-soft: rgba(255, 255, 255, 0.04);
          --panel: #0f1420;
          --text: #eef3ff;
          --muted: #a6b1c2;
          --brand: #6ea8ff;
          --brand-strong: #4f8cff;
          --accent: #68fbd2;

          /* Effects */
          --radius: 16px;
          --radius-sm: 12px;
          --shadow: 0 8px 30px rgba(0, 0, 0, 0.35),
            inset 0 0 0 1px rgba(255, 255, 255, 0.04);
          --shadow-soft: 0 6px 24px rgba(0, 0, 0, 0.25);
        }

        * {
          box-sizing: border-box;
        }

        .home {
          min-height: 100svh;
          padding: 28px 24px 24px;
          display: grid;
          grid-template-rows: auto auto auto 1fr auto;
          gap: 28px;
          color: var(--text);
          background:
            radial-gradient(1100px 650px at 15% -15%, rgba(79, 140, 255, 0.28), transparent 60%),
            radial-gradient(900px 520px at 95% 0%, rgba(104, 251, 210, 0.16), transparent 65%),
            radial-gradient(1200px 900px at 50% 110%, rgba(79, 140, 255, 0.10), transparent 60%),
            var(--bg);
        }

        /* NAV */
        .nav {
          display: flex;
          align-items: center;
          justify-content: space-between;
          max-width: 1160px;
          margin: 0 auto;
          padding: 12px 16px;
          background: linear-gradient(180deg, rgba(255, 255, 255, 0.05), rgba(255, 255, 255, 0.03));
          border: 1px solid rgba(255, 255, 255, 0.08);
          border-radius: var(--radius);
          backdrop-filter: blur(8px);
          box-shadow: var(--shadow);
        }
        .brand {
          display: flex;
          align-items: center;
          gap: 10px;
          font-weight: 800;
          letter-spacing: 0.3px;
        }
        .dot {
          width: 12px;
          height: 12px;
          border-radius: 50%;
          background: linear-gradient(180deg, var(--brand), var(--brand-strong));
          box-shadow: 0 0 18px var(--brand-strong);
        }
        .logo {
          font-size: 15px;
          color: var(--text);
          opacity: 0.95;
        }
        .links {
          display: flex;
          gap: 10px;
        }
        .link {
          text-decoration: none;
          color: var(--text);
          padding: 8px 12px;
          border-radius: 10px;
          border: 1px solid transparent;
          transition: border-color 0.2s ease, background 0.2s ease, transform 0.06s ease;
        }
        .link:hover {
          border-color: rgba(255, 255, 255, 0.14);
          background: rgba(255, 255, 255, 0.04);
          transform: translateY(-1px);
        }
        .link.alt {
          color: var(--brand);
          border-color: rgba(110, 168, 255, 0.3);
          background: rgba(110, 168, 255, 0.08);
        }
        .link.alt:hover {
          background: rgba(110, 168, 255, 0.12);
        }

        /* HERO */
        .hero {
          max-width: 980px;
          margin: 0 auto;
          text-align: center;
          padding: 24px 16px 8px;
        }
        .pill {
          display: inline-flex;
          gap: 8px;
          align-items: center;
          padding: 6px 12px;
          font-size: 12px;
          color: var(--brand);
          border: 1px solid rgba(110, 168, 255, 0.35);
          border-radius: 999px;
          background: rgba(110, 168, 255, 0.08);
          box-shadow: var(--shadow-soft);
        }
        .title {
          font-size: clamp(28px, 4.5vw, 48px);
          line-height: 1.12;
          letter-spacing: -0.02em;
          margin: 12px 0 8px;
          text-shadow: 0 6px 36px rgba(79, 140, 255, 0.28);
        }
        .subtitle {
          margin: 0 auto;
          max-width: 740px;
          color: var(--muted);
          font-size: clamp(14px, 1.9vw, 17px);
        }
        code {
          padding: 2px 6px;
          border-radius: 8px;
          background: rgba(255, 255, 255, 0.06);
          border: 1px dashed rgba(255, 255, 255, 0.14);
          font-family: ui-monospace, SFMono-Regular, Menlo, Monaco, Consolas,
            "Liberation Mono", "Courier New", monospace;
        }

        .cta {
          display: flex;
          justify-content: center;
          gap: 12px;
          margin: 26px 0 8px;
          flex-wrap: wrap;
        }
        .btn {
          display: inline-flex;
          align-items: center;
          justify-content: center;
          min-width: 164px;
          height: 46px;
          padding: 0 18px;
          border-radius: 14px;
          text-decoration: none;
          font-weight: 700;
          border: 1px solid transparent;
          transition: transform 0.06s ease, box-shadow 0.2s ease,
            background 0.2s ease, border-color 0.2s ease;
          box-shadow: var(--shadow);
        }
        .btn:active {
          transform: translateY(1px);
        }
        .btn.primary {
          color: #0b0e14;
          background: linear-gradient(180deg, var(--accent), #4deac3);
          border-color: rgba(104, 251, 210, 0.5);
        }
        .btn.primary:hover {
          filter: brightness(1.05);
        }
        .btn.ghost {
          color: var(--brand);
          background: rgba(110, 168, 255, 0.08);
          border-color: rgba(110, 168, 255, 0.35);
        }
        .btn.ghost:hover {
          background: rgba(110, 168, 255, 0.12);
        }
        .tiny {
          margin-top: 10px;
          color: var(--muted);
          font-size: 13px;
        }

        /* GRID */
        .grid {
          max-width: 1160px;
          margin: 2px auto 0;
          padding: 8px 6px;
          display: grid;
          grid-template-columns: repeat(12, 1fr);
          gap: 14px;
        }
        .card {
          grid-column: span 12;
          background: linear-gradient(180deg, rgba(255, 255, 255, 0.06), rgba(255, 255, 255, 0.03));
          border: 1px solid rgba(255, 255, 255, 0.08);
          border-radius: var(--radius);
          padding: 18px 16px 16px;
          box-shadow: var(--shadow);
          transition: transform 0.16s ease, border-color 0.2s ease, background 0.2s ease;
        }
        .card:hover {
          transform: translateY(-2px);
          border-color: rgba(104, 251, 210, 0.28);
          background: linear-gradient(180deg, rgba(255, 255, 255, 0.07), rgba(255, 255, 255, 0.035));
        }
        .icon {
          font-size: 20px;
          opacity: 0.95;
          margin-bottom: 6px;
          display: inline-flex;
          width: 28px;
          height: 28px;
          align-items: center;
          justify-content: center;
          border-radius: 8px;
          background: rgba(110, 168, 255, 0.12);
          border: 1px solid rgba(110, 168, 255, 0.22);
        }
        .card h3 {
          margin: 6px 0 6px;
          font-size: 18px;
          letter-spacing: 0.1px;
        }
        .card p {
          margin: 0;
          color: var(--muted);
          font-size: 14.5px;
        }

        @media (min-width: 720px) {
          .card {
            grid-column: span 6;
          }
        }
        @media (min-width: 1024px) {
          .card {
            grid-column: span 3;
          }
        }

        /* SECTIONS */
        .section {
          max-width: 1160px;
          margin: 8px auto 0;
          padding: 22px 12px 8px;
        }
        .section.muted {
          background: rgba(255, 255, 255, 0.035);
          border-top: 1px solid rgba(255, 255, 255, 0.06);
          border-bottom: 1px solid rgba(255, 255, 255, 0.06);
          border-radius: var(--radius);
        }
        .sectionTitle {
          margin: 0 6px 14px;
          font-size: 20px;
          letter-spacing: 0.2px;
          color: #e9eeff;
          text-shadow: 0 4px 24px rgba(79, 140, 255, 0.25);
        }

        .steps {
          display: grid;
          gap: 12px;
        }
        .step {
          display: grid;
          grid-template-columns: 34px 1fr;
          align-items: start;
          gap: 12px;
          padding: 12px 10px;
          border-radius: var(--radius-sm);
          background: rgba(255, 255, 255, 0.03);
          border: 1px solid rgba(255, 255, 255, 0.08);
        }
        .num {
          display: inline-flex;
          align-items: center;
          justify-content: center;
          width: 34px;
          height: 34px;
          font-weight: 800;
          border-radius: 10px;
          color: #0b0e14;
          background: linear-gradient(180deg, var(--accent), #4deac3);
          border: 1px solid rgba(104, 251, 210, 0.45);
          box-shadow: var(--shadow-soft);
        }
        .step h4 {
          margin: 2px 0 6px;
          font-size: 16px;
        }
        .step p {
          margin: 0;
          color: var(--muted);
          font-size: 14.5px;
        }

        .bullets {
          display: grid;
          gap: 8px;
          padding: 0 6px 18px;
          margin: 0;
          list-style: none;
        }
        .bullets li {
          position: relative;
          padding-left: 22px;
          color: var(--muted);
          font-size: 14.5px;
        }
        .bullets li::before {
          content: "•";
          position: absolute;
          left: 6px;
          top: 0;
          color: var(--accent);
          text-shadow: 0 0 14px rgba(104, 251, 210, 0.8);
        }

        /* FOOTER */
        .footer {
          max-width: 1160px;
          margin: 0 auto;
          padding: 16px 18px 26px;
          text-align: center;
          color: var(--muted);
          font-size: 13px;
        }
      `}</style>
    </main>
  );
}
