import { NextRequest, NextResponse } from "next/server";
import { createClient } from "@supabase/supabase-js";
import { importJWK, JWK, KeyLike, SignJWT } from "jose";

// This route finalizes an issuance request by validating the ticket,
// consuming a credit, signing the VC as a JWT and storing the credential.

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

const SUPABASE_URL = process.env.SUPABASE_URL!;
const SUPABASE_SERVICE_ROLE = process.env.SUPABASE_SERVICE_ROLE!;
const ISSUER_DID = process.env.NEXT_PUBLIC_ISSUER_DID!;
const PRIVATE_JWK = process.env.ISSUER_PRIVATE_JWK!;
const JWK_KID = process.env.JWK_KID || undefined;
const DEFAULT_TENANT_ID = process.env.DEFAULT_TENANT_ID || null;

function hostFrom(req: NextRequest) {
  const h = req.headers.get("x-forwarded-host") || req.headers.get("host") || "";
  return h.split(",")[0].trim().toLowerCase().replace(/:\d+$/, "");
}

async function resolveTenant(supabase: any, req: NextRequest) {
  // Prefer the configured default tenant if defined
  if (DEFAULT_TENANT_ID) {
    const r = await supabase.from("tenants").select("*").eq("id", DEFAULT_TENANT_ID).maybeSingle();
    if (r.data) return r.data;
  }
  // Otherwise pick the first active tenant matching the host or the first active tenant
  const list = await supabase
    .from("tenants")
    .select("*")
    .eq("is_active", true)
    .order("created_at", { ascending: true })
    .limit(10);
  if (list.error) throw list.error;
  const rows: any[] = list.data || [];
  const host = hostFrom(req);
  const match = rows.find((t) => typeof t.domain === "string" && t.domain?.toLowerCase() === host);
  return match || rows[0] || null;
}

async function importPrivateEd25519(jwkJson: string): Promise<KeyLike> {
  if (!jwkJson) throw new Error("ISSUER_PRIVATE_JWK env is missing");
  const jwk = JSON.parse(jwkJson) as JWK;
  return importJWK(jwk, "EdDSA");
}

export async function POST(req: NextRequest) {
  try {
    const supabase = createClient(SUPABASE_URL, SUPABASE_SERVICE_ROLE);
    const tenant = await resolveTenant(supabase, req);
    if (!tenant) return NextResponse.json({ error: "Tenant not found (no active tenants)" }, { status: 401 });

    const body = await req.json().catch(() => ({}));
    const cid: string | undefined = body?.cid;
    const sha256: string | undefined = body?.sha256;
    const doc_type: string | undefined = body?.doc_type ?? "pdf";
    if (!cid || !sha256) return NextResponse.json({ error: "cid and sha256 are required" }, { status: 400 });

    // Validate issuance ticket
    const tk = await supabase.from("issue_tickets").select("*").eq("cid", cid).maybeSingle();
    if (tk.error) throw tk.error;
    const ticket = tk.data;
    if (!ticket) return NextResponse.json({ error: "Ticket not found" }, { status: 404 });
    if (ticket.used) return NextResponse.json({ error: "Ticket already used" }, { status: 409 });
    if (ticket.tenant_id !== tenant.id) return NextResponse.json({ error: "Forbidden" }, { status: 403 });
    if (ticket.expires_at && new Date(ticket.expires_at).getTime() < Date.now()) {
      return NextResponse.json({ error: "Ticket expired" }, { status: 410 });
    }

    // Consume a credit: try the RPC first; if missing or returns an error, fall back to manual update.
    {
      const { error: creditError } = await supabase.rpc("spend_credit", { tenant_id: tenant.id });
      if (creditError) {
        // fetch current credits and decrement
        const { data: creditRow, error: creditFetchError } = await supabase
          .from("tenant_credits")
          .select("credits")
          .eq("tenant_id", tenant.id)
          .maybeSingle();
        if (creditFetchError) throw creditFetchError;
        const newValue = Math.max(0, ((creditRow?.credits as number | null) ?? 0) - 1);
        const { error: updateError } = await supabase
          .from("tenant_credits")
          .update({ credits: newValue })
          .eq("tenant_id", tenant.id);
        if (updateError) throw updateError;
      }
    }

    // Sign the Verifiable Credential as a JWT using EdDSA
    const key = await importPrivateEd25519(PRIVATE_JWK);
    const now = Math.floor(Date.now() / 1000);
    const exp = now + 60 * 60 * 24 * 365; // 1 year expiry
    const payload: Record<string, any> = {
      iss: ISSUER_DID,
      sub: cid,
      nbf: now,
      iat: now,
      exp,
      vc: {
        "@context": ["https://www.w3.org/2018/credentials/v1"],
        type: ["VerifiableCredential", "DocumentHashCredential"],
        issuer: ISSUER_DID,
        issuanceDate: new Date().toISOString(),
        credentialSubject: { id: cid, cid, sha256, doc_type },
        evidence: [{ type: "LocalHashBinding", method: "SHA-256", cid, hash: sha256 }],
      },
    };

    const jwt = await new SignJWT(payload)
      .setProtectedHeader({ alg: "EdDSA", ...(JWK_KID ? { kid: JWK_KID } : {}) })
      .setIssuer(ISSUER_DID)
      .setSubject(cid)
      .setIssuedAt(now)
      .setExpirationTime(exp)
      .sign(key);

    // Save the credential and mark the ticket as used
    const ins = await supabase.from("credentials").insert({
      tenant_id: tenant.id,
      cid,
      sha256,
      vc_jwt: jwt,
      status: "active",
      issued_at: new Date().toISOString(),
      doc_type,
    });
    if (ins.error) throw ins.error;
    const upd = await supabase.from("issue_tickets").update({ used: true, sha256 }).eq("cid", cid);
    if (upd.error) throw upd.error;

    return NextResponse.json({ cid, vc_jwt: jwt }, { status: 200 });
  } catch (e: any) {
    console.error("[issue-final]", e);
    return NextResponse.json({ error: e?.message || "Server error" }, { status: 500 });
  }
}
