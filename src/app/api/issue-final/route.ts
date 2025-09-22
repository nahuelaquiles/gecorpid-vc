// src/app/api/issue-final/route.ts
import { NextRequest, NextResponse } from 'next/server';
import { createClient } from '@supabase/supabase-js';
import { importJWK, JWK, KeyLike, SignJWT } from 'jose';
import { createHash } from 'node:crypto';

export const runtime = 'nodejs';
export const dynamic = 'force-dynamic';

// --- Env ---
const SUPABASE_URL = process.env.SUPABASE_URL!;
const SUPABASE_SERVICE_ROLE = process.env.SUPABASE_SERVICE_ROLE!;
const ISSUER_DID = process.env.NEXT_PUBLIC_ISSUER_DID!;
const PRIVATE_JWK = process.env.ISSUER_PRIVATE_JWK!;
const JWK_KID = process.env.JWK_KID || undefined;

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
  // Texto plano primero
  let { data, error } = await supabase.from('tenants').select('*').eq('api_key', apiKey).maybeSingle();
  if (data && !error) return data;
  // Fallback: hash
  try {
    const hash = sha256Hex(apiKey);
    const res = await supabase.from('tenants').select('*').eq('api_key_hash', hash).maybeSingle();
    if (res.data) return res.data;
  } catch {}
  return null;
}
async function importPrivateEd25519(jwkJson: string): Promise<KeyLike> {
  const jwk = JSON.parse(jwkJson) as JWK;
  return importJWK(jwk, 'EdDSA');
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
    const sha256: string | undefined = body?.sha256;
    const doc_type: string | undefined = body?.doc_type;

    if (!cid) return fail('cid is required', 400);
    if (!sha256) return fail('sha256 is required', 400);

    // Ticket
    const tkRes = await supabase.from('issue_tickets').select('*').eq('cid', cid).maybeSingle();
    if (tkRes.error) throw tkRes.error;
    const ticket = tkRes.data;
    if (!ticket) return fail('Ticket not found', 404);
    if (ticket.tenant_id !== tenant.id) return fail('Forbidden', 403);
    if (ticket.used) return fail('Ticket already used', 409);
    if (ticket.expires_at && new Date(ticket.expires_at).getTime() < Date.now()) {
      return fail('Ticket expired', 410);
    }

    // Descontar 1 crédito (si existe el RPC; ajustá el nombre del arg)
    try {
      await supabase.rpc('spend_credit', { tenant_id: tenant.id });
    } catch {
      // Si no existe, lo podés activar después; no rompemos el flujo.
    }

    // Firmar VC (JWT EdDSA)
    const key = await importPrivateEd25519(PRIVATE_JWK);
    const now = Math.floor(Date.now() / 1000);
    const exp = now + 60 * 60 * 24 * 365; // 1 año

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

    // Guardar credencial + marcar ticket usado
    const { error: insCredErr } = await supabase.from('credentials').insert({
      tenant_id: tenant.id,
      cid,
      sha256,
      vc_jwt: jwt,
      status: 'active',
      issued_at: new Date().toISOString(),
      doc_type: doc_type || null,
    });
    if (insCredErr) throw insCredErr;

    const { error: updErr } = await supabase.from('issue_tickets').update({ used: true, sha256 }).eq('cid', cid);
    if (updErr) throw updErr;

    return NextResponse.json({ vc_jwt: jwt, cid }, { status: 200 });
  } catch (e: any) {
    console.error('[issue-final] error:', e);
    return NextResponse.json({ error: e?.message || 'Server error' }, { status: 500 });
  }
}
