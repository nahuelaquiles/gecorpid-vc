// src/app/api/admin/create-tenant/route.ts
import { NextRequest, NextResponse } from 'next/server';
import { createClient } from '@supabase/supabase-js';

export const runtime = 'nodejs';
export const dynamic = 'force-dynamic';

// Supabase con service_role (solo servidor)
const SUPABASE_URL = process.env.SUPABASE_URL!;
const SUPABASE_SERVICE_ROLE = process.env.SUPABASE_SERVICE_ROLE!;
const ADMIN_SECRET = process.env.ADMIN_SECRET!;

const supabaseAdmin = createClient(SUPABASE_URL, SUPABASE_SERVICE_ROLE);

type Body = {
  email?: string;
  password?: string;
  credits?: number;
};

export async function POST(req: NextRequest) {
  try {
    // 1) Autorización admin por header
    const hdr = req.headers.get('x-admin-secret') || '';
    if (!ADMIN_SECRET || hdr !== ADMIN_SECRET) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    // 2) Leer body
    const { email, password, credits } = (await req.json()) as Body;

    if (!email || !password || typeof credits !== 'number') {
      return NextResponse.json(
        { error: 'Missing fields (email, password, credits:number)' },
        { status: 400 }
      );
    }

    // 3) Evitar duplicados por email
    const { data: existing, error: exErr } = await supabaseAdmin
      .from('tenants')
      .select('id')
      .eq('email', email)
      .maybeSingle<{ id: string }>();

    if (exErr) {
      return NextResponse.json({ error: exErr.message }, { status: 500 });
    }
    if (existing?.id) {
      return NextResponse.json({ error: 'Email already registered' }, { status: 409 });
    }

    // 4) Crear tenant
    const apiKey = `KEY_${(globalThis.crypto?.randomUUID?.() as string) || Date.now()}`;

    const { data: inserted, error: insErr } = await supabaseAdmin
      .from('tenants')
      .insert({
        email,
        password, // MVP: texto plano (luego lo cambiaremos por hash)
        api_key: apiKey,
        is_active: true,
      })
      .select('id, api_key')
      .single<{ id: string; api_key: string }>();

    if (insErr || !inserted) {
      return NextResponse.json(
        { error: insErr?.message || 'Failed to create tenant' },
        { status: 500 }
      );
    }

    // 5) Asignar créditos iniciales
    const { error: cErr } = await supabaseAdmin
      .from('tenant_credits')
      .insert({ tenant_id: inserted.id, credits });

    if (cErr) {
      // Si falla la inserción de créditos, dejamos creado el tenant, pero avisamos el fallo
      return NextResponse.json(
        { error: `Tenant created but credits failed: ${cErr.message}`, apiKey: inserted.api_key, tenantId: inserted.id },
        { status: 207 } // Multi-Status (informativo)
      );
    }

    // 6) Respuesta OK
    return NextResponse.json(
      { apiKey: inserted.api_key, tenantId: inserted.id },
      { headers: { 'Cache-Control': 'no-store' } }
    );
  } catch (e: any) {
    return NextResponse.json({ error: e?.message || 'Bad request' }, { status: 400 });
  }
}
