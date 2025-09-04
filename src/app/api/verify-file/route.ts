// src/app/api/verify-file/route.ts
import { NextRequest, NextResponse } from 'next/server';
import { createClient } from '@supabase/supabase-js';

export const runtime = 'nodejs';
export const dynamic = 'force-dynamic';

// Supabase con service_role (solo servidor)
const SUPABASE_URL = process.env.SUPABASE_URL!;
const SUPABASE_SERVICE_ROLE = process.env.SUPABASE_SERVICE_ROLE!;
const supabaseAdmin = createClient(SUPABASE_URL, SUPABASE_SERVICE_ROLE);

interface FileRow {
  original_path: string;
  processed_path?: string | null;
  tenant_id?: string | null;
  created_at?: string | null;
}

export async function GET(req: NextRequest) {
  try {
    const id = req.nextUrl.searchParams.get('id');
    if (!id) {
      return NextResponse.json({ error: 'Missing id' }, { status: 400 });
    }

    // Buscamos la fila en "files". Usamos "*" para no fallar si faltan columnas opcionales.
    const { data: row, error } = await supabaseAdmin
      .from('files')
      .select('*')
      .eq('id', id)
      .single<FileRow>();

    if (error || !row) {
      return NextResponse.json({ error: 'File not found' }, { status: 404 });
    }

    // Obtenemos URLs públicas desde el bucket "vcs"
    const bucket = supabaseAdmin.storage.from('vcs');
    const originalPath: string = row.original_path;
    const processedPath: string | undefined = row.processed_path;

    const { data: o } = bucket.getPublicUrl(originalPath);
    type PublicUrl = { publicUrl: string };
    const { data: p } = processedPath
      ? bucket.getPublicUrl(processedPath)
      : { data: undefined as PublicUrl | undefined };

    return NextResponse.json(
      {
        id,
        tenantId: row.tenant_id ?? null,
        originalUrl: o?.publicUrl ?? null,
        processedUrl: p?.publicUrl ?? null,
        createdAt: row.created_at ?? null
      },
      { headers: { 'Cache-Control': 'no-store' } }
    );
  } catch (e: unknown) {
    const message = e instanceof Error ? e.message : 'Failed';
    return NextResponse.json({ error: message }, { status: 500 });
  }
}
