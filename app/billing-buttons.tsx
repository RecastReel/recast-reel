'use client';

import { useRouter } from 'next/navigation';
import { useState } from 'react';
import Link from 'next/link';
import { Check } from 'lucide-react';
import { MONTHLY_CREDITS, MONTHLY_PRICE_USD } from '../lib/monthly-plan';
import { authClient } from '../lib/auth-client';

/** Asks the server for a Freemius link (checkout or customer portal) and opens it. */
async function openBillingLink(kind: 'checkout' | 'portal', fallback: string) {
 try {
  const res = await fetch(`/api/billing/${kind}`, { method: 'POST' });
  const data = await res.json() as { url?: string; error?: string };
  if (!res.ok || !data.url) return data.error || fallback;
  window.location.assign(data.url);
 } catch {
  return fallback;
 }
}

const PLAN_FEATURES = ['Video generation up to 15 seconds', 'Character swaps on videos up to 10 minutes long', '7 days to download finished videos', 'Customer support by email'];

export function MonthlyPlanCard({ signedIn = true }: { signedIn?: boolean }) {
 const [busy, setBusy] = useState(false);
 const [error, setError] = useState('');
 async function subscribe() {
  if (busy) return;
  setBusy(true);
  setError('');
  const failed = await openBillingLink('checkout', 'Checkout is unavailable. Try again shortly.');
  if (failed) { setBusy(false); setError(failed); }
 }
 return <div className="price-card">
  <h3>Pro</h3>
  <div className="price"><strong>${MONTHLY_PRICE_USD}</strong><span> USD / month</span></div>
  <p className="price-lead">{MONTHLY_CREDITS} credits each paid month</p>
  <ul>
   {PLAN_FEATURES.map((f) => <li key={f}><Check size={16} aria-hidden="true" />{f}</li>)}
  </ul>
  {signedIn ? <button className="button-primary" disabled={busy} onClick={() => void subscribe()}>{busy ? 'Opening checkout…' : 'Subscribe'}</button> : <Link className="button-primary" href="/login?next=/account">Get started</Link>}
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
