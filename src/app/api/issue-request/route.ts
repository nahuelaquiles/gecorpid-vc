import { NextRequest, NextResponse } from "next/server";
import { createClient } from "@supabase/supabase-js";
import { randomUUID, randomBytes } from "node:crypto";

// This route creates an issuance ticket for one or more PDFs. The client
// subsequently uses the ticket to stamp the document, compute its hash and
// finalize issuance via /api/issue-final. Each call consumes no credits; only
// finalization does.

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

const SUPABASE_URL = process.env.SUPABASE_URL!;
const SUPABASE_SERVICE_ROLE = process.env.SUPABASE_SERVICE_ROLE!;
const DEFAULT_TENANT_ID = process.env.DEFAULT_TENANT_ID || null;
// Base site URL used for verification QR codes. Must not include a trailing slash.
const PUBLIC_SITE = (process.env.NEXT_PUBLIC_SITE_URL || "").replace(/\/$/, "");

function hostFrom(req: NextRequest) {
  const h = req.headers.get("x-forwarded-host") || req.headers.get("host") || "";
  return h.split(",")[0].trim().toLowerCase().replace(/:\d+$/, "");
}

/**
 * Resolve the current tenant from the request. If DEFAULT_TENANT_ID is set we
 * prefer it, otherwise choose the first active tenant optionally matching the
 * host domain.
 */
async function resolveTenant(supabase: any, req: NextRequest) {
  if (DEFAULT_TENANT_ID) {
    const r = await supabase.from("tenants").select("*").eq("id", DEFAULT_TENANT_ID).maybeSingle();
    if (r.data) return r.data;
  }
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

export async function POST(req: NextRequest) {
  try {
    const supabase = createClient(SUPABASE_URL, SUPABASE_SERVICE_ROLE);
    const tenant = await resolveTenant(supabase, req);
    if (!tenant) return NextResponse.json({ error: "Tenant not found (no active tenants)" }, { status: 401 });

    const cid = randomUUID();
    const nonce = randomBytes(16).toString("hex");
    const expiresAt = new Date(Date.now() + 30 * 60 * 1000).toISOString();

    const { error } = await supabase.from("issue_tickets").insert({
      tenant_id: tenant.id,
      cid,
      nonce,
      expires_at: expiresAt,
      used: false,
    });
    if (error) throw error;

    // Always build the verify URL against the public site. Never use the client
    // portal host here, otherwise PDFs would point back to an internal URL.
    const base = PUBLIC_SITE || req.nextUrl.origin.replace(/\/$/, "");
    const verify_url = `${base}/v/${cid}`;

    return NextResponse.json({ cid, verify_url, nonce }, { status: 200 });
  } catch (e: any) {
    console.error("[issue-request]", e);
    return NextResponse.json({ error: e?.message || "Server error" }, { status: 500 });
  }
}
