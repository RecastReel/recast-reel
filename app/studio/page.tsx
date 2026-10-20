import { redirect } from 'next/navigation';
import { PLAN, planStatus } from '../../lib/plan';
import { currentSession } from '../../lib/session';
import { SiteHeader } from '../site-header';
import { Studio } from './studio';
import '../site.css';

export const dynamic = 'force-dynamic';

export default async function StudioPage({ searchParams }: { searchParams: Promise<{ subscribed?: string }> }) {
 const session = await currentSession();
 if (!session) redirect('/login?next=/studio');
 const [plan, params] = await Promise.all([planStatus(session.user.id), searchParams]);
 return (
  <div className="site">
   <SiteHeader signedIn />
   <Studio initialPlan={plan} price={PLAN.priceUsd} subscribed={params.subscribed === '1'} />
  </div>
 );
}
