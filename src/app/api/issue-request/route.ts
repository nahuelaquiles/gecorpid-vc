import { NextRequest, NextResponse } from 'next/server';
import { createClient } from '@supabase/supabase-js';
import { randomUUID } from 'crypto';

const SUPABASE_URL = process.env.SUPABASE_URL!;
const SUPABASE_SERVICE_ROLE = process.env.SUPABASE_SERVICE_ROLE!;
const NEXT_PUBLIC_SITE_URL = process.env.NEXT_PUBLIC_SITE_URL || 'https://gecorpid.com';

function sha256Hex(input: string) {
  return crypto.createHash('sha256').update(input).digest('hex');
}

// Busca tenant por x-api-key (comparando SHA-256)
// Si tu api_key_hash está en bcrypt, cambiá esta función por bcrypt.compare.
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
    if (!apiKey) {
      return NextResponse.json({ error: 'Missing x-api-key' }, { status: 401 });
    }
    const supabase = createClient(SUPABASE_URL, SUPABASE_SERVICE_ROLE);

    const tenant = await getTenantByApiKey(supabase, apiKey);
    if (!tenant) {
      return NextResponse.json({ error: 'Invalid API key' }, { status: 401 });
    }

    // Chequeo simple de créditos > 0 (el gasto real se hace en issue-final)
    if ((tenant.credits ?? 0) <= 0) {
      return NextResponse.json({ error: 'No credits available' }, { status: 402 });
    }

    const cid = randomUUID();
    const nonce = randomUUID();
    const expires = new Date(Date.now() + 30 * 60 * 1000).toISOString(); // 30 min

    const { error: insertErr } = await supabase.from('issue_tickets').insert({
      cid,
      tenant_id: tenant.id,
      nonce,
      expires_at: expires,
      used: false,
    });
    if (insertErr) throw insertErr;

    const verify_url = `${NEXT_PUBLIC_SITE_URL.replace(/\/$/, '')}/v/${cid}`;

    return NextResponse.json({ cid, verify_url, nonce }, { status: 200 });
  } catch (e: any) {
    console.error(e);
    return NextResponse.json({ error: e.message || 'Server error' }, { status: 500 });
  }
}
