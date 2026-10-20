import { Freemius, type PurchaseInfo } from '@freemius/sdk';
import { eq } from 'drizzle-orm';
import { appUrl } from './config';
import { getDb } from './db';
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

/** The $25/month plan. Unset, checkout offers the first paid plan. */
export const planId = () => process.env.FREEMIUS_PLAN_ID || undefined;

/** A hosted checkout link for the signed-in user. */
export async function checkoutLink(email: string) {
 const checkout = await freemius().checkout.create({ user: { email }, planId: planId(), isSandbox: isSandbox() });
 return checkout.setCancelButton(`${appUrl()}/studio`).getLink();
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
 if (planId() && !purchase.isPlan(planId()!))
  console.error('[freemius] license', purchase.licenseId, 'is for plan', purchase.planId, 'not FREEMIUS_PLAN_ID; it grants no access');
 const record = purchase.toEntitlementRecord({ renewalDate: purchase.renewalDate });
 await db.insert(user_fs_entitlement)
  .values({ ...record, userId: owner.id, expiration: purchase.expiration, createdAt: purchase.created })
  .onConflictDoUpdate({
   target: user_fs_entitlement.fsLicenseId,
   set: { ...record, expiration: purchase.expiration, createdAt: purchase.created },
  });
}

/** Re-fetches a license from Freemius and mirrors it. Idempotent. */
export async function syncLicense(licenseId: string) {
 const purchase = await freemius().purchase.retrievePurchase(licenseId);
 if (purchase) await savePurchase(purchase);
}

export async function deleteLicense(licenseId: string) {
 const db = await getDb();
 await db.delete(user_fs_entitlement).where(eq(user_fs_entitlement.fsLicenseId, licenseId));
}

/** A one-time login link to Freemius' hosted customer portal: payment
 * method, invoices, cancellation. */
export async function portalLink(email: string) {
 const portal = await freemius().api.user.retrieveHostedCustomerPortalByEmail(email);
 return portal?.link ?? null;
}
