// src/app/api/verify-file/route.ts
import { NextRequest, NextResponse } from 'next/server';
import { createClient } from '@supabase/supabase-js';

export const runtime = 'nodejs';
export const dynamic = 'force-dynamic';

// Supabase con service_role (solo servidor)
const SUPABASE_URL = process.env.SUPABASE_URL!;
const SUPABASE_SERVICE_ROLE = process.env.SUPABASE_SERVICE_ROLE!;
const supabaseAdmin = createClient(SUPABASE_URL, SUPABASE_SERVICE_ROLE);

/**
 * API endpoint for verifying a PDF file by its id.
 *
 * This handler retrieves metadata about a file from the `files` table, resolves
 * public URLs for the stored PDFs from the `vcs` bucket, and looks up the
 * human‑friendly tenant name (issuer) from the `tenants` table when
 * available. The additional `tenantName` field allows the client UI to
 * present the issuer's name rather than just the numeric tenant id.
 */
export async function GET(req: NextRequest) {
  try {
    const id = req.nextUrl.searchParams.get('id');
    if (!id) {
      return NextResponse.json({ error: 'Missing id' }, { status: 400 });
    }

    // Fetch the file row; using `*` prevents failure if optional columns are missing.
    const { data: row, error } = await supabaseAdmin
      .from('files')
      .select('*')
      .eq('id', id)
      .single<any>();
    if (error || !row) {
      return NextResponse.json({ error: 'File not found' }, { status: 404 });
    }

    // Resolve the tenant name if a tenant id exists. This requires a second
    // query because the `tenants` table is not joined by default. We
    // gracefully handle missing rows or errors, leaving `tenantName` null.
    let tenantName: string | null = null;
    if (row.tenant_id) {
      const { data: tenant, error: tenantErr } = await supabaseAdmin
        .from('tenants')
        .select('name')
        .eq('id', row.tenant_id)
        .single<{ name: string }>();
      if (!tenantErr && tenant) {
        tenantName = tenant.name;
      }
    }

    // Build public URLs for the stored original and processed PDFs.
    const bucket = supabaseAdmin.storage.from('vcs');
    const originalPath: string = row.original_path;
    const processedPath: string | undefined = row.processed_path;
    const { data: o } = bucket.getPublicUrl(originalPath);
    const { data: p } = processedPath
      ? bucket.getPublicUrl(processedPath)
      : { data: undefined as any };

    return NextResponse.json(
      {
        id,
        tenantId: row.tenant_id ?? null,
        tenantName,
        originalUrl: o?.publicUrl ?? null,
        processedUrl: p?.publicUrl ?? null,
        createdAt: row.created_at ?? null
      },
      { headers: { 'Cache-Control': 'no-store' } }
    );
  } catch (e: any) {
    return NextResponse.json({ error: e?.message || 'Failed' }, { status: 500 });
  }
}
