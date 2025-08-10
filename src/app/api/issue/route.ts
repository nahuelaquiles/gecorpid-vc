// src/app/api/issue/route.ts
import { NextRequest } from "next/server";
import { z } from "zod";
import { SignJWT, importJWK, JWK } from "jose";

export const runtime = "nodejs";

// Esquema de entrada
const BodySchema = z.object({
  subjectId: z.string().min(1),
  vcType: z.array(z.string()).optional(),
  // record requiere (keySchema, valueSchema)
  claims: z.record(z.string(), z.any()).optional(),
  expiresInDays: z.number().int().positive().optional(),
});

export async function POST(req: NextRequest) {
  try {
    const json = await req.json();
    const parsed = BodySchema.safeParse(json);
    if (!parsed.success) {
      return Response.json(
        { error: "Body inválido", details: parsed.error.flatten() },
        { status: 400 }
      );
    }

    const { subjectId, vcType, claims, expiresInDays } = parsed.data;

    const ISSUER_DID = process.env.ISSUER_DID || "did:web:gecorpid.com";
    const ISSUER_KID = process.env.ISSUER_KID || `${ISSUER_DID}#key-1`;
    const PRIVATE_JWK_RAW = process.env.ISSUER_PRIVATE_JWK;

    if (!PRIVATE_JWK_RAW) {
      return Response.json(
        { error: "Falta la variable de entorno ISSUER_PRIVATE_JWK." },
        { status: 500 }
      );
    }

    let privateJwk: JWK;
    try {
      privateJwk = JSON.parse(PRIVATE_JWK_RAW);
    } catch {
      return Response.json(
        { error: "ISSUER_PRIVATE_JWK no es JSON válido." },
        { status: 500 }
      );
    }

    const key = await importJWK(privateJwk, "EdDSA");

    const now = Math.floor(Date.now() / 1000);
    const expDays = expiresInDays ?? 365;

    // VC mínima en payload JWT (formato VC-JWT)
    const vc = {
      "@context": ["https://www.w3.org/ns/credentials/v2"],
      type: ["VerifiableCredential", ...(vcType ?? ["BasicIDCredential"])],
      issuer: ISSUER_DID,
      issuanceDate: new Date(now * 1000).toISOString(),
      credentialSubject: {
        id: subjectId,
        ...(claims ?? {}),
      },
    };

    const jwt = await new SignJWT({ vc })
      .setProtectedHeader({ alg: "EdDSA", kid: ISSUER_KID })
      .setIssuedAt(now)
      .setIssuer(ISSUER_DID)
      .setSubject(subjectId)
      .setExpirationTime(`${expDays}d`)
      .sign(key);

    return Response.json({ jwt, vc });
  } catch (err: unknown) {
    const message =
      err instanceof Error ? err.message : "Error desconocido en /api/issue";
    return Response.json({ error: message }, { status: 500 });
  }
}
