// src/app/client/page.tsx
'use client';

import { useEffect, useState } from 'react';
import { useRouter } from 'next/navigation';

export default function ClientPage() {
  const router = useRouter();

  const [apiKey, setApiKey] = useState<string | null>(null);
  const [tenantId, setTenantId] = useState<string | null>(null);

  const [file, setFile] = useState<File | null>(null);
  const [errorMsg, setErrorMsg] = useState('');
  const [status, setStatus] = useState<'idle' | 'uploading' | 'done'>('idle');
  const [downloadUrl, setDownloadUrl] = useState<string | null>(null);

  useEffect(() => {
    const k = localStorage.getItem('apiKey');
    const t = localStorage.getItem('tenantId');
    if (!k || !t) {
      router.push('/login');
      return;
    }
    setApiKey(k);
    setTenantId(t);
  }, [router]);

  async function onUpload(e: React.FormEvent) {
    e.preventDefault();
    setErrorMsg('');
    setDownloadUrl(null);

    if (!apiKey) {
      setErrorMsg('Falta apiKey. Iniciá sesión nuevamente.');
      router.push('/login');
      return;
    }
    if (!file) {
      setErrorMsg('Seleccioná un archivo PDF primero.');
      return;
    }

    try {
      setStatus('uploading');
      const fd = new FormData();
      fd.append('file', file);

      const res = await fetch('/api/upload', {
        method: 'POST',
        headers: { 'x-api-key': apiKey },
        body: fd,
      });

      if (!res.ok) {
        let msg = 'Upload failed';
        try {
          const j = await res.json();
          msg = j?.error || msg;
        } catch {}
        throw new Error(msg);
      }

      const blob = await res.blob();
      const url = URL.createObjectURL(blob);
      setDownloadUrl(url);
      setStatus('done');
    } catch (err: any) {
      setErrorMsg(err?.message || 'Error inesperado');
      setStatus('idle');
    }
  }

  function logout() {
    localStorage.removeItem('apiKey');
    localStorage.removeItem('tenantId');
    router.push('/login');
  }

  if (!apiKey || !tenantId) return null; // mientras redirige a /login

  return (
    <main style={{ display: 'grid', placeItems: 'center', minHeight: '70vh', padding: '2rem' }}>
      <div style={{ width: '100%', maxWidth: 560 }}>
        <div
          style={{
            display: 'flex',
            justifyContent: 'space-between',
            alignItems: 'center',
            marginBottom: '1rem',
          }}
        >
          <h1 style={{ fontSize: '1.6rem' }}>Panel de cliente</h1>
          <button
            onClick={logout}
            style={{ border: '1px solid #ccc', padding: '0.4rem 0.7rem', borderRadius: 8, cursor: 'pointer' }}
          >
            Salir
          </button>
        </div>

        <p style={{ color: '#555', marginBottom: '1rem' }}>
          Subí un <b>PDF</b> y el sistema agregará un <b>QR</b> con la URL de verificación. Se descontará <b>1 crédito</b>.
        </p>

        <form
          onSubmit={onUpload}
          style={{ display: 'grid', gap: '0.8rem', padding: '1rem', border: '1px solid #eee', borderRadius: 12 }}
        >
          <input
            type="file"
            accept="application/pdf"
            onChange={(e) => setFile(e.target.files?.[0] ?? null)}
            style={{ padding: '0.5rem', border: '1px solid #ccc', borderRadius: 8 }}
            required
          />

          <button
            type="submit"
            disabled={status === 'uploading'}
            style={{
              padding: '0.7rem 0.9rem',
              borderRadius: 10,
              border: '1px solid #222',
              background: status === 'uploading' ? '#999' : '#222',
              color: '#fff',
              fontWeight: 600,
              cursor: status === 'uploading' ? 'not-allowed' : 'pointer',
            }}
          >
            {status === 'uploading' ? 'Procesando…' : 'Subir y generar QR'}
          </button>

          {errorMsg && <div style={{ color: '#b00020' }}>{errorMsg}</div>}

          {downloadUrl && (
            <div style={{ marginTop: '0.5rem', display: 'grid', gap: '0.5rem' }}>
              <a href={downloadUrl} download="document-with-qr.pdf" style={{ textDecoration: 'underline' }}>
                Descargar PDF con QR
              </a>
              <button
                type="button"
                onClick={() => window.open(downloadUrl!, '_blank')}
                style={{ border: '1px solid #ccc', padding: '0.5rem 0.7rem', borderRadius: 8, cursor: 'pointer' }}
              >
                Abrir en otra pestaña
              </button>
              <small style={{ color: '#666' }}>
                El QR apunta a <code>/v/&lt;id&gt;</code>. En los pasos 5–6 activaremos la verificación y redirección pública.
              </small>
            </div>
          )}
        </form>
      </div>
    </main>
  );
}
