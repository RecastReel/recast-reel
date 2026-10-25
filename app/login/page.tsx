import { redirect } from 'next/navigation';
import { Suspense } from 'react';
import { showSignInCodes } from '../../lib/config';
import { currentSession } from '../../lib/session';
import { AuthForm } from '../auth-form';
import { SiteHeader } from '../site-header';
import '../site.css';

export const dynamic = 'force-dynamic';

export default async function Page() {
 if (await currentSession().catch(() => null)) redirect('/studio');
 return (
  <div className="site">
   <SiteHeader signedIn={false} />
   <main className="auth-main"><Suspense><AuthForm showCodes={showSignInCodes()} /></Suspense></main>
  </div>
 );
}
