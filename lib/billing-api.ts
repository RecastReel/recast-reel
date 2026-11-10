import type { WebhookEventType } from '@freemius/sdk';
import { NextRequest, NextResponse } from 'next/server';
import { creditPack } from './credit-packs';
import { appUrl, billingEnabled } from './config';
import { checkoutLink, deleteLicense, freemius, portalLink, processCheckoutRedirect, syncLicense } from './freemius';
import { sessionFor } from './session';

const json = (body: unknown, status = 200) =>
 NextResponse.json(body, { status, headers: { 'Cache-Control': 'private, no-store' } });

/** POST /api/billing/{checkout,portal}: a URL for the signed-in user to open. */
export async function handleBillingLink(req: NextRequest, kind: 'checkout' | 'portal') {
 const origin = req.headers.get('origin');
 if (!origin || new URL(origin).host !== req.headers.get('host')) return json({ error: 'Untrusted request origin.' }, 403);
 if (!billingEnabled()) return json({ error: 'Billing is off when running locally.' }, 404);
 const session = await sessionFor(req.headers);
 if (!session) return json({ error: 'Sign in to continue.' }, 401);
 try {
  let amount: number | undefined;
  if (kind === 'checkout') {
   const payload = await req.json().catch(() => null);
   const pack = creditPack(payload?.amount);
   if (!pack) return json({ error: 'Choose a $10, $25, $50, or $100 credit pack.' }, 400);
   amount = pack.usd;
  }
  const url = kind === 'checkout' ? await checkoutLink(session.user.email, amount!) : await portalLink(session.user.email);
  if (!url) return json({ error: 'No billing account yet. Purchase credits first.' }, 404);
  return json({ url });
 } catch (error) {
  console.error(`[freemius] ${kind} link failed`, error);
  return json({ error: kind === 'checkout' ? 'Checkout is unavailable. Try again shortly.' : 'Billing is unavailable. Try again shortly.' }, 502);
 }
}

/** GET /api/billing/redirect: where Freemius sends the browser after paying.
 * Set it as the checkout redirect URL in the Freemius dashboard. */
export async function handleCheckoutRedirect(req: NextRequest) {
 try {
  await processCheckoutRedirect(req.url);
 } catch (error) {
  // Webhooks still sync the purchase; the studio waits for it.
  console.error('[freemius] checkout redirect failed', error);
 }
 return NextResponse.redirect(`${appUrl()}/studio?purchased=1`, 303);
}

const LICENSE_EVENTS: WebhookEventType[] = [
 'license.created', 'license.extended', 'license.shortened', 'license.updated',
 'license.cancelled', 'license.expired', 'license.plan.changed',
 'subscription.created', 'subscription.cancelled',
];

/** POST /api/webhooks/freemius: verified license lifecycle events. Every event
 * re-fetches the license from Freemius, so there's one sync path. */
export async function handleFreemiusWebhook(req: Request) {
 const raw = await req.clone().text();
 const verifier = freemius().webhook.createListener();
 if (!verifier.verifySignature(raw, req.headers.get('x-signature'))) return json({ error: 'Invalid signature.' }, 401);
 try {
  const event = JSON.parse(raw);
  if (typeof event.type === 'string' && /^(payment|refund|chargeback)\./.test(event.type)) {
   const paymentId = event.objects?.payment?.id ?? event.data?.payment_id;
   if (!paymentId) return json({ error: 'Payment ID missing.' }, 400);
   const payment = await freemius().api.payment.retrieve(String(paymentId));
   if (!payment?.license_id) throw new Error('Payment license missing');
   await syncLicense(String(payment.license_id));
   return json({ success: true });
  }
 } catch (error) {
  console.error('[freemius] payment sync failed', error);
  return json({ error: 'Payment sync failed.' }, 500);
 }

 const listener = freemius().webhook.createListener({
  onError: async (error) => console.error('[freemius] webhook failed', error),
 });
 listener.on(LICENSE_EVENTS, async ({ type, objects: { license } }) => {
  if (license && license.id) {
   console.log('[freemius] webhook', type, license.id);
   await syncLicense(String(license.id));
  }
 });
 listener.on('license.deleted', async ({ data }) => {
  console.log('[freemius] webhook license.deleted', data.license_id);
  await deleteLicense(String(data.license_id));
 });
 return freemius().webhook.processFetch(listener, req);
}
