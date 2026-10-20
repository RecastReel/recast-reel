'use client';

import { useRouter } from 'next/navigation';
import { useState } from 'react';
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

/** Opens Freemius checkout for the single plan. */
export function SubscribeButton({ label = 'Subscribe' }: { label?: string }) {
 const [busy, setBusy] = useState(false);
 const [error, setError] = useState('');
 async function go() {
  setBusy(true); setError('');
  const failed = await openBillingLink('checkout', 'Checkout is unavailable. Try again shortly.');
  if (failed) { setBusy(false); setError(failed); }
 }
 return <>
  <button className="button-primary" disabled={busy} onClick={() => void go()}>{busy ? 'Opening checkout…' : label}</button>
  {error && <p className="form-error" role="alert">{error}</p>}
 </>;
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
