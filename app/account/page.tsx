import Link from 'next/link';
import { redirect } from 'next/navigation';
import { localMode } from '../../lib/config';
import { credits } from '../../lib/options';
import { planStatus } from '../../lib/plan';
import { currentSession } from '../../lib/session';
import { ManageBillingButton, SignOutButton, CreditPacks } from '../billing-buttons';
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
      <p>{session.user.email}</p>
      <SignOutButton />
     </>}
    </section>
    <section className="panel">
     <h2>Credits · pay as you go</h2>
     {!plan.billing ? <>
      <p className="muted">Running locally with billing off. Videos are charged to the MadeByCue API key in CUE_API_KEY.</p>
      <div className="panel-actions"><Link href="/studio" className="button-primary">Open studio</Link></div>
     </> : <>
      <p><strong>{credits(plan.remainingCents)} left</strong></p>
      <p className="muted">Top up whenever you need. Your credits don’t expire.</p>
      <CreditPacks />
      <div className="panel-actions"><Link href="/studio" className="button-quiet">Open studio</Link><ManageBillingButton /></div>
     </>}

    </section>
   </main>
  </div>
 );
}
