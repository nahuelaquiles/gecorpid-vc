// src/app/api/issue-request/route.ts
import { NextRequest, NextResponse } from 'next/server';
import { createClient } from '@supabase/supabase-js';
import { randomUUID, randomBytes, createHash } from 'node:crypto';

/**
 * This endpoint creates a short‑lived issuance ticket for a new
 * verifiable credential. A client may call it to obtain a unique
 * credential identifier (CID) and a verification URL. No PDF is
 * uploaded to the server; the CID is used to associate a later
 * hash with the issuing tenant. A nonce is returned for future
 * extensibility but is not currently required on the client.
 *
 * Tenant identification is resolved on the server: first by
 * matching the request host to a tenant domain (tenants.domain),
 * then falling back to a secure cookie (`client_api_key`) which
 * holds the tenant’s API key. The key comparison uses both
 * plaintext and SHA‑256 hashed columns for compatibility.
 */

export const runtime = 'nodejs';
export const dynamic = 'force-dynamic';

// Environment variables required for Supabase and site URL.
const SUPABASE_URL = process.env.SUPABASE_URL!;
const SUPABASE_SERVICE_ROLE = process.env.SUPABASE_SERVICE_ROLE!;
const NEXT_PUBLIC_SITE_URL = (process.env.NEXT_PUBLIC_SITE_URL || '').replace(/\/$/, '');

function sha256Hex(input: string) {
  return createHash('sha256').update(input).digest('hex');
}

async function getTenantByApiKey(supabase: any, apiKey: string) {
  // Try plaintext api_key first
  let { data, error } = await supabase.from('tenants').select('*').eq('api_key', apiKey).maybeSingle();
  if (data && !error) return data;
  // Fallback to hashed comparison
  try {
    const hash = sha256Hex(apiKey);
    const res = await supabase.from('tenants').select('*').eq('api_key_hash', hash).maybeSingle();
    if (res.data) return res.data;
  } catch {
    // ignore missing column errors
  }
  return null;
}

/**
 * Resolve the tenant for the incoming request. We look at the
 * request host (sans port) to see if it matches a tenant’s domain.
 * If no match is found, we fall back to a cookie named
 * `client_api_key` which stores a previously authorised API key.
 */
async function resolveTenant(req: NextRequest, supabase: any) {
  // 1) Match by domain. Remove port if present (e.g. `localhost:3000`).
  const hostHeader = req.headers.get('host') || req.headers.get('x-forwarded-host') || '';
  const hostname = hostHeader.split(':')[0];
  if (hostname) {
    const { data: tenantByDomain, error } = await supabase
      .from('tenants')
      .select('*')
      .eq('domain', hostname)
      .maybeSingle();
    if (!error && tenantByDomain) return tenantByDomain;
  }
  // 2) Fallback to secure cookie holding the API key
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

    // Generate identifiers
    const cid = randomUUID();
    const nonce = randomBytes(16).toString('hex');
    const expiresAt = new Date(Date.now() + 30 * 60 * 1000).toISOString();

    // Insert ticket into issue_tickets table
    const { error: insertErr } = await supabase.from('issue_tickets').insert({
      tenant_id: tenant.id,
      cid,
      nonce,
      expires_at: expiresAt,
      used: false,
    });
    if (insertErr) throw insertErr;

    const verify_url = `${NEXT_PUBLIC_SITE_URL}/v/${cid}`;
    return NextResponse.json({ cid, verify_url, nonce }, { status: 200 });
  } catch (err: any) {
    console.error('[api/issue-request] error:', err);
    return NextResponse.json({ error: err?.message || 'Server error' }, { status: 500 });
  }
}
