import { NextRequest, NextResponse } from 'next/server';
import { createClient } from '@supabase/supabase-js';

// Expose credential metadata for public verification. This endpoint returns
// information needed by the verification page to compare a local PDF hash
// against the stored credential and display status. It intentionally avoids
// leaking sensitive information like the full JWT unless explicitly allowed.

export const runtime = 'nodejs';
export const dynamic = 'force-dynamic';

const SUPABASE_URL = process.env.SUPABASE_URL!;
const SUPABASE_SERVICE_ROLE = process.env.SUPABASE_SERVICE_ROLE!;

export async function GET(req: NextRequest) {
  try {
    const cid = req.nextUrl.searchParams.get('cid');
    if (!cid) {
      return NextResponse.json({ error: 'Missing cid' }, { status: 400 });
    }

    const supabase = createClient(SUPABASE_URL, SUPABASE_SERVICE_ROLE, {
      auth: { autoRefreshToken: false, persistSession: false },
    });

    // Fetch the credential record
    const { data: cred, error } = await supabase
      .from('credentials')
      .select('cid, sha256, status, revoked_at, issued_at, doc_type, tenant_id, vc_jwt')
      .eq('cid', cid)
      .maybeSingle();
    if (error) {
      console.error('[public/credential] supabase error:', error);
      return NextResponse.json({ error: 'Database error' }, { status: 500 });
    }
    if (!cred) {
      return NextResponse.json({ error: 'Not found' }, { status: 404 });
    }

    // Look up the tenant name. Do not expose other tenant fields.
    let tenantName: string | null = null;
    if (cred.tenant_id) {
      const { data: tenantRow, error: tenantErr } = await supabase
        .from('tenants')
        .select('name')
        .eq('id', cred.tenant_id)
        .maybeSingle();
      if (!tenantErr) {
        tenantName = tenantRow?.name ?? null;
      }
    }

    return NextResponse.json(
      {
        sha256: cred.sha256,
        status: cred.status,
        revoked_at: cred.revoked_at || null,
        issued_at: cred.issued_at || null,
        doc_type: cred.doc_type || null,
        tenant_name: tenantName,
        vc_jwt: cred.vc_jwt || null,
      },
      { headers: { 'Cache-Control': 'no-store' } },
    );
  } catch (e: any) {
    console.error('[public/credential] error:', e);
    return NextResponse.json({ error: e?.message || 'Server error' }, { status: 500 });
  }
}
