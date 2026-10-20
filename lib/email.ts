import { Resend } from 'resend';
import { isProduction, showSignInLinks } from './config';

const FROM = process.env.EMAIL_FROM || 'Recast Reel <noreply@recastreel.com>';

function escape(text: string) {
 return text.replace(/[&<>"']/g, (c) => ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&#39;' })[c]!);
}

// Local runs without Resend keep the latest link per email so the sign-in
// page can show it (see app/api/dev/sign-in-link).
const local = globalThis as typeof globalThis & { recastSignInLinks?: Map<string, string> };
export function localSignInLink(email: string) {
 return showSignInLinks() ? local.recastSignInLinks?.get(email.trim().toLowerCase()) : undefined;
}

/** Sign-in link email. Without RESEND_API_KEY locally, the link is shown on
 * the sign-in page and printed to the server log instead. */
export async function sendSignInEmail(to: string, url: string) {
 const key = process.env.RESEND_API_KEY;
 if (!key) {
  if (isProduction) throw new Error('RESEND_API_KEY is not configured');
  (local.recastSignInLinks ??= new Map()).set(to.trim().toLowerCase(), url);
  console.info(`[recast-reel] Sign-in link for ${to}: ${url}`);
  return;
 }
 const link = escape(url);
 const { error } = await new Resend(key).emails.send({
  from: FROM,
  to,
  subject: 'Your Recast Reel sign-in link',
  text: `Sign in to Recast Reel:\n\n${url}\n\nThis link expires in 15 minutes. If you didn't ask for it, you can ignore this email.`,
  html: `<div style="font-family:Arial,Helvetica,sans-serif;font-size:14px;line-height:1.6;color:#111">
<p>Click the button to sign in to Recast Reel.</p>
<p><a href="${link}" style="display:inline-block;padding:10px 20px;border-radius:20px;background:#111;color:#fff;text-decoration:none">Sign in to Recast Reel</a></p>
<p style="color:#666;font-size:12px">This link expires in 15 minutes. If you didn't ask for it, you can ignore this email.</p>
</div>`,
 });
 if (error) throw new Error(`Sign-in email failed: ${error.message}`);
}
