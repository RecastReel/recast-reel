import Link from 'next/link';

export function SiteFooter() {
 return (
  <footer className="site-footer">
   <nav aria-label="Legal"><Link href="/terms">Terms</Link><Link href="/privacy">Privacy</Link><a href="mailto:support@recastreel.com">Contact</a></nav>
   <p>© {new Date().getFullYear()} Recast Reel · Powered by MadeByCue</p>
  </footer>
 );
}
