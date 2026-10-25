import { Resend } from 'resend';
import { isProduction, showSignInCodes } from './config';

const FROM = process.env.EMAIL_FROM || 'Recast Reel <noreply@recastreel.com>';
const CODE_TTL = 5 * 60 * 1000;

// Development-only delivery when Resend is absent. Never exposed in production.
const local = globalThis as typeof globalThis & {
 recastSignInCodes?: Map<string, { code: string; expiresAt: number }>;
};
export function localSignInCode(email: string) {
 if (!showSignInCodes()) return undefined;
 const entry = local.recastSignInCodes?.get(email.trim().toLowerCase());
 return entry && entry.expiresAt > Date.now() ? entry.code : undefined;
}

export async function sendSignInCode(to: string, code: string) {
 if (!/^\d{6}$/.test(code)) throw new Error('Invalid sign-in code format');
 const key = process.env.RESEND_API_KEY;
 if (!key) {
  if (isProduction) throw new Error('RESEND_API_KEY is not configured');
  const codes = (local.recastSignInCodes ??= new Map());
  for (const [email, entry] of codes) if (entry.expiresAt <= Date.now()) codes.delete(email);
  if (codes.size >= 500) codes.delete(codes.keys().next().value!);
  codes.set(to.trim().toLowerCase(), { code, expiresAt: Date.now() + CODE_TTL });
  return;
 }
 const { error } = await new Resend(key).emails.send({
  from: FROM,
  to,
  subject: `${code} is your Recast Reel sign-in code`,
  text: `Your Recast Reel sign-in code is:\n\n${code}\n\nEnter this code in the app to sign in. It expires in 5 minutes and can only be used once. If you didn't request it, you can ignore this email. Never share this code.`,
  html: `<div style="font-family:Arial,Helvetica,sans-serif;font-size:14px;line-height:1.6;color:#111">
<p>Enter this code in Recast Reel to sign in:</p>
<p style="font-size:32px;font-weight:bold;letter-spacing:8px">${code}</p>
<p>This code expires in 5 minutes and can only be used once.</p>
<p style="color:#666;font-size:12px">If you didn't request it, you can ignore this email. Never share this code.</p>
</div>`,
 });
 if (error) throw new Error(`Sign-in email failed: ${error.message}`);
}
