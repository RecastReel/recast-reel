import Link from 'next/link';
import { FAQ, SHOWCASE } from '../lib/catalog';
import { credits } from '../lib/options';
import { PLAN } from '../lib/plan';
import { currentSession } from '../lib/session';
import { ShowcaseCard } from './showcase';
import { SiteFooter } from './site-footer';
import { SiteHeader } from './site-header';
import './site.css';

export const dynamic = 'force-dynamic';

export default async function Landing() {
 const session = await currentSession().catch(() => null);
 const start = session ? '/studio' : '/login';
 return (
  <div className="site">
   <SiteHeader signedIn={Boolean(session)} />
   <main>
    <section className="hero">
     <h1>Create videos, or put any character into yours.</h1>
     <p>Describe a video and generate it, with or without reference images. Or upload a clip and swap in a new character while the motion, camera and lighting stay.</p>
     <div className="hero-actions">
      <Link href={start} className="button-primary">Start creating</Link>
      <Link href="#pricing" className="button-quiet">See pricing</Link>
     </div>
    </section>

    <section id="examples" className="section" aria-labelledby="examples-title">
     <h2 id="examples-title">See it in action</h2>
     {SHOWCASE.length
      ? <div className="showcase-grid">{SHOWCASE.map((item) => <ShowcaseCard key={item.id} item={item} />)}</div>
      : <p className="section-note">New examples are on the way.</p>}
    </section>

    <section className="section" aria-labelledby="how-title">
     <h2 id="how-title">How it works</h2>
     <ol className="steps">
      <li><strong>Generate a video</strong><span>Describe a 5, 10 or 15 second scene. Add up to four reference images, like a character or product, or none at all.</span></li>
      <li><strong>Or swap a character</strong><span>Upload a 40 second to 10 minute MP4 or MOV and pick a character. The motion, camera and lighting stay.</span></li>
      <li><strong>Download it</strong><span>Close the tab while it works; your video appears in your studio when it’s ready.</span></li>
     </ol>
    </section>

    <section id="pricing" className="section" aria-labelledby="pricing-title">
     <h2 id="pricing-title">One simple plan</h2>
     <div className="price-card">
      <div className="price"><strong>${PLAN.priceUsd}</strong><span>/month</span></div>
      <p className="price-lead">{credits(PLAN.creditCents)} every month</p>
      <ul>
       <li>Character swaps for any video from 40 seconds to 10 minutes</li>
       <li>Video generation</li>
       <li>Customer support</li>
      </ul>
      <Link href={start} className="button-primary">{session ? 'Open studio' : 'Get started'}</Link>
     </div>
    </section>

    <section className="section" aria-labelledby="faq-title">
     <h2 id="faq-title">Questions</h2>
     <div className="faq">
      {FAQ.map((item) => <details key={item.q}><summary>{item.q}</summary><p>{item.a}</p></details>)}
     </div>
    </section>
   </main>
   <SiteFooter />
  </div>
 );
}
