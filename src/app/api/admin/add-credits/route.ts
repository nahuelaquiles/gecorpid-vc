import { NextRequest, NextResponse } from 'next/server';
import { supabaseAdmin } from '@/lib/supabase';

function isAdmin(req: NextRequest) {
  return req.cookies.get('admin')?.value === 'ok';
}

export async function POST(req: NextRequest) {
  if (!isAdmin(req)) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });

  const { tenantId, amount } = await req.json();
  if (!tenantId || typeof amount !== 'number') {
    return NextResponse.json({ error: 'tenantId/amount required' }, { status: 400 });
  }

  const { data, error } = await supabaseAdmin
    .from('tenant_credits').select('credits').eq('tenant_id', tenantId).maybeSingle();
  if (error) return NextResponse.json({ error: error.message }, { status: 500 });

  const current = data?.credits ?? 0;
  const next = current + amount;

  const { error: e2 } = await supabaseAdmin
    .from('tenant_credits').upsert({ tenant_id: tenantId, credits: next });
  if (e2) return NextResponse.json({ error: e2.message }, { status: 500 });

  return NextResponse.json({ ok: true, credits: next });
}
