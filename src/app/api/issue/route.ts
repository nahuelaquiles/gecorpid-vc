import { NextRequest, NextResponse } from 'next/server';
import { importJWK, JWK, KeyLike, SignJWT } from 'jose';

type IssueBody = {
  subjectId: string;
  claims: Record<string, unknown>;
};

function getEnv(name: string): string | null {
  return process.env[name] ?? null;
}

async function importPrivateEd25519(jwkJson: string): Promise<KeyLike> {
  const jwk = JSON.parse(jwkJson) as JWK;
  return importJWK(jwk, 'EdDSA');
}

export async function POST(req: NextRequest) {
  try {
    // Auth de API por header
    const headerKey = req.headers.get('x-api-key') ?? '';
    const serverKey = getEnv('API_KEY') ?? getEnv('ADMIN_SECRET') ?? '';
    if (!serverKey) {
      return NextResponse.json(
        { error: 'Missing API key on server (API_KEY or ADMIN_SECRET).' },
        { status: 500 }
      );
    }
    if (headerKey !== serverKey) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    const body = (await req.json()) as IssueBody;
    if (!body?.subjectId) {
      return NextResponse.json({ error: 'subjectId is required' }, { status: 400 });
    }

    const issuer =
      getEnv('ISSUER_DID') ??
      getEnv('VC_ISSUER_DID') ??
      (() => {
        throw new Error('Missing env: ISSUER_DID or VC_ISSUER_DID');
      })();

    const kid = getEnv('VC_KID') ?? `${issuer}#key-1`;

    const privateJwkJson =
      getEnv('PRIVATE_JWK') ??
      getEnv('SIGNING_PRIVATE_JWK') ??
      (() => {
        throw new Error('Missing env: PRIVATE_JWK or SIGNING_PRIVATE_JWK');
      })();

    const key = await importPrivateEd25519(privateJwkJson);

    // VC payload básico
    const now = Math.floor(Date.now() / 1000);
    const payload: Record<string, unknown> = {
      iss: issuer,
      sub: body.subjectId,
      nbf: now,
      iat: now,
      exp: now + 60 * 60 * 24 * 365, // 1 año
      vc: {
        '@context': ['https://www.w3.org/2018/credentials/v1'],
        type: ['VerifiableCredential', 'PersonCredential'],
        issuer,
        issuanceDate: new Date().toISOString(),
        credentialSubject: {
          id: body.subjectId,
          ...(body.claims ?? {}),
        },
      },
    };

    const jwt = await new SignJWT(payload)
      .setProtectedHeader({ alg: 'EdDSA', kid })
      .setIssuer(issuer)
      .setSubject(body.subjectId)
      .setIssuedAt(now)
      .setExpirationTime(payload.exp as number)
      .sign(key);

    return NextResponse.json({ jwt });
  } catch (err: unknown) {
    const msg =
      err instanceof Error ? err.message : typeof err === 'string' ? err : 'Unknown error';
    return NextResponse.json({ error: msg }, { status: 500 });
  }
}
