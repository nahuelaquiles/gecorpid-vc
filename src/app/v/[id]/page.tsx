// src/app/v/[id]/page.tsx
'use client';

import { useEffect, useState } from 'react';
import { useParams, useSearchParams } from 'next/navigation';

/**
 * Shape of the data returned by /api/verify-file. The tenant name is
 * optional and allows the UI to present a human-readable issuer name.
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
      }}
    >
      <div style={{ width: '100%', maxWidth: 720 }}>
        <h1 style={{ fontSize: '2rem', fontWeight: 600, marginBottom: '0.5rem' }}>
          Credential verification
        </h1>

        <p style={{ color: '#666', marginBottom: '1rem' }}>
          ID: <code>{id}</code>
        </p>

        {loading && <p>Verifying…</p>}

        {!loading && errorMsg && (
          <div style={{ color: '#b00020' }}>
            <p>Credential not found.</p>
            <small>{errorMsg}</small>
          </div>
        )}

        {!loading && !errorMsg && data && (
          <div
            style={{
              border: '1px solid #e6e6e6',
              borderRadius: 12,
              padding: '1.25rem',
              display: 'grid',
              gap: '1rem',
              background: '#fafafa',
            }}
          >
            <p style={{ fontSize: '1.1rem', margin: 0, display: 'flex', alignItems: 'center' }}>
              ✅ <b style={{ marginLeft: 4 }}>Original credential verified</b>
            </p>

            <div style={{ display: 'grid', gap: '0.35rem', color: '#444', fontSize: '0.95rem' }}>
              <div>
                <b>Issuer:</b>{' '}
                <span>
                  {data.tenantName
                    ? data.tenantName
                    : data.tenantId
                    ? `Tenant ${data.tenantId}`
                    : '—'}
                </span>
              </div>
              <div>
                <b>Date issued:</b>{' '}
                <span>
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
                gridTemplateColumns: 'repeat(auto-fit, minmax(200px, 1fr))',
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
                  background: '#222',
                  color: '#fff',
                  fontWeight: 600,
                  textAlign: 'center',
                  textDecoration: 'none',
                }}
              >
                Open original PDF
              </a>

              <a
                href={data.originalUrl ?? '#'}
                download={`credential-${id}.pdf`}
                style={{
                  display: 'inline-block',
                  padding: '0.7rem 0.9rem',
                  borderRadius: 10,
                  border: '1px solid #ccc',
                  background: '#fff',
                  color: '#222',
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
                    border: '1px solid #ccc',
                    background: '#fff',
                    color: '#222',
                    fontWeight: 600,
                    textAlign: 'center',
                    textDecoration: 'none',
                  }}
                >
                  View PDF with QR
                </a>
              )}
            </div>

            <small style={{ color: '#666' }}>
              This link was generated by the issuer at the time of issuance. The original PDF is
              preserved without alterations; the QR is only embedded in a copy to facilitate
              verification.
            </small>
          </div>
        )}

        <div style={{ marginTop: '1rem' }}>
          <a href="/" style={{ color: '#555', textDecoration: 'underline' }}>
            Back to home
          </a>
        </div>

        {/* --- Brief explanation section (added below the Back to home link) --- */}
        <section
          aria-label="What is a Verifiable Credential"
          style={{
            marginTop: '1rem',
            borderTop: '1px solid #eee',
            paddingTop: '1rem',
            color: '#494949',
            fontSize: '0.95rem',
            lineHeight: 1.45,
          }}
        >
          <h2 style={{ fontSize: '1.05rem', margin: '0 0 0.5rem 0', fontWeight: 600 }}>
            What is a Verifiable Credential?
          </h2>
          <p style={{ margin: '0 0 0.5rem 0' }}>
            A Verifiable Credential (VC) is a tamper-evident digital document signed by an issuer’s
            private key. Anyone can verify its authenticity with the issuer’s public key (for
            example via DID&nbsp;web) without needing to trust a specific database or API.
          </p>
          <p style={{ margin: '0 0 0.5rem 0' }}>
            How it works: the credential is cryptographically signed at issuance. When you scan the
            QR or open the link, the signature is checked. If the content was altered or the issuer
            is not the expected one, verification fails.
          </p>
          <p style={{ margin: 0 }}>
            Why it’s better than a simple QR: a basic QR that only redirects to a database depends
            on that server being online and honest; the data can change without detection. A VC is
            self-verifiable and tamper-evident, enabling integrity checks even if the database is
            offline or compromised.
          </p>
        </section>
      </div>
    </main>
  );
}
