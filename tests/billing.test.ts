import assert from 'node:assert/strict';
import { createHmac } from 'node:crypto';
import { test } from 'node:test';
import { mkdtemp, rm } from 'node:fs/promises';
import { tmpdir } from 'node:os';
import { join } from 'node:path';
import { eq } from 'drizzle-orm';
import type { PurchaseInfo, PaymentEntity } from '@freemius/sdk';
import { CREDIT_PACKS, creditPack, packPricingId, topupPlanId } from '../lib/credit-packs';
import { refundedCredits } from '../lib/purchase-credits';

const payment = (type: PaymentEntity['type'], gross: number, license = 'license-25'): PaymentEntity => ({
 type, gross, license_id: license, gateway_fee: 0, is_renewal: false,
});

test('public Freemius IDs work without deployment overrides', () => {
 delete process.env.FREEMIUS_TOPUP_PLAN_ID;
 for (const amount of [10, 25, 50, 100]) delete process.env[`FREEMIUS_PRICING_ID_TOPUP_${amount}`];
 assert.equal(topupPlanId(), '78471');
 assert.deepEqual([10, 25, 50, 100].map(packPricingId), ['118288', '118289', '118290', '118291']);
});

test('credit pack totals and strict selection', () => {
 assert.deepEqual(CREDIT_PACKS.map((p) => [p.creditCents, p.feeCents, p.totalCents]), [[1000, 220, 1220], [2500, 550, 3050], [5000, 1100, 6100], [10000, 2200, 12200]]);
 for (const invalid of ['25', 0, 15, -10, null, {}, 25.5]) assert.equal(creditPack(invalid), undefined);
});

test('partial refunds include proportional service fees; disputes suspend credit', () => {
 assert.equal(refundedCredits(2500, [payment('payment', 30.5), payment('refund', -12.2)]), 1000);
 assert.equal(refundedCredits(2500, [payment('payment', 30.5), payment('refund', -30.5)]), 2500);
 assert.equal(refundedCredits(2500, [payment('payment', 30.5), payment('disputed', 30.5)]), 2500);
 assert.equal(refundedCredits(2500, [payment('payment', 30.5), payment('disputed', 30.5), payment('won_dispute', 30.5)]), 0);
 assert.throws(() => refundedCredits(2500, []), /No confirmed payment/);
});

