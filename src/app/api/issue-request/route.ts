// src/app/api/issue-request/route.ts
import { NextRequest, NextResponse } from "next/server";
import { createClient } from "@supabase/supabase-js";
import { randomUUID, randomBytes } from "node:crypto";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

const SUPABASE_URL = process.env.SUPABASE_URL!;
const SUPABASE_SERVICE_ROLE = process.env.SUPABASE_SERVICE_ROLE!;
const FALLBACK_SITE = (process.env.NEXT_PUBLIC_SITE_URL || "").replace(/\/$/, "");

function hostFrom(req: NextRequest) {
  const h = req.headers.get("x-forwarded-host") || req.headers.get("host") || "";
  return h.split(",")[0].trim().toLowerCase().replace(/:\d+$/, "");
}

async function resolveTenantByHost(supabase: any, req: NextRequest) {
  const domain = hostFrom(req);
  if (!domain) return null;
  const { data } = await supabase.from("tenants").select("*").eq("domain", domain).maybeSingle();
  if (data) return data;
  // fallback cookie (admin portal may set it)
  const cookieVal = req.cookies.get("tenant_id")?.value || req.cookies.get("tenant_domain")?.value;
  if (cookieVal) {
    const r = await supabase.from("tenants")
      .select("*")
      .or(`id.eq.${cookieVal},domain.eq.${cookieVal}`)
      .maybeSingle();
    return r.data || null;
  }
  return null;
}

export async function POST(req: NextRequest) {
  try {
    const supabase = createClient(SUPABASE_URL, SUPABASE_SERVICE_ROLE);
    const tenant = await resolveTenantByHost(supabase, req);
    if (!tenant) return NextResponse.json({ error: "Tenant not found for host." }, { status: 401 });

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
