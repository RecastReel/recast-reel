import { Freemius, type PurchaseInfo, type PaymentEntity } from '@freemius/sdk';
import { eq, sql } from 'drizzle-orm';
import { appUrl } from './config';
import { getDb } from './db';
import { packForPricing, topupPlanId } from './credit-packs';
import { MONTHLY_CREDITS, MONTHLY_PRICE_USD, PRO_PLAN_ID, PRO_PRICING_ID, monthlyPlanId } from './monthly-plan';
import { refundedCredits } from './purchase-credits';
import { user, user_fs_entitlement } from './db/schema';

/** Freemius billing. Every call here is server-side; the keys never reach
 * the browser. Freemius owns billing state and user_fs_entitlement mirrors
 * it, kept current by the checkout redirect and verified webhooks. */
let cached: { settings: string; client: Freemius } | undefined;
export function freemius() {
 const settings = ['FREEMIUS_PRODUCT_ID', 'FREEMIUS_API_KEY', 'FREEMIUS_SECRET_KEY', 'FREEMIUS_PUBLIC_KEY']
  .map((name) => process.env[name] ?? '').join('\n');
 if (cached?.settings !== settings) cached = {
  settings,
  client: new Freemius({
   productId: process.env.FREEMIUS_PRODUCT_ID || '',
   apiKey: process.env.FREEMIUS_API_KEY || '',
   secretKey: process.env.FREEMIUS_SECRET_KEY || '',
   publicKey: process.env.FREEMIUS_PUBLIC_KEY || '',
  }),
 };
 return cached.client;
}

// Its own flag, not NODE_ENV: production can still run sandbox checkouts
// while testing. Only FREEMIUS_SANDBOX=false opens the live checkout.
export const isSandbox = () => process.env.FREEMIUS_SANDBOX !== 'false';

/** Verify the hosted checkout price before sending a customer to Freemius. */
export async function checkoutLink(email: string) {
 const planId = monthlyPlanId();
 if (!planId || planId === topupPlanId() || planId === process.env.FREEMIUS_PLAN_ID)
  throw new Error('A distinct monthly Freemius plan must be configured');
 const data = await freemius().api.product.retrievePricingData();
 const pricing = data?.plans?.find((plan) => String(plan.id) === planId)?.pricing?.find((price) =>
  price.id && (planId !== PRO_PLAN_ID || String(price.id) === PRO_PRICING_ID) && price.currency?.toLowerCase() === 'usd' && price.licenses === 1 &&
  price.monthly_price === MONTHLY_PRICE_USD && price.lifetime_price == null && price.annual_price == null);
 if (!pricing?.id) throw new Error('Freemius pricing must match the displayed monthly USD price');
 const checkout = await freemius().checkout.create({ user: { email }, planId, quota: 1, isSandbox: isSandbox(), withRecommendation: false });
 return checkout.setUser({ email }, true).setPricing(pricing.id).setBillingCycle('monthly').setCurrency('usd').setTrial(false)
  .setCancelButton(`${appUrl()}/account`).getLink();
}

/** Verifies the signed checkout redirect, then syncs the license it names. */
export async function processCheckoutRedirect(requestUrl: string) {
 // Behind a proxy the server sees an internal host; the signature covers the
 // public one, so verify against the public origin.
 const info = await freemius().checkout.processRedirect(requestUrl, appUrl());
 if (!info?.license_id) throw new Error('Invalid Freemius checkout redirect');
 await syncLicense(info.license_id);
}

async function savePurchase(purchase: PurchaseInfo) {
 const db = await getDb();
 const [owner] = await db.select({ id: user.id }).from(user).where(eq(user.email, purchase.email.toLowerCase()));
 if (!owner) {
  console.error('[freemius] purchase by an email with no account', purchase.email, 'license', purchase.licenseId);
  return;
 }
 const pack = packForPricing(purchase.pricingId);
 const topup = purchase.planId === topupPlanId() && purchase.isOneOff() && pack;
 if (topup && purchase.quota !== topup.usd) throw new Error('Unexpected credit pack quota');
 const monthly = purchase.planId === monthlyPlanId() && purchase.isMonthly();
 if (!topup && !monthly && purchase.planId !== process.env.FREEMIUS_PLAN_ID) throw new Error('Unrecognized Freemius plan or pricing');
 const record = purchase.toEntitlementRecord({ renewalDate: purchase.renewalDate });
 await db.transaction(async (tx) => {
  // Same lock as video reservations, so refunds and spending cannot race.
  await tx.execute(sql`select pg_advisory_xact_lock(hashtext(${owner.id}))`);
  let refundedCreditCents = 0;
  let creditCents = topup ? topup.creditCents : 0;
  if (topup || monthly) {
   const payments: PaymentEntity[] = [];
   for (let offset = 0; ; offset += 100) {
    const page = await freemius().api.user.retrievePayments(purchase.userId, { filter: 'all' }, { count: 100, offset });
    payments.push(...page.filter((p) => String(p.license_id) === purchase.licenseId));
    if (page.length < 100) break;
   }
   if (monthly) {
    const paidIds = new Set(payments.filter((payment) => payment.type === 'payment' && payment.id &&
     Number(payment.gross) > 0).map((payment) => String(payment.id)));
    creditCents = paidIds.size * MONTHLY_CREDITS * 100;
   }
   if (creditCents > 0 || topup) refundedCreditCents = refundedCredits(creditCents, payments);
  }
  await tx.insert(user_fs_entitlement)
   .values({ ...record, userId: owner.id, expiration: purchase.expiration, createdAt: purchase.created, creditCents, refundedCreditCents, revoked: Boolean(topup && purchase.canceled) })
   .onConflictDoUpdate({
    target: user_fs_entitlement.fsLicenseId,
    // Preserve one-off grants and deletion tombstones on replay.
    set: { ...record, ...(monthly ? { creditCents } : {}), createdAt: purchase.created, expiration: purchase.expiration, refundedCreditCents, revoked: sql`${user_fs_entitlement.revoked} or ${Boolean(topup && purchase.canceled)}` },
   });
 });
}

/** Re-fetches a license from Freemius and mirrors it. Idempotent. */
export async function syncLicense(licenseId: string) {
 const purchase = await freemius().purchase.retrievePurchase(licenseId);
 if (purchase) await savePurchase(purchase);
}

export async function deleteLicense(licenseId: string) {
 const db = await getDb();
 await db.update(user_fs_entitlement).set({ revoked: true }).where(eq(user_fs_entitlement.fsLicenseId, licenseId));
}

/** A one-time login link to Freemius' hosted customer portal: payment
 * method, invoices, cancellation. */
export async function portalLink(email: string) {
 const portal = await freemius().api.user.retrieveHostedCustomerPortalByEmail(email);
 return portal?.link ?? null;
}
