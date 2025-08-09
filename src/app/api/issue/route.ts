import { NextRequest, NextResponse } from 'next/server';
import { z } from 'zod';
import { supabaseAdmin } from '@/lib/supabase';
import { signVC } from '@/lib/jose';

const BodySchema = z.object({
  subjectId: z.string().min(1),
  vcType: z.array(z.string()).optional(),
  claims: z.record(z.any()).optional(),
  expiresInDays: z.number().int().positive().optional(),
});

async function getTenantByApiKey(apiKey: string) {
  const { data, error } = await supabaseAdmin
    .from('tenants')
    .select('*')
    .eq('api_key', apiKey)
    .eq('is_active', true)
    .maybeSingle();
  if (error) throw error;
  return data;
}

async function getCredits(tenant_id: string) {
  const { data, error } = await supabaseAdmin
    .from('tenant_credits')
    .select('credits')
    .eq('tenant_id', tenant_id)
    .maybeSingle();
  if (error) throw error;
  return data?.credits ?? 0;
}

export async function POST(req: NextRequest) {
  try {
    const apiKey = req.headers.get('x-api-key');
    if (!apiKey) return NextResponse.json({ error: 'Missing x-api-key' }, { status: 401 });

    const tenant = await getTenantByApiKey(apiKey);
    if (!tenant) return NextResponse.json({ error: 'Invalid tenant or inactive' }, { status: 401 });

    const body = await req.json();
    const parsed = BodySchema.safeParse(body);
    if (!parsed.success) return NextResponse.json({ error: parsed.error.flatten() }, { status: 400 });

    const credits = await getCredits(tenant.id);
    if (credits <= 0) return NextResponse.json({ error: 'No credits left' }, { status: 402 });

    const { jwt, jti, exp } = await signVC({
      subjectId: parsed.data.subjectId,
      vcType: parsed.data.vcType,
      claims: parsed.data.claims,
      expiresInDays: parsed.data.expiresInDays,
    });

    const { error: decErr } = await supabaseAdmin.rpc('decrement_credit', { p_tenant_id: tenant.id });
    if (decErr) {
      const msg = String(decErr.message || '');
      const status = msg.includes('NO_CREDITS') ? 402 : 500;
      return NextResponse.json({ error: msg }, { status });
    }

    await supabaseAdmin.from('vc_issuance_log').insert({
      tenant_id: tenant.id,
      vc_jti: jti,
      subject_id: parsed.data.subjectId,
      vc_type: parsed.data.vcType ?? [],
    });

    const base = process.env.NEXT_PUBLIC_BASE_URL || '';
    const verifyUrl = `${base}/verify?vc=${encodeURIComponent(jwt)}`;

    return NextResponse.json({
      vc_jwt: jwt,
      verify_url: verifyUrl,
      exp,
      remaining_credits: (credits - 1),
    });
  } catch (err: any) {
    const msg = String(err?.message || err);
    const status = msg.includes('NO_CREDITS') ? 402 : 500;
    return NextResponse.json({ error: msg }, { status });
  }
}
