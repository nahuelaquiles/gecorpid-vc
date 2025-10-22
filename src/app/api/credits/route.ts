// src/app/api/credits/route.ts
import { NextRequest, NextResponse } from "next/server";
import { createClient } from "@supabase/supabase-js";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

const SUPABASE_URL = process.env.SUPABASE_URL!;
const SUPABASE_SERVICE_ROLE = process.env.SUPABASE_SERVICE_ROLE!;

function hostFrom(req: NextRequest) {
  const h = req.headers.get("x-forwarded-host") || req.headers.get("host") || "";
  return h.split(",")[0].trim().toLowerCase().replace(/:\d+$/, "");
}
async function resolveTenantByHost(supabase: any, req: NextRequest) {
  const domain = hostFrom(req);
  if (!domain) return null;
  const { data } = await supabase.from("tenants").select("id,credits,domain").eq("domain", domain).maybeSingle();
  if (data) return data;
  const cookieVal = req.cookies.get("tenant_id")?.value || req.cookies.get("tenant_domain")?.value;
  if (cookieVal) {
    const r = await supabase.from("tenants")
      .select("id,credits,domain")
      .or(`id.eq.${cookieVal},domain.eq.${cookieVal}`)
      .maybeSingle();
    return r.data || null;
  }
  return null;
}

export async function GET(req: NextRequest) {
  try {
    const supabase = createClient(SUPABASE_URL, SUPABASE_SERVICE_ROLE);
    const tenant = await resolveTenantByHost(supabase, req);
    if (!tenant) return NextResponse.json({ error: "Tenant not found for host." }, { status: 401 });

    return NextResponse.json({ credits: tenant.credits ?? 0 }, { headers: { "Cache-Control": "no-store" } });
  } catch (e: any) {
    console.error("[credits]", e);
    return NextResponse.json({ error: e?.message || "Server error" }, { status: 500 });
  }
}
