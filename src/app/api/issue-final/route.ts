// src/app/api/issue-final/route.ts
import { NextRequest, NextResponse } from 'next/server';
import { createClient } from '@supabase/supabase-js';
import { importJWK, JWK, KeyLike, SignJWT } from 'jose';
import { createHash } from 'node:crypto';

/**
 * This endpoint finalises the issuance of a verifiable credential.
 * The client calls it after stamping the PDF locally and computing
 * the SHA‑256 hash. The server validates the ticket, signs the VC
 * using EdDSA and stores the resulting JWT alongside the hash. No
 * PDF content is sent to the server.
 */

export const runtime = 'nodejs';
export const dynamic = 'force-dynamic';

// Environment variables
const SUPABASE_URL = process.env.SUPABASE_URL!;
const SUPABASE_SERVICE_ROLE = process.env.SUPABASE_SERVICE_ROLE!;
const ISSUER_DID = process.env.NEXT_PUBLIC_ISSUER_DID!;
const PRIVATE_JWK = process.env.ISSUER_PRIVATE_JWK!;
const JWK_KID = process.env.JWK_KID || undefined;

function sha256Hex(input: string) {
  return createHash('sha256').update(input).digest('hex');
}

async function getTenantByApiKey(supabase: any, apiKey: string) {
  // Plaintext check
  let { data, error } = await supabase.from('tenants').select('*').eq('api_key', apiKey).maybeSingle();
  if (data && !error) return data;
  // Hash check
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

async function importPrivateEd25519(jwkJson: string): Promise<KeyLike> {
  const jwk = JSON.parse(jwkJson) as JWK;
  return importJWK(jwk, 'EdDSA');
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
    const sha256: string | undefined = body?.sha256;
    const doc_type: string | undefined = body?.doc_type;
    if (!cid) return NextResponse.json({ error: 'cid is required' }, { status: 400 });
    if (!sha256) return NextResponse.json({ error: 'sha256 is required' }, { status: 400 });

    // Look up ticket
    const tkRes = await supabase.from('issue_tickets').select('*').eq('cid', cid).maybeSingle();
    if (tkRes.error) throw tkRes.error;
    const ticket = tkRes.data;
    if (!ticket) return NextResponse.json({ error: 'Ticket not found' }, { status: 404 });
    if (ticket.tenant_id !== tenant.id) return NextResponse.json({ error: 'Forbidden' }, { status: 403 });
    if (ticket.used) return NextResponse.json({ error: 'Ticket already used' }, { status: 409 });
    if (ticket.expires_at && new Date(ticket.expires_at).getTime() < Date.now()) {
      return NextResponse.json({ error: 'Ticket expired' }, { status: 410 });
    }

    // Optional credit spending via RPC; ignore failures
    try {
      await supabase.rpc('spend_credit', { tenant_id: tenant.id });
    } catch {}

    // Sign VC
    const key = await importPrivateEd25519(PRIVATE_JWK);
    const now = Math.floor(Date.now() / 1000);
    const exp = now + 60 * 60 * 24 * 365; // 1 year
    const vcPayload: Record<string, any> = {
      iss: ISSUER_DID,
      sub: cid,
      nbf: now,
      iat: now,
      exp,
      vc: {
        '@context': ['https://www.w3.org/2018/credentials/v1'],
        type: ['VerifiableCredential', 'DocumentHashCredential'],
        issuer: ISSUER_DID,
        issuanceDate: new Date().toISOString(),
        credentialSubject: {
          id: cid,
          cid,
          sha256,
          ...(doc_type ? { doc_type } : {}),
        },
        evidence: [
          {
            type: 'LocalHashBinding',
            method: 'SHA-256',
            cid,
            hash: sha256,
          },
        ],
      },
    };
    const jwt = await new SignJWT(vcPayload)
      .setProtectedHeader({ alg: 'EdDSA', ...(JWK_KID ? { kid: JWK_KID } : {}) })
      .setIssuer(ISSUER_DID)
      .setSubject(cid)
      .setIssuedAt(now)
      .setExpirationTime(exp)
      .sign(key);

    // Insert credential record
    const { error: insErr } = await supabase.from('credentials').insert({
      tenant_id: tenant.id,
      cid,
      sha256,
      vc_jwt: jwt,
      status: 'active',
      issued_at: new Date().toISOString(),
      doc_type: doc_type || null,
    });
    if (insErr) throw insErr;

    // Mark ticket as used and store the hash
    const { error: updErr } = await supabase.from('issue_tickets').update({ used: true, sha256 }).eq('cid', cid);
    if (updErr) throw updErr;

    return NextResponse.json({ vc_jwt: jwt, cid }, { status: 200 });
  } catch (err: any) {
    console.error('[api/issue-final] error:', err);
    return NextResponse.json({ error: err?.message || 'Server error' }, { status: 500 });
  }
}
