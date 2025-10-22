// src/app/api/issue-request/route.ts
import { NextRequest, NextResponse } from "next/server";
import { createClient } from "@supabase/supabase-js";
import { randomUUID, randomBytes } from "node:crypto";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

const SUPABASE_URL = process.env.SUPABASE_URL!;
const SUPABASE_SERVICE_ROLE = process.env.SUPABASE_SERVICE_ROLE!;
const FALLBACK_SITE = (process.env.NEXT_PUBLIC_SITE_URL || "").replace(/\/$/, "");
const DEFAULT_TENANT_ID = process.env.DEFAULT_TENANT_ID || null;

function hostFrom(req: NextRequest) {
  const h = req.headers.get("x-forwarded-host") || req.headers.get("host") || "";
  return h.split(",")[0].trim().toLowerCase().replace(/:\d+$/, "");
}

/** Single-tenant friendly resolver:
 *  1) DEFAULT_TENANT_ID (si está seteado)
 *  2) Primer tenant activo (y si existe columna domain y coincide con host, mejor)
 */
async function resolveTenant(supabase: any, req: NextRequest) {
  if (DEFAULT_TENANT_ID) {
    const r = await supabase.from("tenants").select("*").eq("id", DEFAULT_TENANT_ID).maybeSingle();
    if (r.data) return r.data;
  }
  // Traigo algunos activos y busco coincidencia por host si hubiera columna domain
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

    const origin = FALLBACK_SITE || req.nextUrl.origin;
    const verify_url = `${origin}/v/${cid}`;

    return NextResponse.json({ cid, verify_url, nonce }, { status: 200 });
  } catch (e: any) {
    console.error("[issue-request]", e);
    return NextResponse.json({ error: e?.message || "Server error" }, { status: 500 });
  }
}
