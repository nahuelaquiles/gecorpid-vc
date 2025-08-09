import { NextRequest, NextResponse } from 'next/server';
import { supabaseAdmin } from '@/lib/supabase';
import { v4 as uuidv4 } from 'uuid';

function isAdmin(req: NextRequest) {
  return req.cookies.get('admin')?.value === 'ok';
}

export async function POST(req: NextRequest) {
  if (!isAdmin(req)) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
  const { name, initialCredits } = await req.json();
  if (!name) return NextResponse.json({ error: 'Missing name' }, { status: 400 });

  const apiKey = `KEY_${uuidv4()}`;
  const { data: t, error: e1 } = await supabaseAdmin
    .from('tenants')
    .insert({ name, api_key: apiKey })
    .select()
    .single();
  if (e1) return NextResponse.json({ error: e1.message }, { status: 500 });

  const credits = Number(initialCredits || 0);
  const { error: e2 } = await supabaseAdmin
    .from('tenant_credits')
    .insert({ tenant_id: t.id, credits });
  if (e2) return NextResponse.json({ error: e2.message }, { status: 500 });

  return NextResponse.json({ tenant: t, apiKey });
}