test('prepaid billing lifecycle in an isolated database', async (t) => {
 const directory = await mkdtemp(join(tmpdir(), 'recast-billing-test-'));
 delete process.env.DATABASE_URL;
 Object.assign(process.env, { NODE_ENV: 'test', DATA_DIR: directory, LOCAL_MODE: '0', FREEMIUS_SECRET_KEY: 'test-secret-key-at-least-32-characters-long', FREEMIUS_PUBLIC_KEY: 'test-public-key', FREEMIUS_PRODUCT_ID: '12345', FREEMIUS_API_KEY: 'test-only', FREEMIUS_TOPUP_PLAN_ID: 'topup', FREEMIUS_PLAN_ID: 'legacy', FREEMIUS_PRICING_ID_TOPUP_25: 'pricing-25' });
 const { getDb } = await import('../lib/db');
 const { user, swaps, user_fs_entitlement } = await import('../lib/db/schema');
 const { planStatus } = await import('../lib/plan');
 const { syncLicense, deleteLicense, freemius, checkoutLink } = await import('../lib/freemius');
 const { handleFreemiusWebhook } = await import('../lib/billing-api');
 const db = await getDb();
 const sdk = freemius();
 let license = 'license-25';
 let pricing = 'pricing-25';
 let payments: PaymentEntity[] = [];
 const created = new Date('2026-10-01T00:00:00Z');
 sdk.purchase.retrievePurchase = async () => ({ email: 'buyer@example.com', userId: 'fs-user', licenseId: license, planId: 'topup', pricingId: pricing, quota: 25, canceled: false, expiration: null, created, renewalDate: null,
  isOneOff: () => true,
  toEntitlementRecord: () => ({ fsLicenseId: license, fsPlanId: 'topup', fsPricingId: pricing, fsUserId: 'fs-user', type: 'oneoff', isCanceled: false, expiration: null, createdAt: created, renewalDate: null }),
 } as unknown as PurchaseInfo);
 sdk.api.user.retrievePayments = async () => payments;
 try {
  await db.insert(user).values({ id: 'buyer', name: 'Buyer', email: 'buyer@example.com' });
  assert.equal((await planStatus('buyer')).active, false);
  await t.test('verified purchases grant once; repeat purchases accumulate', async () => {
   payments = [payment('payment', 30.5)];
   await syncLicense(license);
   await syncLicense(license);
   assert.equal((await planStatus('buyer')).remainingCents, 2500);
   license = 'license-repeat';
   payments.push(payment('payment', 30.5, license));
   await syncLicense(license);
   assert.equal((await planStatus('buyer')).remainingCents, 5000);
   assert.equal((await db.select().from(user_fs_entitlement)).length, 2);
  });
  await t.test('spend, failed video restoration, and partial refunds', async () => {
   await db.insert(swaps).values({ id: 'video', userId: 'buyer', idempotencyKey: 'billing-video-test', kind: 'generate', prompt: 'Test video', seconds: 5, costCents: 1000 });
   assert.equal((await planStatus('buyer')).remainingCents, 4000);
   await db.update(swaps).set({ refunded: true }).where(eq(swaps.id, 'video'));
   assert.equal((await planStatus('buyer')).remainingCents, 5000);
   payments.push(payment('refund', -12.2, license));
   await syncLicense(license);
   await syncLicense(license);
   assert.equal((await planStatus('buyer')).remainingCents, 4000);
  });
  await t.test('deleted licenses cannot be resurrected by stale notifications', async () => {
   await deleteLicense(license);
   await syncLicense(license);
   assert.equal((await planStatus('buyer')).remainingCents, 2500);
  });
  await t.test('unknown pricing and unpaid licenses cannot grant credits', async () => {
   license = 'unpaid';
   await assert.rejects(syncLicense(license), /No confirmed payment/);
   pricing = 'unknown';
   await assert.rejects(syncLicense(license), /Unrecognized/);
   assert.equal((await planStatus('buyer')).remainingCents, 2500);
  });
  await t.test('signed payment refund notifications reconcile from the API and are replay safe', async () => {
   license = 'license-25'; pricing = 'pricing-25';
   payments.push(payment('refund', -6.1, license));
   sdk.api.payment.retrieve = async () => payment('refund', -6.1, license);
   const raw = JSON.stringify({ type: 'payment.refund', data: { payment_id: '123' } });
   const signature = createHmac('sha256', process.env.FREEMIUS_SECRET_KEY!).update(raw).digest('hex');
   for (let i = 0; i < 2; i++) {
    const response = await handleFreemiusWebhook(new Request('http://localhost/api/webhooks/freemius', { method: 'POST', headers: { 'x-signature': signature }, body: raw }));
    assert.equal(response.status, 200);
    assert.equal((await planStatus('buyer')).remainingCents, 2000);
   }
  });
  await t.test('legacy grants stop at the migration cutoff and remain spendable', async () => {
   await db.insert(user_fs_entitlement).values({ userId: 'buyer', fsLicenseId: 'legacy-license', fsPlanId: 'legacy', fsPricingId: 'old', fsUserId: 'fs-user', type: 'subscription', isCanceled: true, createdAt: new Date('2026-08-01'), creditCutoffAt: new Date('2026-10-02'), expiration: new Date('2027-01-01') });
   assert.equal((await planStatus('buyer')).remainingCents, 8000);
  });
  await t.test('checkout rejects mismatched recurring prices', async () => {
   sdk.api.product.retrievePricingData = async () => ({ plans: [{ id: 'topup', is_free_localhost: false, is_block_features: false, is_block_features_monthly: false, license_type: 0, pricing: [{ id: 'pricing-25', licenses: 25, currency: 'usd', lifetime_price: 30.5, monthly_price: 25 }] }] });
   await assert.rejects(checkoutLink('buyer@example.com', 25), /must match/);
  });
  await t.test('forged webhook is rejected before any credit is changed', async () => {
   const result = await handleFreemiusWebhook(new Request('http://localhost/api/webhooks/freemius', { method: 'POST', body: JSON.stringify({ type: 'payment.created', data: { payment_id: 'fake' } }) }));
   assert.equal(result.status, 401);
   assert.equal((await planStatus('buyer')).remainingCents, 8000);
  });
 } finally {
  await (db as unknown as { $client: { close(): Promise<void> } }).$client.close();
  await rm(directory, { recursive: true, force: true });
 }
});
