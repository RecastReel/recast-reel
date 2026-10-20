import { NextRequest, NextResponse } from 'next/server';
import { localSignInLink } from '../../../../lib/email';

/** Local runs only: the sign-in link that would have been emailed. Always
 * 404 in production or when Resend is configured. */
export function GET(req: NextRequest) {
 const url = localSignInLink(req.nextUrl.searchParams.get('email') || '');
 return url
  ? NextResponse.json({ url }, { headers: { 'Cache-Control': 'no-store' } })
  : NextResponse.json({ error: 'Not found' }, { status: 404 });
}
