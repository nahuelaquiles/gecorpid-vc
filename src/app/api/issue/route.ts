import { NextRequest } from "next/server";
import { z } from "zod";
import { supabaseAdmin } from "@/lib/supabaseAdmin";
import { signVc } from "@/lib/jose";
import { getEnv } from "@/lib/env";

export const runtime = "nodejs";

const BodySchema = z.object({
  subjectId: z.string().optional(),
  vcType: z.array(z.string()).optional(),
  claims: z.record(z.string(), z.any()).optional(),
  expiresInDays: z.number().optional(),
});

export async function POST(req: NextRequest) {
  try {
    const json = await req.json();
    const parsed = BodySchema.safeParse(json);
    if (!parsed.success) {
      return Response.json(
        { error: "Body inválido", details: parsed.error.flatten() },
        { status: 400 },
      );
    }

    const { subjectId, vcType, claims, expiresInDays } = parsed.data;

    const apiKey = req.headers.get("x-api-key") || "";
    if (!apiKey) {
      return Response.json(
        { error: "Falta encabezado x-api-key" },
        { status: 401 },
      );
    }

    const { data: tenant, error: tenantErr } = await supabaseAdmin
      .from("tenants")
      .select("id")
      .eq("api_key", apiKey)
      .maybeSingle();
    if (tenantErr || !tenant) {
      return Response.json(
        { error: "API key inválida" },
        { status: 401 },
      );
    }

    const { data: creditData, error: creditErr } = await supabaseAdmin
      .from("tenant_credits")
      .select("credits")
      .eq("tenant_id", tenant.id)
      .maybeSingle();
    if (creditErr) {
      return Response.json(
        { error: creditErr.message },
        { status: 500 },
      );
    }
    const credits = creditData?.credits ?? 0;
    if (credits <= 0) {
      return Response.json(
        { error: "Sin créditos disponibles" },
        { status: 403 },
      );
    }

    const { issuerDid } = getEnv();
    const now = Math.floor(Date.now() / 1000);

    const vc = {
      "@context": ["https://www.w3.org/ns/credentials/v2"],
      type: ["VerifiableCredential", ...(vcType ?? ["BasicIDCredential"])],
      issuer: issuerDid,
      issuanceDate: new Date(now * 1000).toISOString(),
      credentialSubject: {
        ...(subjectId ? { id: subjectId } : {}),
        ...(claims ?? {}),
      },
    };

    const jwt = await signVc({ vc }, { expiresInDays });

    await supabaseAdmin
      .from("tenant_credits")
      .update({ credits: credits - 1 })
      .eq("tenant_id", tenant.id);

    const url = new URL(req.url);
    url.pathname = "/api/verify";
    url.searchParams.set("jwt", jwt);
    const verifyUrl = url.toString();

    return Response.json({ jwt, vc, verifyUrl });
  } catch (err: any) {
    return Response.json(
      { error: err?.message ?? "Error desconocido" },
      { status: 500 },
    );
  }
}
