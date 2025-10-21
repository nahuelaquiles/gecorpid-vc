// src/app/api/revoke/route.ts
import { NextRequest, NextResponse } from 'next/server';
import { createClient } from '@supabase/supabase-js';
import { createHash } from 'node:crypto';

/**
 * Revokes an existing verifiable credential. Only the tenant who
 * originally issued the credential may revoke it. Revocation marks
 * the credential status as `revoked` and stores an optional reason.
 */

export const runtime = 'nodejs';
export const dynamic = 'force-dynamic';

const SUPABASE_URL = process.env.SUPABASE_URL!;
const SUPABASE_SERVICE_ROLE = process.env.SUPABASE_SERVICE_ROLE!;

function sha256Hex(input: string) {
  return createHash('sha256').update(input).digest('hex');
}

async function getTenantByApiKey(supabase: any, apiKey: string) {
  let { data, error } = await supabase.from('tenants').select('*').eq('api_key', apiKey).maybeSingle();
  if (data && !error) return data;
  try {
    const hash = sha256Hex(apiKey);
    const res = await supabase.from('tenants').select('*').eq('api_key_hash', hash).maybeSingle();
    if (res.data) return res.data;
  } catch {}
  return null;
}

async function resolveTenant(req: NextRequest, supabase: any) {
  const hostHeader = req.headers.get('host') || req.headers.get('x-forwarded-host') || '';
  const hostname = hostHeader.split(':')[0];
  if (hostname) {
    const { data: t, error } = await supabase.from('tenants').select('*').eq('domain', hostname).maybeSingle();
    if (!error && t) return t;
  }
  const apiCookie = req.cookies.get('client_api_key');
  if (apiCookie?.value) {
    const tenant = await getTenantByApiKey(supabase, apiCookie.value);
    if (tenant) return tenant;
  }
  return null;
}

export async function POST(req: NextRequest) {
  try {
    const supabase = createClient(SUPABASE_URL, SUPABASE_SERVICE_ROLE);
    const tenant = await resolveTenant(req, supabase);
    if (!tenant) {
      return NextResponse.json({ error: 'Unauthorised' }, { status: 401 });
    }

    const body = await req.json().catch(() => ({}));
    const cid: string | undefined = body?.cid;
    const reason: string | undefined = body?.reason;
    if (!cid) return NextResponse.json({ error: 'cid is required' }, { status: 400 });

    // Fetch credential
    const credRes = await supabase.from('credentials').select('*').eq('cid', cid).maybeSingle();
    if (credRes.error) throw credRes.error;
    const cred = credRes.data;
    if (!cred) return NextResponse.json({ error: 'Credential not found' }, { status: 404 });
    if (cred.tenant_id !== tenant.id) return NextResponse.json({ error: 'Forbidden' }, { status: 403 });

    const { error: updErr } = await supabase
      .from('credentials')
      .update({ status: 'revoked', revoked_at: new Date().toISOString(), reason: reason || null })
      .eq('cid', cid);
    if (updErr) throw updErr;

    return NextResponse.json({ ok: true }, { status: 200 });
  } catch (err: any) {
    console.error('[api/revoke] error:', err);
    return NextResponse.json({ error: err?.message || 'Server error' }, { status: 500 });
  }
}
