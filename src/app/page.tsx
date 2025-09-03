"use client";

import Link from "next/link";

export default function Home() {
  const year = new Date().getFullYear();

  return (
    <main className="home">
      <header className="nav">
        <div className="brand">
          <span className="dot" aria-hidden />
          <span className="logo">GECORPID • VC</span>
        </div>
        <nav className="links">
          <Link href="/login" className="link">
            Client Login
          </Link>
          <Link href="/admin" className="link alt">
            Admin
          </Link>
        </nav>
      </header>

      <section className="hero">
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

      <section className="grid">
        <article className="card">
          <h3>Upload once, verify anywhere</h3>
          <p>
            Each upload gets a stable public verifier at <code>/v/&lt;id&gt;</code>{" "}
            showing original and QR-stamped PDFs.
          </p>
        </article>
        <article className="card">
          <h3>Tenants & credits built-in</h3>
          <p>
            Clients log in with email/password; uploads automatically decrement
            their credit balance.
          </p>
        </article>
        <article className="card">
          <h3>Standards-friendly</h3>
          <p>
            DID document served at <code>/.well-known/did.json</code>. Existing{" "}
            <code>/api/issue</code> and <code>/api/verify</code> are preserved.
          </p>
        </article>
      </section>

      <footer className="footer">
        <p>
          © {year} GECORPID • VC — DID:web available at{" "}
          <code>/.well-known/did.json</code>
        </p>
      </footer>

      <style jsx>{`
        :root {
          --bg: #0b0e14;
          --bg-soft: rgba(255, 255, 255, 0.06);
          --card: rgba(255, 255, 255, 0.08);
          --text: #e7eef7;
          --muted: #b8c4d6;
          --accent: #4f8cff;
          --accent-strong: #2e6dff;
          --ring: rgba(79, 140, 255, 0.5);
          --shadow: 0 10px 30px rgba(0, 0, 0, 0.25);
          --radius: 14px;
          --radius-lg: 18px;
        }

        @media (prefers-color-scheme: light) {
          :root {
            --bg: #f7f9fc;
            --bg-soft: rgba(0, 0, 0, 0.04);
            --card: rgba(255, 255, 255, 0.9);
            --text: #0f172a;
            --muted: #475569;
            --accent: #3457d5;
            --accent-strong: #2747c7;
            --ring: rgba(52, 87, 213, 0.35);
            --shadow: 0 10px 24px rgba(2, 6, 23, 0.06);
          }
        }

        * {
          box-sizing: border-box;
        }

        .home {
          min-height: 100svh;
          padding: 24px;
          display: grid;
          grid-template-rows: auto 1fr auto;
          gap: 32px;
          color: var(--text);
          background:
            radial-gradient(1000px 600px at 20% -10%, rgba(79, 140, 255, 0.25), transparent 60%),
            radial-gradient(800px 500px at 90% 10%, rgba(79, 140, 255, 0.2), transparent 60%),
            var(--bg);
        }

        .nav {
          display: flex;
          align-items: center;
          justify-content: space-between;
          max-width: 1100px;
          margin: 0 auto;
          padding: 10px 14px;
          background: var(--bg-soft);
          border: 1px solid rgba(255, 255, 255, 0.08);
          border-radius: var(--radius);
          backdrop-filter: blur(8px);
          box-shadow: var(--shadow);
        }

        .brand {
          display: flex;
          align-items: center;
          gap: 10px;
          font-weight: 700;
          letter-spacing: 0.2px;
        }

        .dot {
          width: 10px;
          height: 10px;
          display: inline-block;
          border-radius: 999px;
          background: linear-gradient(135deg, var(--accent), var(--accent-strong));
          box-shadow: 0 0 0 6px var(--ring);
        }

        .logo {
          font-size: 15px;
          user-select: none;
        }

        .links {
          display: flex;
          gap: 10px;
        }

        .link {
          padding: 8px 12px;
          border-radius: 10px;
          text-decoration: none;
          color: var(--text);
          transition: transform 0.05s ease, background 0.2s ease;
          background: transparent;
          border: 1px solid transparent;
        }

        .link:hover {
          background: var(--bg-soft);
          transform: translateY(-1px);
        }

        .link.alt {
          border: 1px solid rgba(255, 255, 255, 0.12);
        }

        .hero {
          max-width: 950px;
          margin: 0 auto;
          text-align: center;
          padding: 48px 18px 10px;
        }

        .title {
          margin: 0 0 14px 0;
          font-size: clamp(28px, 6vw, 48px);
          line-height: 1.08;
          letter-spacing: -0.02em;
        }

        .subtitle {
          margin: 0 auto;
          max-width: 800px;
          color: var(--muted);
          font-size: clamp(14px, 2.2vw, 18px);
        }

        code {
          padding: 2px 6px;
          border-radius: 8px;
          background: var(--bg-soft);
          border: 1px dashed rgba(255, 255, 255, 0.12);
          font-family: ui-monospace, SFMono-Regular, Menlo, Monaco, Consolas,
            "Liberation Mono", "Courier New", monospace;
          font-size: 0.95em;
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
          min-width: 160px;
          height: 44px;
          padding: 0 18px;
          border-radius: 12px;
          text-decoration: none;
          font-weight: 600;
          border: 1px solid transparent;
          transition: transform 0.06s ease, box-shadow 0.2s ease,
            background 0.2s ease, border-color 0.2s ease;
          box-shadow: var(--shadow);
        }

        .btn.primary {
          background: linear-gradient(135deg, var(--accent), var(--accent-strong));
          color: white;
        }

        .btn.primary:hover {
          transform: translateY(-1px);
          box-shadow: 0 12px 32px var(--ring);
        }

        .btn.ghost {
          background: transparent;
          color: var(--text);
          border-color: rgba(255, 255, 255, 0.18);
        }

        .btn.ghost:hover {
          background: var(--bg-soft);
          transform: translateY(-1px);
        }

        .tiny {
          margin-top: 8px;
          color: var(--muted);
          font-size: 12.5px;
        }

        .grid {
          max-width: 1100px;
          margin: 10px auto 0;
          padding: 0 18px 32px;
          display: grid;
          grid-template-columns: repeat(3, minmax(0, 1fr));
          gap: 16px;
        }

        @media (max-width: 900px) {
          .grid {
            grid-template-columns: 1fr;
          }
        }

        .card {
          padding: 18px 18px 20px;
          background: var(--card);
          border: 1px solid rgba(255, 255, 255, 0.12);
          border-radius: var(--radius-lg);
          box-shadow: var(--shadow);
        }

        .card h3 {
          margin: 0 0 8px 0;
          font-size: 18px;
        }

        .card p {
          margin: 0;
          color: var(--muted);
          line-height: 1.5;
        }

        .footer {
          max-width: 1100px;
          margin: 0 auto;
          padding: 14px 18px 24px;
          text-align: center;
          color: var(--muted);
          font-size: 13px;
        }
      `}</style>
    </main>
  );
}
