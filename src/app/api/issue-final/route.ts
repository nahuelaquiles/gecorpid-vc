import { NextRequest, NextResponse } from 'next/server';
import { createClient } from '@supabase/supabase-js';
import crypto from 'crypto';

const SUPABASE_URL = process.env.SUPABASE_URL!;
const SUPABASE_SERVICE_ROLE = process.env.SUPABASE_SERVICE_ROLE!;

function sha256Hex(input: string) {
  return crypto.createHash('sha256').update(input).digest('hex');
}

async function getTenantByApiKey(supabase: any, apiKey: string) {
  const hash = sha256Hex(apiKey);
  const { data, error } = await supabase
    .from('tenants')
    .select('*')
    .eq('api_key_hash', hash)
    .limit(1)
    .maybeSingle();
  if (error) throw error;
  return data;
}

export const runtime = 'nodejs';
export const dynamic = 'force-dynamic';

export async function POST(req: NextRequest) {
  try {
    const apiKey = req.headers.get('x-api-key');
    if (!apiKey) return NextResponse.json({ error: 'Missing x-api-key' }, { status: 401 });

    const supabase = createClient(SUPABASE_URL, SUPABASE_SERVICE_ROLE);
    const tenant = await getTenantByApiKey(supabase, apiKey);
    if (!tenant) return NextResponse.json({ error: 'Invalid API key' }, { status: 401 });

    const { cid, reason } = await req.json().catch(() => ({}));
    if (!cid) return NextResponse.json({ error: 'cid is required' }, { status: 400 });

    // Solo revoca credenciales del propio tenant
    const { data: cred, error: cErr } = await supabase
      .from('credentials').select('*').eq('cid', cid).maybeSingle();
    if (cErr) throw cErr;
    if (!cred) return NextResponse.json({ error: 'Credential not found' }, { status: 404 });
    if (cred.tenant_id !== tenant.id) return NextResponse.json({ error: 'Forbidden' }, { status: 403 });

    const { error: uErr } = await supabase
      .from('credentials')
      .update({ status: 'revoked', revoked_at: new Date().toISOString(), reason: reason || null })
      .eq('cid', cid);
    if (uErr) throw uErr;

    return NextResponse.json({ ok: true }, { status: 200 });
  } catch (e: any) {
    console.error(e);
    return NextResponse.json({ error: e.message || 'Server error' }, { status: 500 });
  }
}
