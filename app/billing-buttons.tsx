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
 const [amount, setAmount] = useState(25);
 const pack = CREDIT_PACKS.find((pack) => pack.usd === amount)!;
 const [busy, setBusy] = useState<number | null>(null);
 const [error, setError] = useState('');
 async function buy(amount: number) {
  if (busy !== null) return;
  setBusy(amount); setError('');
  const failed = await openBillingLink('checkout', 'Checkout is unavailable. Try again shortly.', amount);
  if (failed) { setBusy(null); setError(failed); }
 }
 return <div className="credit-packs price-card">
  <h3>Video credits</h3>
  <label className="credit-pack-label">Choose your credits
   <select value={amount} disabled={busy !== null} onChange={(event) => { setAmount(Number(event.target.value)); setError(''); }}>
    {CREDIT_PACKS.map((option) => <option key={option.usd} value={option.usd}>{option.usd} credits</option>)}
   </select>
  </label>
  <div className="price" aria-live="polite"><strong>{usd(pack.totalCents)}</strong><span>USD</span></div>
  <p className="credit-pack-fee">{usd(pack.creditCents)} credits + {usd(pack.feeCents)} service fee (22%).<br />Applicable tax added at checkout.</p>
  {signedIn ? <button className="button-primary" disabled={busy !== null} onClick={() => void buy(amount)}>{busy !== null ? 'Opening checkout…' : 'Buy credits'}</button> : <Link className="button-primary" href="/login?next=/account">Get started</Link>}
  <p className="credit-pack-note">No subscription. Credits don’t expire.</p>
  <Link className="credit-pack-policy" href="/refunds">Refund Policy</Link>
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
