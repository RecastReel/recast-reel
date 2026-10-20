import { getAuth } from '../../../../lib/auth';
export const runtime = 'nodejs';
export const dynamic = 'force-dynamic';
async function handler(req: Request) { return (await getAuth()).handler(req); }
export { handler as GET, handler as POST };
