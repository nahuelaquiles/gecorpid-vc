// src/app/v/[id]/page.tsx
import { headers } from "next/headers";
import Link from "next/link";

export const dynamic = "force-dynamic";

type VerifyResponse = {
  id: string;
  createdAt: string | null;
  issuerName?: string | null;
  issuerId?: string | null;
  originalUrl?: string | null;
  processedUrl?: string | null;
  // you may have other fields; we only read what we need
};

function buildOrigin(): string {
  if (process.env.NEXT_PUBLIC_SITE_URL) {
    return process.env.NEXT_PUBLIC_SITE_URL.replace(/\/$/, "");
  }
  const h = headers();
  const host = h.get("x-forwarded-host") || h.get("host") || "localhost:3000";
  const proto = h.get("x-forwarded-proto") || "https";
  return `${proto}://${host}`;
}

function fmtDateTime(iso: string | null): string {
  if (!iso) return "—";
  try {
    return new Date(iso).toLocaleString();
  } catch {
    return iso;
  }
}

export default async function VerifyPage({
  params,
}: {
  params: { id: string };
}) {
  const { id } = params;
  const origin = buildOrigin();

  const res = await fetch(`${origin}/api/verify-file?id=${encodeURIComponent(id)}`, {
    cache: "no-store",
    // @ts-ignore - next option for explicit non-revalidation
    next: { revalidate: 0 },
  });

  if (!res.ok) {
    const text = await res.text();
    return (
      <main className="wrap">
        <article className="card">
          <h1 className="title">Verification</h1>
          <p className="muted">We could not verify this file.</p>
          <pre className="errorBox">{text || `HTTP ${res.status}`}</pre>
          <div className="actions">
            <Link href="/" className="btn">Back to home</Link>
          </div>

          {/* VC explanation */}
          <section className="vc-explain">
            <h4>What is a Verifiable Credential (VC)?</h4>
            <p>
              A VC is a digitally signed document. Anyone can verify <strong>who</strong> issued it and that its
              <strong> contents were not altered</strong>.
            </p>
            <ul>
              <li><strong>Authenticity:</strong> validated with the issuer’s public key.</li>
              <li><strong>Integrity:</strong> any change to the file breaks verification.</li>
              <li><strong>Portability:</strong> can be verified without relying on a central database.</li>
            </ul>
            <p className="mt6">
              A regular QR only redirects to a website or database; if servers change, go down, or files are replaced,
              results may vary. A VC uses <strong>cryptographic proof</strong> to validate the document itself—consistent,
              auditable, and tamper-resistant.
            </p>
          </section>
        </article>
        <style jsx>{styles}</style>
      </main>
    );
  }

  const data = (await res.json()) as VerifyResponse;

  const issuerLabel =
    (data.issuerName && data.issuerName.trim()) ||
    (data.issuerId && `Tenant ${data.issuerId}`) ||
    "Unknown issuer";

  return (
    <main className="wrap">
      <article className="card">
        <h1 className="title">Verification</h1>

        <div className="grid">
          <div className="info">
            <dl className="meta">
              <div>
                <dt>Verification ID</dt>
                <dd className="mono">{data.id}</dd>
              </div>
              <div>
                <dt>Issuer</dt>
                <dd>{issuerLabel}</dd>
              </div>
              <div>
                <dt>Issued at</dt>
                <dd className="mono">{fmtDateTime(data.createdAt)}</dd>
              </div>
            </dl>
            <div className="hint">If this information matches what you expect from the issuer, the credential is valid.</div>
          </div>

          <div className="links">
            <div className="btns">
              {data.originalUrl ? (
                <a className="btn ghost" href={data.originalUrl} target="_blank" rel="noreferrer">
                  View original PDF
                </a>
              ) : (
                <button className="btn ghost" disabled title="Not available">
                  View original PDF
                </button>
              )}
              {data.processedUrl ? (
                <a className="btn primary" href={data.processedUrl} target="_blank" rel="noreferrer">
                  View signed PDF
                </a>
              ) : (
                <button className="btn primary" disabled title="Not available">
                  View signed PDF
                </button>
              )}
            </div>
          </div>
        </div>

        <div className="actions">
          <Link href="/" className="btn">Back to home</Link>
        </div>

        {/* === VC short explanation (in English) === */}
        <section className="vc-explain">
          <h4>What is a Verifiable Credential (VC)?</h4>
          <p>
            A Verifiable Credential is a cryptographically signed digital document issued by an organization.
            The signature lets anyone verify <strong>who</strong> issued it and that the <strong>contents have not been modified</strong>.
          </p>
          <ul>
            <li><strong>Authenticity:</strong> verified with the issuer’s public key.</li>
            <li><strong>Integrity:</strong> if someone alters the file, verification fails.</li>
            <li><strong>Portability:</strong> verification does not depend on a single database or server.</li>
          </ul>
          <p className="mt6">
            A simple QR usually just opens a URL to look up a record in a database; if that server changes, goes down,
            or the record is replaced, results can be inconsistent. A VC adds <strong>cryptographic proof</strong>, so the
            document can be validated in a consistent, auditable, and tamper-resistant way.
          </p>
        </section>
      </article>

      <style jsx>{styles}</style>
    </main>
  );
}

