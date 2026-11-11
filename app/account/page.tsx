import Link from 'next/link';
import { redirect } from 'next/navigation';
import { localMode } from '../../lib/config';
import { MONTHLY_CREDITS } from '../../lib/monthly-plan';
import { credits } from '../../lib/options';
import { planStatus } from '../../lib/plan';
import { currentSession } from '../../lib/session';
import { ManageBillingButton, SignOutButton, MonthlyPlanCard } from '../billing-buttons';
import { SiteHeader } from '../site-header';
import '../site.css';

export const dynamic = 'force-dynamic';

export default async function Account() {
 const session = await currentSession();
 if (!session) redirect('/login?next=/account');
 const plan = await planStatus(session.user.id);
 return (
  <div className="site">
   <SiteHeader signedIn />
   <main className="account">
    <h1>Account</h1>
    <section className="panel">
     <h2>Profile</h2>
     {localMode() ? <p className="muted">Running locally as a single built-in user. There's no sign-in.</p> : <>
      <div className="account-profile"><p>{session.user.email}</p><SignOutButton /></div>
     </>}
    </section>
    <section className="panel">
     <h2>Credits</h2>
     {!plan.billing ? <>
      <p className="muted">Running locally with billing off. Videos are charged to the MadeByCue API key in CUE_API_KEY.</p>
      <div className="panel-actions"><Link href="/studio" className="button-primary">Open studio</Link></div>
     </> : <>
      <div className="account-balance">
       <strong>{credits(plan.remainingCents)} left</strong>
       <p className="muted">Unused credits carry over.</p>
      </div>
      {plan.periodEnd ? <p>Monthly plan · {MONTHLY_CREDITS} credits each paid month</p> : <MonthlyPlanCard />}
      <div className="panel-actions"><Link href="/studio" className="button-quiet">Open studio</Link><ManageBillingButton /></div>
     </>}
    </section>
   </main>
  </div>
 );
}
