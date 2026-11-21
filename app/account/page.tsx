import { findCueKey } from '../../lib/cue-keys';
import { CueKeyForm } from './cue-key-form';
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
 const [plan, key] = await Promise.all([planStatus(session.user.id), findCueKey(session.user.id)]);
 return (
  <div className="site">
   <SiteHeader signedIn />
   <main className={plan.billing ? 'account account-hosted' : 'account'}>
    <h1>Account</h1>
    <section className="panel">
     <h2>Profile</h2>
     {localMode() ? <p className="muted">Running locally as a single built-in user. There's no sign-in.</p> : <>
      <div className="account-profile"><p>{session.user.email}</p><SignOutButton /></div>
     </>}
    </section>
    <section className="account-billing" id="billing" aria-labelledby="billing-heading">
     <h2 id="billing-heading">Billing</h2>
     <section className="panel" id="api-key">
      <h3 className="billing-option-title">Bring your own API key</h3>
      <p className="muted">This option is free in Recast Reel. MadeByCue, our video provider, bills you directly for generation.</p>
      <CueKeyForm saved={Boolean(key)} />
      <p className="cue-key-help muted">Need a key? <a href="https://www.madebycue.dev/keys" target="_blank" rel="noreferrer">Get one from MadeByCue ↗</a></p>
     </section>
     {plan.billing ? (
      <section className="panel" aria-label="Pro subscription">
       {plan.periodEnd ? <h3 className="billing-option-title">Pro subscription</h3> : <MonthlyPlanCard />}
       {(plan.periodEnd || plan.remainingCents > 0) && (
        <div className="account-balance">
         <strong>{credits(plan.remainingCents)} left</strong>
         <p className="muted">Unused credits carry over.</p>
        </div>
       )}
       {plan.periodEnd && <p>{MONTHLY_CREDITS} credits each paid month</p>}
       <div className="panel-actions"><ManageBillingButton /></div>
      </section>
     ) : (
      <section className="panel">
       <h3 className="billing-option-title">Local usage</h3>
       <p className="muted">Running locally with billing off. {key ? "New videos use your saved MadeByCue key." : "Videos use the MadeByCue key in CUE_API_KEY."}</p>
       <div className="panel-actions"><Link href="/studio" className="button-primary">Open studio</Link></div>
      </section>
     )}
    </section>
   </main>
  </div>
 );
}
