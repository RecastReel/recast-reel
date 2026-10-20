import { NextRequest } from 'next/server';
import { handleBillingLink } from '../../../../lib/billing-api';
export const runtime = 'nodejs';
export const dynamic = 'force-dynamic';
export const POST = (req: NextRequest) => handleBillingLink(req, 'portal');
