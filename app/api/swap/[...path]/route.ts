import { NextRequest } from 'next/server';
import { handleSwap } from '../../../../lib/swap-api';
export const runtime = 'nodejs';
export const dynamic = 'force-dynamic';
export const maxDuration = 300;
async function handler(req: NextRequest, context: { params: Promise<{ path: string[] }> }) { return handleSwap(req, (await context.params).path); }
export { handler as GET, handler as POST };
