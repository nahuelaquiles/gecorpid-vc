import { importJWK, SignJWT, JWK } from 'jose';
import { v4 as uuidv4 } from 'uuid';

const ISSUER = process.env.VC_ISSUER_DID!;
const KID = process.env.VC_KID!;

export type IssueVcInput = {
  subjectId: string;
  vcType?: string[];
  claims?: Record<string, unknown>; // <- sin "any"
  expiresInDays?: number;
};

export async function signVC({ subjectId, vcType = [], claims = {}, expiresInDays = 365 }: IssueVcInput) {
  const privateJwk = JSON.parse(process.env.VC_PRIVATE_KEY_JWK!) as JWK;
  const key = await importJWK(privateJwk, 'EdDSA');

  const now = Math.floor(Date.now() / 1000);
  const exp = now + (expiresInDays * 24 * 60 * 60);
  const jti = uuidv4();

  const vcPayload = {
    "@context": ["https://www.w3.org/ns/credentials/v2"],
    type: ["VerifiableCredential", ...vcType],
    issuer: ISSUER,
    issuanceDate: new Date().toISOString(),
    credentialSubject: { id: subjectId, ...claims },
  };

  const jwt = await new SignJWT({ vc: vcPayload })
    .setProtectedHeader({ alg: 'EdDSA', kid: KID })
    .setIssuer(ISSUER)
    .setSubject(subjectId)
    .setJti(jti)
    .setIssuedAt(now)
    .setNotBefore(now)
    .setExpirationTime(exp)
    .sign(key);

  return { jwt, jti, exp };
}

