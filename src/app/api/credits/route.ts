// src/app/api/credits/route.ts
import { NextRequest, NextResponse } from "next/server";
import { createClient } from "@supabase/supabase-js";

type TenantRow = {
  id: string;
  api_key: string | null;
  is_active: boolean | null;
};

type CreditRow = {
  tenant_id: string;
  credits: number | null;
};

function readApiKey(req: NextRequest): string | null {
  // 1) Header x-api-key
  const fromHeader = req.headers.get("x-api-key");
  if (fromHeader) return fromHeader.trim();

  // 2) Authorization: Bearer <apiKey>
  const auth = req.headers.get("authorization") || req.headers.get("Authorization");
  if (auth && auth.toLowerCase().startsWith("bearer ")) {
    return auth.slice(7).trim();
  }

  // 3) Query param ?apiKey=...
  const search = req.nextUrl.searchParams.get("apiKey");
  if (search) return search.trim();

  return null;
}

export async function GET(req: NextRequest) {
  const SUPABASE_URL = process.env.SUPABASE_URL;
  const SUPABASE_SERVICE_ROLE = process.env.SUPABASE_SERVICE_ROLE;

  if (!SUPABASE_URL || !SUPABASE_SERVICE_ROLE) {
    return NextResponse.json(
      { error: "Supabase env vars not configured." },
      { status: 500 }
    );
  }

  const apiKey = readApiKey(req);
  if (!apiKey) {
    return NextResponse.json(
      {
        error:
          "Missing API key. Send it in 'x-api-key' header, 'Authorization: Bearer <key>', or '?apiKey=' query param.",
      },
      { status: 401 }
    );
  }

  const supabase = createClient(SUPABASE_URL, SUPABASE_SERVICE_ROLE, {
    auth: { autoRefreshToken: false, persistSession: false },
  });

  try {
    // 1) Buscar tenant por api_key
    const tenantRes = await supabase
      .from("tenants")
      .select<"id,api_key,is_active">("id,api_key,is_active")
      .eq("api_key", apiKey)
      .maybeSingle();

    if (tenantRes.error) throw tenantRes.error;

    const tenant = tenantRes.data as unknown as TenantRow | null;
    if (!tenant || !tenant.id || tenant.is_active === false) {
      return NextResponse.json({ error: "Invalid API key." }, { status: 401 });
    }

    // 2) Leer créditos
    const creditsRes = await supabase
      .from("tenant_credits")
      .select<"tenant_id,credits">("tenant_id,credits")
      .eq("tenant_id", tenant.id)
      .maybeSingle();

    if (creditsRes.error) throw creditsRes.error;

    const credits = (creditsRes.data as unknown as CreditRow | null)?.credits ?? 0;

    return NextResponse.json(
      {
        tenantId: tenant.id,
        credits,
      },
      { headers: { "Cache-Control": "no-store" } }
    );
  } catch (err: unknown) {
    const message = err instanceof Error ? err.message : "Unexpected server error.";
    return NextResponse.json({ error: message }, { status: 500 });
  }
}
