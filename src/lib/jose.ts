import { importJWK, jwtVerify, SignJWT, type JWK } from 'jose';
import { getEnv } from './env';

/**
 * Verifica un JWT firmado con EdDSA usando la clave pública configurada.
 * Devuelve el resultado de `jwtVerify`, con el payload y los encabezados.
 */
export async function verifyJwt(token: string) {
  const { publicJwk, issuerDid } = getEnv();
  if (!publicJwk) {
    throw new Error('PUBLIC_JWK no está configurada');
  }
  const key = await importJWK(publicJwk as JWK, 'EdDSA');
  return jwtVerify(token, key, { issuer: issuerDid });
}

interface SignVcOptions {
  kid?: string;
  expiresInDays?: number;
}

interface CredentialSubject {
  id?: string;
  [key: string]: unknown;
}

interface VerifiableCredential {
  credentialSubject?: CredentialSubject;
  [key: string]: unknown;
}

interface SignVcPayload {
  vc: VerifiableCredential;
}

/**
 * Firma una credencial verificable empaquetada en un JWT.
 * El primer argumento debe ser un objeto con propiedad `vc` que contenga la credencial.
 * @param payload Objeto con la propiedad `vc` (Verifiable Credential)
 * @param options Opciones de firma: `kid` y `expiresInDays` (días de expiración)
 */
export async function signVc(
  payload: SignVcPayload,
  options: SignVcOptions = {},
) {
  const { privateJwk, issuerDid } = getEnv();
  if (!privateJwk) {
    throw new Error('PRIVATE_JWK no está configurada');
  }
  const kid = options.kid ?? `${issuerDid}#key-1`;
  const expiresInDays = options.expiresInDays ?? 365;
  const key = await importJWK(privateJwk as JWK, 'EdDSA');

  return new SignJWT(payload)
    .setProtectedHeader({ alg: 'EdDSA', kid })
    .setIssuedAt()
    .setIssuer(issuerDid)
    .setSubject(payload.vc?.credentialSubject?.id || '')
    .setExpirationTime(`${expiresInDays}d`)
    .sign(key);
}
