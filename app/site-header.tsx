import Link from 'next/link';
import { Logo } from './logo';

export function SiteHeader({ signedIn }: { signedIn: boolean }) {
 return (
  <header className="site-header">
   <Link href="/" className="site-logo" aria-label="Recast Reel home"><Logo /></Link>
   <nav aria-label="Main">
    <Link href="/#examples">Examples</Link>
    <Link href="/#pricing">Pricing</Link>
    {signedIn
     ? <><Link href="/account">Account</Link><Link href="/studio" className="site-cta">Open studio</Link></>
     : <><Link href="/login">Sign in</Link><Link href="/login" className="site-cta">Get started</Link></>}
   </nav>
  </header>
 );
}
