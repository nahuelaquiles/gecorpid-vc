/* Server Component: página pública de verificación */
/* Ruta: src/app/v/[id]/page.tsx */

import ClientHashCompare from './ClientHashCompare';
import { createClient } from '@supabase/supabase-js';
import { notFound } from 'next/navigation';

export const runtime = 'nodejs';
export const dynamic = 'force-dynamic';

const SUPABASE_URL = process.env.SUPABASE_URL!;
const SUPABASE_SERVICE_ROLE = process.env.SUPABASE_SERVICE_ROLE!;

async function getCredential(cid: string) {
  const supabase = createClient(SUPABASE_URL, SUPABASE_SERVICE_ROLE);
  const { data, error } = await supabase
    .from('credentials')
    .select('cid, sha256, status, issued_at, revoked_at, reason, tenant_id')
    .eq('cid', cid)
    .maybeSingle();
  if (error) throw error;
  return data;
}

function fingerprintShort(hex: string) {
  if (!hex || hex.length < 8) return '';
  return hex.slice(-8).toUpperCase();
}

export default async function VerifyPage({ params }: { params: { id: string } }) {
  // OJO: acá usamos params.id (porque tu carpeta es [id])
  const cred = await getCredential(params.id);
  if (!cred) return notFound();

  return (
    <div className="min-h-screen bg-slate-50 text-slate-800">
      <div className="max-w-3xl mx-auto py-10 px-6">
        <h1 className="text-2xl font-semibold mb-2">Verificación de documento</h1>
        <p className="text-sm text-slate-600 mb-6">
          ID de credencial: <span className="font-mono">{cred.cid}</span>
        </p>

        <div className="rounded-2xl border bg-white p-5 shadow-sm mb-6">
          <div className="flex items-center justify-between">
            <div>
              <div className="text-sm text-slate-500">Estado</div>
              <div
                className={`text-lg font-semibold ${
                  cred.status === 'valid' ? 'text-emerald-600' : 'text-rose-600'
                }`}
              >
                {cred.status === 'valid' ? 'VÁLIDA' : 'REVOCADA'}
              </div>
            </div>
            <div className="text-right">
              <div className="text-sm text-slate-500">Huella (últimos 8)</div>
              <div className="font-mono text-base">{fingerprintShort(cred.sha256)}</div>
            </div>
          </div>
          <div className="text-xs text-slate-500 mt-3">
            Emitida: {new Date(cred.issued_at).toLocaleString()}
            {cred.revoked_at && (
              <>
                {' '}
                · Revocada: {new Date(cred.revoked_at).toLocaleString()}{' '}
                {cred.reason ? `· Motivo: ${cred.reason}` : ''}
              </>
            )}
          </div>
        </div>

        {/* Verificación local por arrastre SIN subir el archivo */}
        <ClientHashCompare expected={cred.sha256} />
      </div>
    </div>
  );
}
