// src/app/api/login/route.ts
import { NextRequest, NextResponse } from 'next/server';
import { createClient } from '@supabase/supabase-js';

// Usa la service_role (solo servidor)
const SUPABASE_URL = process.env.SUPABASE_URL!;
const SUPABASE_SERVICE_ROLE = process.env.SUPABASE_SERVICE_ROLE!;

if (!SUPABASE_URL || !SUPABASE_SERVICE_ROLE) {
  throw new Error('Faltan SUPABASE_URL o SUPABASE_SERVICE_ROLE en el entorno del servidor.');
}

const supabaseAdmin = createClient(SUPABASE_URL, SUPABASE_SERVICE_ROLE);

type LoginBody = { email?: string; password?: string };
type TenantRow = { id: string; api_key: string; password: string };

export const runtime = 'nodejs';
export const dynamic = 'force-dynamic';

export async function POST(req: NextRequest) {
  try {
    const { email, password } = (await req.json()) as LoginBody;
    if (!email || !password) {
      return NextResponse.json({ error: 'Missing email or password' }, { status: 400 });
    }

    const { data: tenant, error } = await supabaseAdmin
      .from('tenants')
      .select('id, api_key, password')
      .eq('email', email)
      .single<TenantRow>();

    if (error || !tenant || tenant.password !== password) {
      return NextResponse.json({ error: 'Invalid credentials' }, { status: 401 });
    }

    return NextResponse.json(
      { apiKey: tenant.api_key, tenantId: tenant.id },
      { headers: { 'Cache-Control': 'no-store' } }
    );
  } catch {
    return NextResponse.json({ error: 'Bad request' }, { status: 400 });
  }
}