const styles = `
:root{
  --bg:#0b0e14; --panel: rgba(255,255,255,0.06); --card: rgba(255,255,255,0.08);
  --text:#e7eef7; --muted:#b8c4d6; --accent:#4f8cff; --accent-2:#2e6dff;
  --ring:rgba(79,140,255,.45); --danger:#e5484d; --shadow:0 10px 30px rgba(0,0,0,.25);
  --radius:14px;
}
@media (prefers-color-scheme: light){
  :root{
    --bg:#f7f9fc; --panel: rgba(0,0,0,0.04); --card:#fff; --text:#0f172a; --muted:#475569;
    --accent:#3457d5; --accent-2:#2747c7; --ring:rgba(52,87,213,.35); --danger:#d11a2a;
    --shadow:0 10px 24px rgba(2,6,23,.06);
  }
}
*{box-sizing:border-box}
body{background:var(--bg); color:var(--text)}
.wrap{min-height:100svh; padding:28px; display:flex; justify-content:center}
.card{width:min(980px, 100%); background:var(--card); border:1px solid rgba(255,255,255,.12); border-radius:16px; box-shadow:var(--shadow); padding:22px}
.title{margin:0 0 14px 0; font-size:26px}
.grid{display:grid; grid-template-columns:1.2fr .8fr; gap:18px}
@media (max-width: 900px){ .grid{grid-template-columns:1fr} }
.meta{display:grid; gap:12px; margin:10px 0 6px 0}
.meta dt{font-size:12px; color:var(--muted)}
.meta dd{margin:2px 0 0 0; font-size:15px}
.mono{font-family: ui-monospace, SFMono-Regular, Menlo, Monaco, Consolas, "Liberation Mono", "Courier New", monospace;}
.hint{margin-top:8px; font-size:13px; color:var(--muted)}
.btns{display:flex; gap:10px; flex-wrap:wrap; align-items:center}
.btn{display:inline-flex;align-items:center;justify-content:center;height:36px;padding:0 14px;border-radius:10px;border:1px solid transparent; box-shadow:var(--shadow); font-size:14px; text-decoration:none}
.btn.primary{background:linear-gradient(135deg,var(--accent),var(--accent-2)); color:#fff}
.btn.ghost{background:transparent; border-color:rgba(255,255,255,.24); color:inherit}
.btn[disabled]{opacity:.6; cursor:not-allowed}
.actions{margin-top:16px}
.errorBox{white-space:pre-wrap; background:rgba(255,0,0,.06); border:1px solid rgba(255,0,0,.18); padding:10px; border-radius:8px; font-size:12px}
.vc-explain{
  margin-top:16px; padding:12px 14px;
  border:1px solid rgba(0,0,0,.12); border-radius:10px; background:rgba(0,0,0,.035);
  font-size:14px; line-height:1.45;
}
.vc-explain h4{ margin: 0 0 6px; font-size: 16px; }
.vc-explain ul{ margin: 6px 0 0 18px; }
.mt6{ margin-top: 6px; }
`;
