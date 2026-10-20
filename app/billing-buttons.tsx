'use client';

import { useRouter } from 'next/navigation';
import { useState } from 'react';
import { authClient } from '../lib/auth-client';

/** Opens Creem checkout for the single plan. */
export function SubscribeButton({ productId, label = 'Subscribe' }: { productId: string; label?: string }) {
 const [busy, setBusy] = useState(false);
 const [error, setError] = useState('');
 async function go() {
  setBusy(true); setError('');
  const { data, error } = await authClient.creem.createCheckout({ productId, successUrl: '/studio?subscribed=1' });
  if (error || !data?.url) { setBusy(false); setError(error?.message || 'Checkout is unavailable. Try again shortly.'); return; }
  window.location.assign(data.url);
 }
 return <>
  <button className="button-primary" disabled={busy || !productId} onClick={() => void go()}>{busy ? 'Opening checkout…' : label}</button>
  {error && <p className="form-error" role="alert">{error}</p>}
 </>;
}

/** Creem's customer portal: payment method, invoices, cancellation. */
export function ManageBillingButton() {
 const [busy, setBusy] = useState(false);
 const [error, setError] = useState('');
 async function go() {
  setBusy(true); setError('');
  const { data, error } = await authClient.creem.createPortal();
  if (error || !data?.url) { setBusy(false); setError(error?.message || 'Billing is unavailable. Try again shortly.'); return; }
  window.location.assign(data.url);
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
