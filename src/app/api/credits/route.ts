// src/app/api/credits/route.ts
import { NextRequest, NextResponse } from 'next/server';
import { createClient } from '@supabase/supabase-js';
import { createHash } from 'node:crypto';

/**
 * Returns the remaining credit balance for the current tenant. The
 * tenant is resolved by host or cookie as per other server
 * endpoints. Credits are read from the `tenants.credits` column,
 * defaulting to zero if not present.
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

export async function GET(req: NextRequest) {
  try {
    const supabase = createClient(SUPABASE_URL, SUPABASE_SERVICE_ROLE);
    const tenant = await resolveTenant(req, supabase);
    if (!tenant) {
      return NextResponse.json({ error: 'Unauthorised' }, { status: 401 });
    }
    // read credits from tenants.credits (defaults to 0 or null)
    const credits = (tenant.credits ?? 0) as number;
    return NextResponse.json({ credits }, { headers: { 'Cache-Control': 'no-store' } });
  } catch (err: any) {
    console.error('[api/credits] error:', err);
    return NextResponse.json({ error: err?.message || 'Server error' }, { status: 500 });
  }
}
