// src/app/api/issue-request/route.ts
import { NextRequest, NextResponse } from 'next/server';
import { createClient } from '@supabase/supabase-js';
import { randomUUID, randomBytes, createHash } from 'node:crypto';

export const runtime = 'nodejs';
export const dynamic = 'force-dynamic';

// --- Environment ---
const SUPABASE_URL = process.env.SUPABASE_URL!;
const SUPABASE_SERVICE_ROLE = process.env.SUPABASE_SERVICE_ROLE!;
const NEXT_PUBLIC_SITE_URL = (process.env.NEXT_PUBLIC_SITE_URL || 'https://gecorpid.com').replace(/\/$/, '');

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
  // Primero intenta columna en texto plano (tenants.api_key)
  let { data, error } = await supabase.from('tenants').select('*').eq('api_key', apiKey).maybeSingle();
  if (data && !error) return data;

  // Fallback: compara contra tenants.api_key_hash (sha256)
  try {
    const hash = sha256Hex(apiKey);
    const res = await supabase.from('tenants').select('*').eq('api_key_hash', hash).maybeSingle();
    if (res.data) return res.data;
  } catch {
    // Ignorar si la columna no existe en este schema
  }
  return null;
}

export async function POST(req: NextRequest) {
  try {
    const apiKey = readApiKey(req);
    if (!apiKey) return fail('Missing x-api-key', 401);

    const supabase = createClient(SUPABASE_URL, SUPABASE_SERVICE_ROLE);
    const tenant = await getTenantByApiKey(supabase, apiKey);
    if (!tenant) return fail('Invalid API key', 401);

    // Identificadores
    const cid = randomUUID();
    const nonce = randomBytes(16).toString('hex');
    const expiresAt = new Date(Date.now() + 30 * 60 * 1000).toISOString(); // 30 minutos

    // Guardar ticket
    const { error: insErr } = await supabase.from('issue_tickets').insert({
      tenant_id: tenant.id,
      cid,
      nonce,
      expires_at: expiresAt,
      used: false,
    });
    if (insErr) throw insErr;

    const verify_url = `${NEXT_PUBLIC_SITE_URL}/v/${cid}`;
    return NextResponse.json({ cid, verify_url, nonce }, { status: 200 });
  } catch (e: any) {
    console.error('[issue-request] error:', e);
    return NextResponse.json({ error: e?.message || 'Server error' }, { status: 500 });
  }
}
