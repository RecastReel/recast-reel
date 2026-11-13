import Link from 'next/link';
import { Fragment } from 'react';
import { ArrowRight, Clock, Download, Film, Plus, ReceiptText, RotateCcw, Scissors, Sparkles, UserRound, Wallet } from 'lucide-react';
import { FAQ, SHOWCASE } from '../lib/catalog';
import { MONTHLY_CREDITS, MONTHLY_PRICE_USD } from '../lib/monthly-plan';
import { MonthlyPlanCard } from './billing-buttons';
import { currentSession } from '../lib/session';
import { LandingMotion } from './landing-motion';
import { LogoMark } from './logo';
import { ShowcaseCard } from './showcase';
import { SiteFooter } from './site-footer';
import { SiteHeader } from './site-header';
import './site.css';

export const dynamic = 'force-dynamic';

const FEATURES = [
 { icon: Clock, tone: 'blue', title: 'Close the tab.', text: 'Videos keep rendering and appear in your studio when they’re ready.' },
 { icon: ReceiptText, tone: 'violet', title: 'See the cost first.', text: 'Every video shows its credit cost before you start it.' },
 { icon: RotateCcw, tone: 'green', title: 'Failed videos are free.', text: 'If a video fails or is cancelled, its credits go straight back.' },
 { icon: Scissors, tone: 'amber', title: 'Trim before upload.', text: 'Cut a long clip down to the part you need, right in the browser.' },
 { icon: Wallet, tone: 'blue', title: 'Credits carry over.', text: 'Unused credits never expire, even if you stop subscribing.' },
 { icon: Download, tone: 'violet', title: 'Seven days to download.', text: 'Finished videos stay ready for a week. Save the ones you want.' },
] as const;

export default async function Landing() {
 const session = await currentSession().catch(() => null);
 const start = session ? '/studio' : '/login?mode=signup';
 return (
  <div className="site motion-pending">
   <SiteHeader signedIn={Boolean(session)} />
   <main>
    <section className="hero">
     <span className="hero-mark" data-intro="mark"><LogoMark size={52} /></span>
     <h1 data-intro="title" aria-label="Create videos. Swap any character."><Words text="Create videos." /><br /> <Words text="Swap any character." /></h1>
     <p data-intro="subhead">Describe a scene and generate it, with or without reference images. Or upload your own clip and put a new character in it while the motion, camera and lighting stay.</p>
     <div className="hero-actions" data-intro="cta">
      <Link href={start} className="button-primary button-large">Start creating</Link>
      <Link href="#pricing" className="button-text">See pricing <ArrowRight size={16} aria-hidden="true" /></Link>
     </div>
    </section>

    <section className="stage" aria-label="Studio preview" data-intro="stage">
     <StudioPreview />
    </section>

    <section id="examples" className="section" aria-labelledby="examples-title">
     <div className="section-head" data-reveal>
      <h2 id="examples-title">Same scene. New character.</h2>
      <p>Switch between the original and the swap. Everything but the person stays put.</p>
     </div>
     {SHOWCASE.length
      ? <div className="showcase-grid">{SHOWCASE.map((item) => <ShowcaseCard key={item.id} item={item} />)}</div>
      : <p className="section-note">New examples are on the way.</p>}
    </section>

    <section id="features" className="section" aria-labelledby="modes-title">
     <div className="section-head" data-reveal>
      <h2 id="modes-title">Two ways to make a video.</h2>
      <p>Start from words, or start from footage you already have.</p>
     </div>
     <div className="modes" data-reveal-group>
      <article className="mode-box">
       <div className="mode-visual mode-visual-generate" aria-hidden="true">
        <div className="mock-prompt">
         <span className="mock-prompt-text">A paper boat drifting down a rain-soaked street at dusk, slow dolly in, warm streetlight reflections</span>
         <span className="mock-row">
          <span className="mock-seg"><i>5s</i><i className="on">10s</i><i>15s</i></span>
          <span className="mock-seg"><i className="on">16:9</i><i>9:16</i><i>1:1</i></span>
          <span className="mock-go"><Sparkles size={14} /></span>
         </span>
        </div>
       </div>
       <h3><span className="pill pill-blue"><Sparkles size={14} aria-hidden="true" /> Generate</span></h3>
       <p><strong>Describe it.</strong> Write a 5, 10 or 15 second scene in landscape, portrait or square. Add up to four reference images, like a character, product or style, or none at all.</p>
      </article>
      <article className="mode-box">
       <div className="mode-visual mode-visual-swap" aria-hidden="true">
        <figure><video src="/showcase/source-video.mp4#t=2" muted playsInline preload="metadata" /><figcaption><Film size={12} /> Your clip</figcaption></figure>
        <Plus className="mode-op" size={16} />
        <figure className="mode-character"><img src="/showcase/character-reference.png" alt="" /><figcaption><UserRound size={12} /> Character</figcaption></figure>
        <ArrowRight className="mode-op" size={16} />
        <figure><img src="/showcase/character-swap.jpg" alt="" /><figcaption>Swapped</figcaption></figure>
       </div>
       <h3><span className="pill pill-violet"><UserRound size={14} aria-hidden="true" /> Swap</span></h3>
       <p><strong>Recast it.</strong> Upload a 40 second to 10 minute MP4 or MOV and pick a character. The motion, camera and lighting stay exactly as you shot them.</p>
      </article>
     </div>
     <ul className="feature-grid" data-reveal-group>
      {FEATURES.map(({ icon: Icon, tone, title, text }) => (
       <li key={title}>
        <span className={`feature-icon tone-${tone}`}><Icon size={18} aria-hidden="true" /></span>
        <p><strong>{title}</strong> {text}</p>
       </li>
      ))}
     </ul>
    </section>

    <section id="pricing" className="section" aria-labelledby="pricing-title">
     <div className="section-head" data-reveal>
      <h2 id="pricing-title">Pricing.</h2>
      <p>One plan. Pay for the videos you make, and keep what you don’t use.</p>
     </div>
     <div className="pricing" data-reveal>
      <div className="pricing-explainer">
       <h3>How credits work</h3>
       <p>The US${MONTHLY_PRICE_USD} plan adds {MONTHLY_CREDITS} credits each paid month. One credit is worth US$1 of video, and you see the exact cost before anything starts.</p>
       <dl className="rate-list">
        <div><dt>Generated video</dt><dd>~0.21 credits / sec</dd><span>A 10 second video is about 2.10 credits.</span></div>
        <div><dt>Character swap</dt><dd>from ~0.20 credits / sec</dd><span>A 90 second swap is about 18 credits.</span></div>
       </dl>
      </div>
      <MonthlyPlanCard signedIn={Boolean(session)} />
     </div>
    </section>

    <section id="faq" className="section faq-section" aria-labelledby="faq-title">
     <div className="section-head section-head-left" data-reveal>
      <h2 id="faq-title">Questions.</h2>
      <p>Can’t find an answer? <a href="mailto:support@recastreel.com">Email us</a>.</p>
     </div>
     <div className="faq" data-reveal-group>
      {FAQ.map((item) => <details key={item.q}><summary>{item.q}</summary><p>{item.a}</p></details>)}
     </div>
    </section>

    <section className="closing" aria-labelledby="closing-title">
     <h2 id="closing-title" aria-label="Your next scene starts here."><Words text="Your next scene starts here." /></h2>
     <p data-reveal>Describe it, or bring your own footage. Your first video is a few minutes away.</p>
     <Link href={start} className="button-primary button-large" data-reveal>Start creating</Link>
    </section>
   </main>
   <SiteFooter />
   <LandingMotion />
  </div>
 );
}

