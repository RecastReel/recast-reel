import { currentSession } from '../lib/session';
import { SiteFooter } from './site-footer';
import { SiteHeader } from './site-header';
import './site.css';

export const LEGAL_UPDATED = 'October 19, 2026';
export const CONTACT = 'support@recastreel.com';

export async function LegalPage({ title, children }: { title: string; children: React.ReactNode }) {
 const signedIn = Boolean(await currentSession().catch(() => null));
 return (
  <div className="site">
   <SiteHeader signedIn={signedIn} />
   <main className="legal">
    <h1>{title}</h1>
    <p className="legal-updated">Last updated {LEGAL_UPDATED}</p>
    {children}
   </main>
   <SiteFooter />
  </div>
 );
}
