// src/app/api/admin/list-tenants/route.ts
import { NextRequest, NextResponse } from "next/server";
import { createClient } from "@supabase/supabase-js";

type TenantRow = {
  id: string;
  name: string | null;
  email: string;
  api_key: string | null;
  is_active: boolean | null;
};

type CreditRow = {
  tenant_id: string;
  credits: number | null;
};

export async function GET(req: NextRequest) {
  const adminHeader = req.headers.get("x-admin-secret") || "";

  if (!process.env.ADMIN_SECRET) {
    return NextResponse.json(
      { error: "Missing ADMIN_SECRET on server." },
      { status: 500 }
    );
  }
  if (adminHeader !== process.env.ADMIN_SECRET) {
    return NextResponse.json({ error: "Unauthorized." }, { status: 401 });
  }

  const SUPABASE_URL = process.env.SUPABASE_URL;
  const SUPABASE_SERVICE_ROLE = process.env.SUPABASE_SERVICE_ROLE;

  if (!SUPABASE_URL || !SUPABASE_SERVICE_ROLE) {
    return NextResponse.json(
      { error: "Supabase env vars not configured." },
      { status: 500 }
    );
  }

  const supabase = createClient(SUPABASE_URL, SUPABASE_SERVICE_ROLE, {
    auth: { autoRefreshToken: false, persistSession: false },
  });

  try {
    // Tenants (ordenados por creación desc)
    const tenantsPromise = supabase
      .from("tenants")
      .select<"*,id,name,email,api_key,is_active">(
        "id,name,email,api_key,is_active"
      )
      .order("created_at", { ascending: false });

    // Créditos por tenant
    const creditsPromise = supabase
      .from("tenant_credits")
      .select<"*,tenant_id,credits">("tenant_id,credits");

    const [tenantsRes, creditsRes] = await Promise.all([
      tenantsPromise,
      creditsPromise,
    ]);

    if (tenantsRes.error) throw tenantsRes.error;
    if (creditsRes.error) throw creditsRes.error;

    const creditsMap = new Map<string, number>();
    (creditsRes.data as unknown as CreditRow[] | null)?.forEach((c) =>
      creditsMap.set(c.tenant_id, c.credits ?? 0)
    );

    const tenants = (tenantsRes.data as unknown as TenantRow[] | null)?.map(
      (t) => ({
        id: t.id,
        name: t.name,
        email: t.email,
        api_key: t.api_key,
        is_active: t.is_active,
        credits: creditsMap.get(t.id) ?? 0,
      })
    ) ?? [];

    return NextResponse.json(
      { tenants },
      { headers: { "Cache-Control": "no-store" } }
    );
  } catch (err: unknown) {
    const message = err instanceof Error ? err.message : "Unexpected server error.";
    return NextResponse.json({ error: message }, { status: 500 });
  }
}
