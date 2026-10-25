import { NextRequest, NextResponse } from 'next/server';
import { localSignInCode } from '../../../../lib/email';

/** Development only; always 404 in production or when Resend is configured. */
export function GET(req: NextRequest) {
 const code = localSignInCode(req.nextUrl.searchParams.get('email') || '');
 return code
  ? NextResponse.json({ code }, { headers: { 'Cache-Control': 'no-store' } })
  : NextResponse.json({ error: 'Not found' }, { status: 404, headers: { 'Cache-Control': 'no-store' } });
}
