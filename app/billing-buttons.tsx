'use client';

import { useRouter } from 'next/navigation';
import { useState } from 'react';
import Link from 'next/link';
import { CREDIT_PACKS, usd } from '../lib/credit-packs';
import { authClient } from '../lib/auth-client';

/** Asks the server for a Freemius link (checkout or customer portal) and opens it. */
async function openBillingLink(kind: 'checkout' | 'portal', fallback: string, amount?: number) {
 try {
  const res = await fetch(`/api/billing/${kind}`, { method: 'POST', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify({ amount }) });
  const data = await res.json() as { url?: string; error?: string };
  if (!res.ok || !data.url) return data.error || fallback;
  window.location.assign(data.url);
 } catch {
  return fallback;
 }
}

/** One-time purchases, with the entire pre-tax price disclosed. */
export function CreditPacks({ signedIn = true }: { signedIn?: boolean }) {
 const [busy, setBusy] = useState<number | null>(null);
 const [error, setError] = useState('');
 async function buy(amount: number) {
  if (busy !== null) return;
  setBusy(amount); setError('');
  const failed = await openBillingLink('checkout', 'Checkout is unavailable. Try again shortly.', amount);
  if (failed) { setBusy(null); setError(failed); }
 }
 return <div className="credit-packs">
  <div className="credit-pack-grid">{CREDIT_PACKS.map((pack) => <div className="price-card" key={pack.usd}>
   <h3>{pack.usd} credits</h3>
   <p>{usd(pack.creditCents)} in video credits</p>
   <p>Service fee (22%): {usd(pack.feeCents)}</p>
   <p><strong>{usd(pack.totalCents)} USD</strong> before tax</p>
   {signedIn ? <button className="button-primary" disabled={busy !== null} onClick={() => void buy(pack.usd)}>{busy === pack.usd ? 'Opening checkout…' : `Buy ${pack.usd} credits`}</button> : <Link className="button-primary" href="/login?next=/account">Get started</Link>}
  </div>)}</div>
  <p className="muted">One-time payment. No subscription. One credit = US$1 of video. Unused credits don’t expire. Applicable taxes calculated at checkout.</p>
  <p className="auth-legal">Successfully consumed credits are non-refundable. See our <Link href="/refunds">Refund Policy</Link>.</p>
  {error && <p className="form-error" role="alert">{error}</p>}
 </div>;
}

/** Freemius' customer portal: payment method, invoices, cancellation. */
export function ManageBillingButton() {
 const [busy, setBusy] = useState(false);
 const [error, setError] = useState('');
 async function go() {
  setBusy(true); setError('');
  const failed = await openBillingLink('portal', 'Billing is unavailable. Try again shortly.');
  if (failed) { setBusy(false); setError(failed); }
 }
 return <>
  <button className="button-quiet" disabled={busy} onClick={() => void go()}>{busy ? 'Opening…' : 'Manage billing'}</button>
  {error && <p className="form-error" role="alert">{error}</p>}
 </>;
}

export function SignOutButton() {
 const router = useRouter();
 return <button className="button-link" onClick={() => void authClient.signOut().then(() => { router.replace('/'); router.refresh(); })}>Sign out</button>;
}
