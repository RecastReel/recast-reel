'use client';

import Link from 'next/link';
import { useSearchParams } from 'next/navigation';
import { useEffect, useState } from 'react';
import { authClient } from '../lib/auth-client';

/** Email, then a single-use code. The same flow also creates new accounts. */
export function AuthForm({ showCodes = false }: { showCodes?: boolean }) {
 const params = useSearchParams();
 const next = params.get('next');
 const destination = next?.startsWith('/') && !next.startsWith('//') && !/[\\\x00-\x1f]/.test(next) ? next : '/studio';
 const [email, setEmail] = useState('');
 const [sent, setSent] = useState('');
 const [code, setCode] = useState('');
 const [localCode, setLocalCode] = useState('');
 const [error, setError] = useState('');
 const [busy, setBusy] = useState(false);
 const [resendIn, setResendIn] = useState(0);
 const [notice, setNotice] = useState('');

 useEffect(() => {
  if (resendIn <= 0) return;
  const timer = setTimeout(() => setResendIn((n) => Math.max(0, n - 1)), 1000);
  return () => clearTimeout(timer);
 }, [resendIn]);

 async function sendCode(target: string) {
  if (busy) return;
  setBusy(true); setError(''); setNotice('');
  try {
   const { error } = await authClient.emailOtp.sendVerificationOtp({ email: target, type: 'sign-in' });
   if (error) { setError(error.message || 'Could not send the code. Try again.'); return; }
   setSent(target); setCode(''); setLocalCode(''); setResendIn(30);
   setNotice('A new code has been sent. It expires in 5 minutes.');
   if (showCodes) {
    const res = await fetch(`/api/dev/sign-in-code?email=${encodeURIComponent(target)}`, { cache: 'no-store' });
    if (res.ok) setLocalCode((await res.json() as { code: string }).code);
   }
  } catch { setError('Could not send the code. Check your connection and try again.'); }
  finally { setBusy(false); }
 }

 async function verify(event: React.FormEvent) {
  event.preventDefault();
  if (busy) return;
  setBusy(true); setError(''); setNotice('');
  try {
   const { error } = await authClient.signIn.emailOtp({ email: sent, otp: code });
   if (error) { setError(error.message || 'That code is invalid or expired. Try again or request a new code.'); return; }
   window.location.assign(destination);
  } catch { setError('Could not verify the code. Check your connection and try again.'); }
  finally { setBusy(false); }
 }

 if (sent) return (
  <form className="auth-card" onSubmit={(e) => void verify(e)}>
   <h1>Enter your sign-in code</h1>
   <p>We sent a six-digit code to <strong>{sent}</strong>.</p>
   {localCode && <p className="local-sign-in-code">Local preview without email: <strong>{localCode}</strong></p>}
   <label>Verification code<input className="auth-code" type="text" inputMode="numeric" pattern="[0-9]{6}" maxLength={6} required autoFocus autoComplete="one-time-code" value={code} onChange={(e) => setCode(e.target.value.replace(/\D/g, '').slice(0, 6))} placeholder="000000" /></label>
   {notice && <p role="status">{notice}</p>}
   {error && <p className="form-error" role="alert">{error}</p>}
   <button className="button-primary" disabled={busy || code.length !== 6}>{busy ? 'Please wait…' : 'Verify and sign in'}</button>
   <button type="button" className="button-link" disabled={busy || resendIn > 0} onClick={() => void sendCode(sent)}>{resendIn > 0 ? `Resend code in ${resendIn}s` : 'Resend code'}</button>
   <button type="button" className="button-link" disabled={busy} onClick={() => { setSent(''); setCode(''); setLocalCode(''); setError(''); setNotice(''); }}>Use a different email</button>
  </form>
 );

 return (
  <form className="auth-card" onSubmit={(e) => { e.preventDefault(); void sendCode(email.trim().toLowerCase()); }}>
   <h1>Sign in to Recast Reel</h1>
   <p>Enter your email and we’ll send you a six-digit code. New here? The same code creates your account.</p>
   <label>Email<input type="email" required autoFocus value={email} onChange={(e) => setEmail(e.target.value)} autoComplete="email" /></label>
   {error && <p className="form-error" role="alert">{error}</p>}
   <button className="button-primary" disabled={busy}>{busy ? 'Sending…' : 'Email me a code'}</button>
   <p className="auth-legal">By continuing you agree to the <Link href="/terms">Terms</Link> and <Link href="/privacy">Privacy Policy</Link>.</p>
  </form>
 );
}
