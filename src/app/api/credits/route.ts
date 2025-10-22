// src/app/api/credits/route.ts
import { NextRequest, NextResponse } from "next/server";
import { createClient } from "@supabase/supabase-js";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

const SUPABASE_URL = process.env.SUPABASE_URL!;
const SUPABASE_SERVICE_ROLE = process.env.SUPABASE_SERVICE_ROLE!;
const DEFAULT_TENANT_ID = process.env.DEFAULT_TENANT_ID || null;

function hostFrom(req: NextRequest) {
  const h = req.headers.get("x-forwarded-host") || req.headers.get("host") || "";
  return h.split(",")[0].trim().toLowerCase().replace(/:\d+$/, "");
}

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

export async function GET(req: NextRequest) {
  try {
    const supabase = createClient(SUPABASE_URL, SUPABASE_SERVICE_ROLE);
    const tenant = await resolveTenant(supabase, req);
    if (!tenant) return NextResponse.json({ error: "Tenant not found (no active tenants)" }, { status: 401 });

    // créditos en tenant_credits
    const { data, error } = await supabase
      .from("tenant_credits")
      .select("credits")
      .eq("tenant_id", tenant.id)
      .maybeSingle();
    if (error) throw error;

    return NextResponse.json({ credits: data?.credits ?? 0 }, { headers: { "Cache-Control": "no-store" } });
  } catch (e: any) {
    console.error("[credits]", e);
    return NextResponse.json({ error: e?.message || "Server error" }, { status: 500 });
  }
}
