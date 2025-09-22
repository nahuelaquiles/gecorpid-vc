// src/app/api/revoke/route.ts
import { NextRequest, NextResponse } from 'next/server';
import { createClient } from '@supabase/supabase-js';
import { createHash } from 'node:crypto';

export const runtime = 'nodejs';
export const dynamic = 'force-dynamic';

// --- Env ---
const SUPABASE_URL = process.env.SUPABASE_URL!;
const SUPABASE_SERVICE_ROLE = process.env.SUPABASE_SERVICE_ROLE!;

// --- Helpers ---
function readApiKey(req: NextRequest): string | null {
  return req.headers.get('x-api-key');
}
function fail(msg: string, status = 400) {
  return NextResponse.json({ error: msg }, { status });
}
function sha256Hex(input: string) {
  return createHash('sha256').update(input).digest('hex');
}
async function getTenantByApiKey(supabase: any, apiKey: string) {
  // Texto plano
  let { data, error } = await supabase.from('tenants').select('*').eq('api_key', apiKey).maybeSingle();
  if (data && !error) return data;
  // Fallback hash
  try {
    const hash = sha256Hex(apiKey);
    const res = await supabase.from('tenants').select('*').eq('api_key_hash', hash).maybeSingle();
    if (res.data) return res.data;
  } catch {}
  return null;
}

export async function POST(req: NextRequest) {
  try {
    const apiKey = readApiKey(req);
    if (!apiKey) return fail('Missing x-api-key', 401);

    const supabase = createClient(SUPABASE_URL, SUPABASE_SERVICE_ROLE);
    const tenant = await getTenantByApiKey(supabase, apiKey);
    if (!tenant) return fail('Invalid API key', 401);

    const body = await req.json().catch(() => ({}));
    const cid: string | undefined = body?.cid;
    const reason: string | undefined = body?.reason;
    if (!cid) return fail('cid is required', 400);

    // Buscar credencial
    const credRes = await supabase.from('credentials').select('*').eq('cid', cid).maybeSingle();
    if (credRes.error) throw credRes.error;
    const cred = credRes.data;
    if (!cred) return fail('Credential not found', 404);
    if (cred.tenant_id !== tenant.id) return fail('Forbidden', 403);

    const { error: updErr } = await supabase
      .from('credentials')
      .update({ status: 'revoked', revoked_at: new Date().toISOString(), reason: reason || null })
      .eq('cid', cid);

    if (updErr) throw updErr;

    return NextResponse.json({ ok: true }, { status: 200 });
  } catch (e: any) {
    console.error('[revoke] error:', e);
    return NextResponse.json({ error: e?.message || 'Server error' }, { status: 500 });
  }
}
