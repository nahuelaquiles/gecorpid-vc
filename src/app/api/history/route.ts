import { NextRequest, NextResponse } from "next/server";
import { createClient } from "@supabase/supabase-js";

// Returns a paginated list of issued credentials for the current tenant. Only
// basic metadata is returned: cid, sha256, status, issued_at, revoked_at and
// doc_type. The client portal uses this endpoint to render the history
// section. Pagination can be added in the future via query parameters.

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

    // Retrieve the most recent credentials for this tenant
    const { data, error } = await supabase
      .from("credentials")
      .select("cid, sha256, status, issued_at, revoked_at, doc_type")
      .eq("tenant_id", tenant.id)
      .order("issued_at", { ascending: false })
      .limit(50);
    if (error) throw error;

    return NextResponse.json({ history: data || [] }, { headers: { "Cache-Control": "no-store" } });
  } catch (e: any) {
    console.error("[history]", e);
    return NextResponse.json({ error: e?.message || "Server error" }, { status: 500 });
  }
}
