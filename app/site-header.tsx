import Link from 'next/link';
import { Logo } from './logo';

export function SiteHeader({ signedIn }: { signedIn: boolean }) {
 return (
  <header className="site-header">
   <Link href="/" className="site-logo" aria-label="Recast Reel home"><Logo /></Link>
   <nav className="site-links" aria-label="Main">
    <Link href="/#examples">Examples</Link>
    <Link href="/#features">Features</Link>
    <Link href="/#pricing">Pricing</Link>
    <Link href="/#faq">FAQ</Link>
   </nav>
   <nav className="site-actions" aria-label="Account">
    {signedIn
     ? <><Link href="/account">Account</Link><Link href="/studio" className="site-cta">Open studio</Link></>
     : <><Link href="/login">Sign in</Link><Link href="/login?mode=signup" className="site-cta">Start creating</Link></>}
   </nav>
  </header>
 );
}
