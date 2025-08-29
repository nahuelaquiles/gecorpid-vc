import { NextRequest } from 'next/server';
import { verifyJwt } from '@/lib/jose';

export const runtime = 'nodejs';

export async function POST(req: NextRequest) {
  try {
    const body = await req.json();
    const jwt = body?.jwt;
    if (!jwt || typeof jwt !== 'string') {
      return Response.json({ error: 'Missing or invalid jwt parameter' }, { status: 400 });
    }
    const { payload } = await verifyJwt(jwt);
    return Response.json({ valid: true, payload }, { status: 200 });
  } catch (err) {
    const message = err instanceof Error ? err.message : 'Unknown error';
    return Response.json({ valid: false, error: message }, { status: 400 });
  }
}
