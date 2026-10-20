import Link from "next/link";

export function SiteFooter() {
  return (
    <footer className="site-footer">
      <nav aria-label="Legal">
        <Link href="/terms">Terms</Link>
        <Link href="/privacy">Privacy</Link>
        <a href="mailto:support@recastreel.com">Contact</a>
      </nav>
      <p className="site-footer-source">
        Recast Reel is open source.{" "}
        <a href="https://github.com/RecastReel/recast-reel">
          View it on GitHub
        </a>
      </p>
      <p>© {new Date().getFullYear()} Recast Reel </p>
    </footer>
  );
}