/** Each word in its own mask so it can rise or fade on its own. The heading
 * carries the full text as its label; the pieces are hidden from readers. */
function Words({ text }: { text: string }) {
 return text.split(' ').map((word, i) => <Fragment key={i}>{i > 0 && ' '}<span className="word" aria-hidden="true"><span>{word}</span></span></Fragment>);
}

/** A still mock of the studio, drawn with HTML so it stays sharp and themed. */
function StudioPreview() {
 return (
  <div className="window" role="img" aria-label="The Recast Reel studio: a character image and a source video, with the finished swap and a video being generated.">
   <div className="window-bar">
    <span className="window-dots"><i /><i /><i /></span>
    <span className="window-crumbs">Studio <span>/</span> Character swap</span>
   </div>
   <div className="window-body">
    <aside className="window-side">
     <span className="side-item"><i className="tone-blue"><Sparkles size={12} /></i>Create</span>
     <span className="side-item is-on"><i className="tone-violet"><UserRound size={12} /></i>Swap character</span>
     <span className="side-item"><i className="tone-amber"><Film size={12} /></i>Generate video</span>
     <span className="side-item"><i className="tone-green"><Download size={12} /></i>My videos</span>
     <span className="side-credits">62.40 credits left</span>
    </aside>
    <div className="window-main">
     <span className="window-title">What are you making today?</span>
     <span className="mock-seg mock-seg-lg"><i className="on">Swap character</i><i>Generate video</i></span>
     <div className="mock-composer">
      <div className="mock-tiles">
       <span className="mock-tile"><small>Character image</small><img src="/showcase/character-reference.png" alt="" /></span>
       <span className="mock-tile mock-tile-wide"><small>Source video</small><video src="/showcase/source-video.mp4#t=2" muted playsInline preload="metadata" /></span>
      </div>
      <p className="mock-prompt-text">Swap <mark>the man wearing a blue suit</mark> in the video with <mark>the old man in the reference image</mark>, matching the original motions.</p>
      <span className="mock-row mock-row-end"><span className="mock-cost">≈ 12.00 credits</span><span className="mock-go is-ready"><ArrowRight size={14} /></span></span>
     </div>
    </div>
    <div className="window-videos">
     <small className="window-label">My videos</small>
     <div className="mock-card">
      <img src="/showcase/character-swap.jpg" alt="" />
      <span className="mock-card-row"><b>Character swap · 1:00</b><span className="pill pill-green">Ready</span></span>
     </div>
     <div className="mock-card">
      <span className="mock-pending"><Sparkles size={16} /></span>
      <span className="mock-card-row"><b>Paper boat at dusk · 10s</b><span className="pill pill-blue">Generating</span></span>
      <span className="mock-bar"><span /></span>
     </div>
    </div>
   </div>
  </div>
 );
}
