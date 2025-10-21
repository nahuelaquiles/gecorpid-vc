// src/app/api/public/credential/route.ts
import { NextRequest, NextResponse } from 'next/server';
import { createClient } from '@supabase/supabase-js';

export const runtime = 'nodejs';
export const dynamic = 'force-dynamic';

// Server-only Supabase client with service role (safe here: this code runs on the server)
const SUPABASE_URL = process.env.SUPABASE_URL!;
const SUPABASE_SERVICE_ROLE = process.env.SUPABASE_SERVICE_ROLE!;

/**
 * Public verification metadata:
 *   GET /api/public/credential?cid=XXXX
 * Returns: { cid, sha256, status, revoked_at? } if found, or 404 if not.
 * Only minimal info is exposed so users can verify locally on /v/[cid].
 */
export async function GET(req: NextRequest) {
  try {
    const cid = req.nextUrl.searchParams.get('cid');
    if (!cid) {
      return NextResponse.json({ error: 'Missing cid' }, { status: 400 });
    }

    const supabase = createClient(SUPABASE_URL, SUPABASE_SERVICE_ROLE, {
      auth: { autoRefreshToken: false, persistSession: false },
    });

    const { data, error } = await supabase
      .from('credentials')
      .select('cid, sha256, status, revoked_at')
      .eq('cid', cid)
      .maybeSingle();

    if (error) {
      console.error('[public/credential] supabase error:', error);
      return NextResponse.json({ error: 'Database error' }, { status: 500 });
    }
    if (!data) {
      return NextResponse.json({ error: 'Not found' }, { status: 404 });
    }

    return NextResponse.json(
      {
        cid: data.cid,
        sha256: data.sha256,
        status: data.status,        // 'active' | 'revoked' | etc.
        revoked_at: data.revoked_at || null,
      },
      { headers: { 'Cache-Control': 'no-store' } }
    );
  } catch (e: any) {
    console.error('[public/credential] error:', e);
    return NextResponse.json({ error: e?.message || 'Server error' }, { status: 500 });
  }
}
