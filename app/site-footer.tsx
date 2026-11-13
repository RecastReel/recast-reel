import Link from "next/link";
import { Logo } from "./logo";

export function SiteFooter() {
  return (
    <footer className="site-footer">
      <div className="site-footer-grid">
        <div className="site-footer-brand">
          <Logo />
          <p>Create videos, or put any character into yours.</p>
        </div>
        <nav aria-label="Product">
          <h2>Product</h2>
          <Link href="/studio">Studio</Link>
          <Link href="/#examples">Examples</Link>
          <Link href="/#pricing">Pricing</Link>
          <Link href="/#faq">FAQ</Link>
        </nav>
        <nav aria-label="Legal">
          <h2>Legal</h2>
          <Link href="/terms">Terms</Link>
          <Link href="/privacy">Privacy</Link>
          <Link href="/refunds">Refunds</Link>
        </nav>
        <nav aria-label="Company">
          <h2>Company</h2>
          <a href="mailto:support@recastreel.com">Contact</a>
          <a href="https://github.com/RecastReel/recast-reel">GitHub</a>
        </nav>
      </div>
      <div className="site-footer-base">
        <p>© {new Date().getFullYear()} Recast Reel</p>
        <p>
          Recast Reel is open source.{" "}
          <a href="https://github.com/RecastReel/recast-reel">
            View it on GitHub
          </a>
        </p>
      </div>
    </footer>
  );
}
