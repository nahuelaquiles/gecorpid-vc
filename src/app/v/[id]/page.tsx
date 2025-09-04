// src/app/v/[id]/page.tsx
'use client';

import { useEffect, useState } from 'react';
import { useParams, useSearchParams } from 'next/navigation';

/**
 * Shape of the data returned by `/api/verify-file`. The tenant name is
 * optional and allows the UI to present a human‑readable issuer name.
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
          // Redirección automática opcional: /v/{id}?auto=1
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
          Verificación de credencial
        </h1>
        <p style={{ color: '#666', marginBottom: '1rem' }}>
          ID: <code>{id}</code>
        </p>

        {loading && <p>Verificando…</p>}

        {!loading && errorMsg && (
          <div style={{ color: '#b00020' }}>
            <p>No se encontró la credencial.</p>
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
              ✅ <b style={{ marginLeft: 4 }}>Credencial original y verificable</b>
            </p>

            <div style={{ display: 'grid', gap: '0.35rem', color: '#444', fontSize: '0.95rem' }}>
              <div>
                <b>Emisor:</b>{' '}
                <span>
                  {data.tenantName
                    ? data.tenantName
                    : data.tenantId
                    ? `Tenant ${data.tenantId}`
                    : '—'}
                </span>
              </div>
              <div>
                <b>Fecha de emisión:</b>{' '}
                <span>
                  {created
                    ? created.toLocaleString(undefined, {
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
                Abrir PDF original
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
                Descargar PDF original
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
                  Ver PDF con QR
                </a>
              )}
            </div>

            <small style={{ color: '#666' }}>
              Este enlace fue generado por el emisor en el momento de la emisión. El PDF original se
              conserva sin alteraciones; el QR solo se incrusta en una copia para facilitar la
              verificación.
            </small>
          </div>
        )}

        <div style={{ marginTop: '1rem' }}>
          <a href="/" style={{ color: '#555', textDecoration: 'underline' }}>
            Volver al inicio
          </a>
        </div>
      </div>
    </main>
  );
}
