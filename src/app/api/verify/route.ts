import { NextRequest, NextResponse } from 'next/server';
import { decodeJwt, importJWK, JWK, jwtVerify, KeyLike } from 'jose';

type VerifyBody = { jwt: string };

function getEnv(name: string): string | null {
  return process.env[name] ?? null;
}

async function keyFromEnv(): Promise<KeyLike | null> {
  const pub = getEnv('PUBLIC_JWK');
  if (!pub) return null;
  const jwk = JSON.parse(pub) as JWK;
  return importJWK(jwk, 'EdDSA');
}

async function keyFromDidWeb(issuerDid: string): Promise<KeyLike | null> {
  try {
    if (!issuerDid.startsWith('did:web:')) return null;
    const domain = issuerDid.replace(/^did:web:/, '').replace(/:/g, '.');
    const res = await fetch(`https://${domain}/.well-known/did.json`, { cache: 'no-store' });
    if (!res.ok) return null;
    const did = (await res.json()) as {
      verificationMethod?: Array<{
        id: string;
        type: string;
        publicKeyJwk?: JWK;
      }>;
    };
    const kidEnv = getEnv('VC_KID') ?? `${issuerDid}#key-1`;
    const vm = (did.verificationMethod ?? []).find((m) => m.id === kidEnv);
    if (!vm?.publicKeyJwk) return null;
    return importJWK(vm.publicKeyJwk, 'EdDSA');
  } catch {
    return null;
  }
}

export async function POST(req: NextRequest) {
  try {
    const body = (await req.json()) as VerifyBody;
    if (!body?.jwt) {
      return NextResponse.json({ valid: false, error: 'jwt is required' }, { status: 400 });
    }

    const decoded = decodeJwt(body.jwt);
    const issuer = (decoded.iss as string) ?? null;
    const subject = (decoded.sub as string) ?? null;

    // 1) Intentamos con PUBLIC_JWK (si existe)
    let key = await keyFromEnv();

    // 2) Si no, resolvemos did:web automáticamente
    if (!key && issuer) {
      key = await keyFromDidWeb(issuer);
    }

    if (!key) {
      return NextResponse.json(
        { valid: false, error: 'No public key available (PUBLIC_JWK or did:web).' },
        { status: 500 }
      );
    }

    const { payload, protectedHeader } = await jwtVerify(body.jwt, key, {
      algorithms: ['EdDSA'],
      issuer: issuer ?? undefined,
      subject: subject ?? undefined,
    });

    return NextResponse.json({
      valid: true,
      issuer,
      subject,
      header: protectedHeader as Record<string, unknown>,
      payload: payload as Record<string, unknown>,
    });
  } catch (err: unknown) {
    const msg =
      err instanceof Error ? err.message : typeof err === 'string' ? err : 'Unknown error';
    return NextResponse.json({ valid: false, error: msg }, { status: 200 });
  }
}
