import Link from 'next/link';
import { redirect } from 'next/navigation';
import { localMode } from '../../lib/config';
import { PLAN, planStatus } from '../../lib/plan';
import { currentSession } from '../../lib/session';
import { ManageBillingButton, SignOutButton, SubscribeButton } from '../billing-buttons';
import { SiteHeader } from '../site-header';
import '../site.css';

export const dynamic = 'force-dynamic';

export default async function Account() {
 const session = await currentSession();
 if (!session) redirect('/login?next=/account');
 const plan = await planStatus(session.user.id);
 const used = plan.billing ? Math.min(100, Math.round((plan.usedSeconds / plan.allowanceSeconds) * 100)) : 0;
 const date = plan.periodEnd ? new Date(plan.periodEnd).toLocaleDateString('en-US', { month: 'long', day: 'numeric' }) : null;
 return (
  <div className="site">
   <SiteHeader signedIn />
   <main className="account">
    <h1>Account</h1>
    <section className="panel">
     <h2>Profile</h2>
     {localMode() ? <p className="muted">Running locally as a single built-in user. There's no sign-in.</p> : <>
      <p>{session.user.email}</p>
      <SignOutButton />
     </>}
    </section>
    <section className="panel">
     <h2>Plan</h2>
     {!plan.billing ? <>
      <p className="muted">Running locally with billing off. Videos are charged to the MadeByCue API key in CUE_API_KEY.</p>
      <div className="panel-actions"><Link href="/studio" className="button-primary">Open studio</Link></div>
     </> : plan.active ? <>
      <p>Recast Reel · ${PLAN.priceUsd}/month{date && <><br /><span className="muted">{plan.cancelAtPeriodEnd ? `Ends on ${date}` : `Renews on ${date}`}</span></>}</p>
      <div className="usage" aria-label="Video seconds used this month">
       <div className="usage-bar"><span style={{ width: `${used}%` }} /></div>
       <p><strong>{plan.remainingSeconds} seconds</strong> of {plan.allowanceSeconds} left this month</p>
      </div>
      <div className="panel-actions"><Link href="/studio" className="button-primary">Open studio</Link><ManageBillingButton /></div>
     </> : <>
      <p className="muted">No active plan. Subscribe for {PLAN.seconds} seconds of video generation every month.</p>
      <div className="panel-actions"><SubscribeButton label={`Subscribe · $${PLAN.priceUsd}/month`} /></div>
     </>}
    </section>
   </main>
  </div>
 );
}
