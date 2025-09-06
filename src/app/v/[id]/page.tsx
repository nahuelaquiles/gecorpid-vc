// src/app/v/[id]/page.tsx
'use client';

import { useEffect, useState } from 'react';
import { useParams, useSearchParams } from 'next/navigation';

/**
 * Shape of the data returned by `/api/verify-file`.
 */
type VerifyData = {
  id: string;
  tenantId: string | null;
  tenantName: string | null;
  originalUrl: string | null;
  processedUrl: string | null;
  createdAt: string | null;
};

export default function VerifyPage() {
  const { id } = useParams<{ id: string }>();
  const search = useSearchParams();

  const [data, setData] = useState<VerifyData | null>(null);
  const [errorMsg, setErrorMsg] = useState('');
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    let cancelled = false;
    (async () => {
      try {
        const res = await fetch(`/api/verify-file?id=${id}`, { cache: 'no-store' });
        const json = await res.json();
        if (!res.ok) throw new Error(json?.error || 'Verification failed');
        if (!cancelled) {
          setData(json as VerifyData);
          setLoading(false);
          // Optional automatic redirect: /v/{id}?auto=1
          if (search.get('auto') === '1' && json?.originalUrl) {
            window.location.replace(json.originalUrl as string);
          }
        }
      } catch (e: any) {
        if (!cancelled) {
          setErrorMsg(e?.message || 'Not found');
          setLoading(false);
        }
      }
    })();
    return () => {
      cancelled = true;
    };
  }, [id, search]);

  const created = data?.createdAt ? new Date(data.createdAt) : null;

  return (
    <main
      style={{
        display: 'flex',
        justifyContent: 'center',
        alignItems: 'flex-start',
        minHeight: '70vh',
        padding: '2rem',
        background: 'var(--bg, #0b0e14)',
        color: 'var(--text, #e7eef7)',
      }}
    >
      <div style={{ width: '100%', maxWidth: 720 }}>
        <h1 style={{ fontSize: '2rem', fontWeight: 600, marginBottom: '0.5rem' }}>
          Credential verification
        </h1>
        <p style={{ color: '#8893a2', marginBottom: '1rem' }}>
          ID: <code style={{ color: 'inherit' }}>{id}</code>
        </p>

        {loading && <p>Verifying…</p>}

        {!loading && errorMsg && (
          <div style={{ color: '#ff6b6b' }}>
            <p>Credential not found.</p>
            <small>{errorMsg}</small>
          </div>
        )}

        {!loading && !errorMsg && data && (
          <div
            style={{
              border: '1px solid rgba(255,255,255,.14)',
              borderRadius: 12,
              padding: '1.25rem',
              display: 'grid',
              gap: '1rem',
              background: 'rgba(255,255,255,.06)',
              boxShadow: '0 10px 24px rgba(2,6,23,.20)',
            }}
          >
            <p style={{ fontSize: '1.05rem', margin: 0, display: 'flex', alignItems: 'center' }}>
              ✅ <b style={{ marginLeft: 6 }}>Original credential verified</b>
            </p>

            <div style={{ display: 'grid', gap: '0.35rem', color: '#d7deea', fontSize: '0.95rem' }}>
              <div>
                <b>Issuer:</b>{' '}
                <span style={{ color: '#fff' }}>
                  {data.tenantName
                    ? data.tenantName
                    : data.tenantId
                    ? `Tenant ${data.tenantId}`
                    : '—'}
                </span>
              </div>
              <div>
                <b>Issued at:</b>{' '}
                <span style={{ color: '#fff' }}>
                  {created
                    ? created.toLocaleString('en-US', {
                        year: 'numeric',
                        month: '2-digit',
                        day: '2-digit',
                        hour: '2-digit',
                        minute: '2-digit',
                      })
                    : data?.createdAt
                    ? new Date(data.createdAt).toLocaleString('en-US', {
                        year: 'numeric',
                        month: '2-digit',
                        day: '2-digit',
                        hour: '2-digit',
                        minute: '2-digit',
                      })
                    : '—'}
                </span>
              </div>
            </div>

            <div
              style={{
                display: 'grid',
                gap: '0.75rem',
                marginTop: '0.5rem',
                gridTemplateColumns: 'repeat(auto-fit, minmax(220px, 1fr))',
              }}
            >
              <a
                href={data.originalUrl ?? '#'}
                target="_blank"
                rel="noopener noreferrer"
                style={{
                  display: 'inline-block',
                  padding: '0.7rem 0.9rem',
                  borderRadius: 10,
                  border: '1px solid #222',
                  background: 'linear-gradient(135deg,#4f8cff,#2e6dff)',
                  color: '#fff',
                  fontWeight: 600,
                  textAlign: 'center',
                  textDecoration: 'none',
                }}
              >
                View original PDF
              </a>

              <a
                href={data.originalUrl ?? '#'}
                download={`credential-${id}.pdf`}
                style={{
                  display: 'inline-block',
                  padding: '0.7rem 0.9rem',
                  borderRadius: 10,
                  border: '1px solid rgba(255,255,255,.24)',
                  background: 'transparent',
                  color: '#fff',
                  fontWeight: 600,
                  textAlign: 'center',
                  textDecoration: 'none',
                }}
              >
                Download original PDF
              </a>

              {data.processedUrl && (
                <a
                  href={data.processedUrl}
                  target="_blank"
                  rel="noopener noreferrer"
                  style={{
                    display: 'inline-block',
                    padding: '0.7rem 0.9rem',
                    borderRadius: 10,
                    border: '1px solid rgba(255,255,255,.24)',
                    background: 'transparent',
                    color: '#fff',
                    fontWeight: 600,
                    textAlign: 'center',
                    textDecoration: 'none',
                  }}
                >
                  View signed PDF
                </a>
              )}
            </div>

            <small style={{ color: '#b8c4d6' }}>
              This link was generated by the issuer at the time of issuance. The original PDF is
              preserved without alterations; the QR is only embedded in a copy to facilitate
              verification.
            </small>
          </div>
        )}

        <div style={{ marginTop: '1rem' }}>
          <a href="/" style={{ color: '#d7deea', textDecoration: 'underline' }}>
            Back to home
          </a>
        </div>

        {/* VC short explanation - below "Back to home" */}
        <section
          style={{
            marginTop: 16,
            padding: '12px 14px',
            border: '1px solid rgba(255,255,255,.18)',
            borderRadius: 10,
            background: 'rgba(255,255,255,.05)',
            fontSize: 14,
            lineHeight: 1.45,
            color: '#d7deea',
          }}
        >
          <h4 style={{ margin: '0 0 6px', fontSize: 16, color: '#fff' }}>
            What is a Verifiable Credential (VC)?
          </h4>
          <p style={{ margin: '0 0 6px' }}>
            A Verifiable Credential is a cryptographically signed digital document issued by an organization.
            The signature lets anyone verify <strong>who</strong> issued it and that the <strong>contents have not been modified</strong>.
          </p>
          <ul style={{ margin: '6px 0 0 18px' }}>
            <li><strong>Authenticity:</strong> verified with the issuer’s public key.</li>
            <li><strong>Integrity:</strong> if someone alters the file, verification fails.</li>
            <li><strong>Portability:</strong> verification does not depend on a single database or server.</li>
          </ul>
          <p style={{ marginTop: 6 }}>
            A simple QR usually just opens a URL to look up a record in a database; if that server changes, goes down,
            or the record is replaced, results can be inconsistent. A VC adds <strong>cryptographic proof</strong>, so the
            document can be validated in a consistent, auditable, and tamper-resistant way.
          </p>
        </section>
      </div>
    </main>
  );
}
