import { NextRequest, NextResponse } from 'next/server';
import { createClient } from '@supabase/supabase-js';
import { SignJWT, importJWK, JWK } from 'jose';

const SUPABASE_URL = process.env.SUPABASE_URL!;
const SUPABASE_SERVICE_ROLE = process.env.SUPABASE_SERVICE_ROLE!;
const ISSUER_PRIVATE_JWK = process.env.ISSUER_PRIVATE_JWK!;
const NEXT_PUBLIC_ISSUER_DID = process.env.NEXT_PUBLIC_ISSUER_DID || 'did:web:gecorpid.com';
const JWK_KID = process.env.JWK_KID || undefined;
const NEXT_PUBLIC_SITE_URL = process.env.NEXT_PUBLIC_SITE_URL || 'https://gecorpid.com';

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
    if (!apiKey) {
      return NextResponse.json({ error: 'Missing x-api-key' }, { status: 401 });
    }
    const supabase = createClient(SUPABASE_URL, SUPABASE_SERVICE_ROLE);
    const tenant = await getTenantByApiKey(supabase, apiKey);
    if (!tenant) {
      return NextResponse.json({ error: 'Invalid API key' }, { status: 401 });
    }

    const body = await req.json().catch(() => ({}));
    const { cid, sha256, doc_type } = body || {};
    if (!cid || !sha256 || typeof sha256 !== 'string' || sha256.length !== 64) {
      return NextResponse.json({ error: 'cid and sha256 (64 hex) are required' }, { status: 400 });
    }

    // 1) Validar ticket (existe, no usado, no vencido, mismo tenant)
    const { data: ticket, error: tErr } = await supabase
      .from('issue_tickets')
      .select('*')
      .eq('cid', cid)
      .maybeSingle();
    if (tErr) throw tErr;
    if (!ticket) return NextResponse.json({ error: 'Invalid cid' }, { status: 400 });
    if (ticket.tenant_id !== tenant.id) return NextResponse.json({ error: 'Tenant mismatch' }, { status: 403 });
    if (ticket.used) return NextResponse.json({ error: 'Ticket already used' }, { status: 400 });
    if (new Date(ticket.expires_at).getTime() < Date.now()) {
      return NextResponse.json({ error: 'Ticket expired' }, { status: 400 });
    }

    // 2) Gastar 1 crédito de forma atómica
    const { data: spent, error: sErr } = await supabase.rpc('spend_credit', { p_tenant: tenant.id });
    if (sErr) throw sErr;
    if (!spent) return NextResponse.json({ error: 'No credits available' }, { status: 402 });

    // 3) Registrar credencial
    const { error: cErr } = await supabase.from('credentials').insert({
      cid,
      tenant_id: tenant.id,
      sha256,
      doc_type: doc_type || null,
      status: 'valid',
    });
    if (cErr) {
      // Devolver crédito si falló el insert (mejorable con transacción/función)
      await supabase.from('tenants').update({ credits: tenant.credits + 1 }).eq('id', tenant.id);
      throw cErr;
    }

    // 4) Marcar ticket como usado
    await supabase.from('issue_tickets').update({ used: true }).eq('cid', cid);

    // 5) Firmar VC (JWT con EdDSA)
    const jwk: JWK = typeof ISSUER_PRIVATE_JWK === 'string'
      ? JSON.parse(ISSUER_PRIVATE_JWK)
      : ISSUER_PRIVATE_JWK as any;
    const key = await importJWK(jwk, 'EdDSA');

    const nowSec = Math.floor(Date.now() / 1000);
    const payload = {
      iss: NEXT_PUBLIC_ISSUER_DID,
      sub: tenant.did || `did:web:tenant:${tenant.id}`,
      jti: cid,
      nbf: nowSec,
      iat: nowSec,
      vc: {
        '@context': ['https://www.w3.org/2018/credentials/v1'],
        type: ['VerifiableCredential', 'DocumentIntegrity'],
        issuer: NEXT_PUBLIC_ISSUER_DID,
        credentialSubject: {
          tenant_id: tenant.id,
          file_sha256: sha256,
          file_mime: 'application/pdf',
          doc_type: doc_type || 'genetic_report',
        }
      }
    };

    const jwt = await new SignJWT(payload as any)
      .setProtectedHeader({ alg: 'EdDSA', kid: JWK_KID })
      .sign(key);

    const verify_url = `${NEXT_PUBLIC_SITE_URL.replace(/\/$/, '')}/v/${cid}`;

    return NextResponse.json({ vc_jwt: jwt, verify_url, cid }, { status: 200 });
  } catch (e: any) {
    console.error(e);
    return NextResponse.json({ error: e.message || 'Server error' }, { status: 500 });
  }
}
