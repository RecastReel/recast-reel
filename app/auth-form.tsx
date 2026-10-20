'use client';

import Link from 'next/link';
import { useSearchParams } from 'next/navigation';
import { useState } from 'react';
import { authClient } from '../lib/auth-client';

/** One passwordless form: the emailed link signs in or creates the account. */
export function AuthForm({ showLinks = false }: { showLinks?: boolean }) {
 const params = useSearchParams();
 const next = params.get('next');
 const destination = next?.startsWith('/') && !next.startsWith('//') ? next : '/studio';
 const expired = params.get('error');
 const [email, setEmail] = useState('');
 const [sent, setSent] = useState('');
 const [localLink, setLocalLink] = useState('');
 const [error, setError] = useState(expired ? 'That sign-in link has expired or was already used. Send a new one.' : '');
 const [busy, setBusy] = useState(false);

 async function submit(event: React.FormEvent) {
  event.preventDefault();
  setBusy(true); setError('');
  const { error } = await authClient.signIn.magicLink({ email: email.trim(), callbackURL: destination, errorCallbackURL: `/login?error=link&next=${encodeURIComponent(destination)}` });
  setBusy(false);
  if (error) { setError(error.message || 'Could not send the link. Try again.'); return; }
  setSent(email.trim());
  if (showLinks) {
   const res = await fetch(`/api/dev/sign-in-link?email=${encodeURIComponent(email.trim())}`, { cache: 'no-store' }).catch(() => null);
   if (res?.ok) setLocalLink((await res.json() as { url: string }).url);
  }
 }

 if (sent) return (
  <div className="auth-card" role="status">
   {localLink ? <>
    <h1>Your sign-in link</h1>
    <p>Running locally without email, so here is the link for <strong>{sent}</strong>.</p>
    <a className="button-primary" href={localLink}>Sign in</a>
   </> : <>
    <h1>Check your email</h1>
    <p>We sent a sign-in link to <strong>{sent}</strong>. It expires in 15 minutes.</p>
   </>}
   <button className="button-link" onClick={() => { setSent(''); setLocalLink(''); }}>Use a different email</button>
  </div>
 );

 return (
  <form className="auth-card" onSubmit={(e) => void submit(e)}>
   <h1>Sign in to Recast Reel</h1>
   <p>{showLinks ? 'Enter your email to get a sign-in link.' : 'Enter your email and we’ll send you a link.'} New here? The same link creates your account.</p>
   <label>Email<input type="email" required autoFocus value={email} onChange={(e) => setEmail(e.target.value)} autoComplete="email" /></label>
   {error && <p className="form-error" role="alert">{error}</p>}
   <button className="button-primary" disabled={busy}>{busy ? 'Sending…' : showLinks ? 'Get a sign-in link' : 'Email me a sign-in link'}</button>
   <p className="auth-legal">By continuing you agree to the <Link href="/terms">Terms</Link> and <Link href="/privacy">Privacy Policy</Link>.</p>
  </form>
 );
}
