import type { JWK } from 'jose';

/**
 * Centraliza las variables de entorno usadas por la aplicación.
 *
 * PUBLIC_JWK y PRIVATE_JWK deben contener las claves en formato JSON.
 * Para compatibilidad, también se lee ISSUER_PRIVATE_JWK.
 */
export function getEnv() {
  const issuerDid = process.env.ISSUER_DID || 'did:web:gecorpid.com';
  let publicJwk: JWK | undefined;
  let privateJwk: JWK | undefined;
  try {
    publicJwk = JSON.parse(process.env.PUBLIC_JWK ?? '{}');
  } catch {
    publicJwk = undefined;
  }
  const privateRaw = process.env.PRIVATE_JWK || process.env.ISSUER_PRIVATE_JWK;
  try {
    privateJwk = privateRaw ? JSON.parse(privateRaw) : undefined;
  } catch {
    privateJwk = undefined;
  }
  return {
    issuerDid,
    publicJwk,
    privateJwk,
    supabaseUrl: process.env.NEXT_PUBLIC_SUPABASE_URL || process.env.SUPABASE_URL,
    supabaseAnonKey: process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY,
    supabaseServiceRole: process.env.SUPABASE_SERVICE_ROLE,
  };
}
