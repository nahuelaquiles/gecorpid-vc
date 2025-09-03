// src/app/api/files/list/route.ts
import { NextRequest, NextResponse } from "next/server";
import { createClient } from "@supabase/supabase-js";

type TenantRow = {
  id: string;
  api_key: string | null;
  is_active: boolean | null;
};

function readApiKey(req: NextRequest): string | null {
  const hdr = req.headers.get("x-api-key");
  if (hdr) return hdr.trim();
  const auth = req.headers.get("authorization") || req.headers.get("Authorization");
  if (auth && auth.toLowerCase().startsWith("bearer ")) return auth.slice(7).trim();
  const qp = req.nextUrl.searchParams.get("apiKey");
  if (qp) return qp.trim();
  return null;
}

export async function GET(req: NextRequest) {
  const SUPABASE_URL = process.env.SUPABASE_URL;
  const SUPABASE_SERVICE_ROLE = process.env.SUPABASE_SERVICE_ROLE;

  if (!SUPABASE_URL || !SUPABASE_SERVICE_ROLE) {
    return NextResponse.json({ error: "Supabase env vars not configured." }, { status: 500 });
  }

  const apiKey = readApiKey(req);
  if (!apiKey) {
    return NextResponse.json(
      { error: "Missing API key (x-api-key / Authorization: Bearer / ?apiKey=)." },
      { status: 401 }
    );
  }

  const supabase = createClient(SUPABASE_URL, SUPABASE_SERVICE_ROLE, {
    auth: { autoRefreshToken: false, persistSession: false },
  });

  try {
    // 1) Resolver tenant por api_key
    const tRes = await supabase
      .from("tenants")
      .select("id,api_key,is_active")
      .eq("api_key", apiKey)
      .maybeSingle();

    if (tRes.error) throw tRes.error;

    const tenant = tRes.data as unknown as TenantRow | null;
    if (!tenant || !tenant.id || tenant.is_active === false) {
      return NextResponse.json({ error: "Invalid API key." }, { status: 401 });
    }

    // 2) Limite
    const sp = req.nextUrl.searchParams;
    const lim = Math.min(Math.max(parseInt(sp.get("limit") || "20", 10) || 20, 1), 100);

    // 3) Traer archivos del tenant. Usamos select("*") para no fallar si no existe created_at.
    //    Ordenamos por id desc como fallback estable.
    const fRes = await supabase
      .from("files")
      .select("*")
      .eq("tenant_id", tenant.id)
      .order("id", { ascending: false })
      .limit(lim);

    if (fRes.error) throw fRes.error;

    const baseUrl = (process.env.NEXT_PUBLIC_SITE_URL || req.nextUrl.origin).replace(/\/$/, "");
    const bucket = "vcs";

    const items = (fRes.data as any[]).map((f) => {
      const originalUrl = f.original_path
        ? supabase.storage.from(bucket).getPublicUrl(f.original_path).data.publicUrl
        : null;
      const processedUrl = f.processed_path
        ? supabase.storage.from(bucket).getPublicUrl(f.processed_path).data.publicUrl
        : null;

      return {
        id: f.id as string,
        createdAt: typeof f.created_at !== "undefined" ? (f.created_at as string | null) : null,
        originalPath: (f.original_path as string) ?? null,
        processedPath: (f.processed_path as string) ?? null,
        originalUrl,
        processedUrl,
        verifyUrl: `${baseUrl}/v/${f.id}`,
      };
    });

    return NextResponse.json(
      { tenantId: tenant.id, count: items.length, limit: lim, items },
      { headers: { "Cache-Control": "no-store" } }
    );
  } catch (err: any) {
    return NextResponse.json({ error: err?.message || "Unexpected server error." }, { status: 500 });
  }
}
