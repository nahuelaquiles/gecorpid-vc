// src/app/api/revoke/route.ts
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
  const { data } = await supabase.from("tenants").select("*").eq("domain", domain).maybeSingle();
  if (data) return data;
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

    const body = await req.json().catch(() => ({}));
    const cid: string | undefined = body?.cid;
    const reason: string | undefined = body?.reason;
    if (!cid) return NextResponse.json({ error: "cid is required" }, { status: 400 });

    const cur = await supabase.from("credentials").select("*").eq("cid", cid).maybeSingle();
    if (cur.error) throw cur.error;
    const cred = cur.data;
    if (!cred) return NextResponse.json({ error: "Credential not found" }, { status: 404 });
    if (cred.tenant_id !== tenant.id) return NextResponse.json({ error: "Forbidden" }, { status: 403 });

    const upd = await supabase.from("credentials")
      .update({ status: "revoked", revoked_at: new Date().toISOString(), reason: reason ?? null })
      .eq("cid", cid);
    if (upd.error) throw upd.error;

    return NextResponse.json({ ok: true }, { status: 200 });
  } catch (e: any) {
    console.error("[revoke]", e);
    return NextResponse.json({ error: e?.message || "Server error" }, { status: 500 });
  }
}
