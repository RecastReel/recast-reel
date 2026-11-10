import { and, eq, sql } from 'drizzle-orm';
import { billingEnabled } from './config';
import { getDb, type Db } from './db';
import { swaps, user_fs_entitlement } from './db/schema';


// MadeByCue character swaps accept 40–600 second sources.
export const MIN_SWAP_SECONDS = 40;
export const MAX_SWAP_SECONDS = 600;

export type PlanStatus = {
 /** False when running locally without Freemius: no credit limit, the API key pays. */
 billing: boolean;
 active: boolean;
 cancelAtPeriodEnd: boolean;
 periodEnd: string | null;
 /** Total credits granted, all-time spend and the unexpired balance, in US cents. */
 creditCents: number;
 usedCents: number;
 remainingCents: number;
};

/** Billing months begun between `from` and `until`, counting the first. */
export function monthsStarted(from: Date, until: Date) {
 let months = 0;
 for (const next = new Date(from); next < until && months < 1200; months++) next.setUTCMonth(next.getUTCMonth() + 1);
 return months;
}

export async function planStatus(userId: string, executor?: Pick<Db, 'select'>): Promise<PlanStatus> {
 if (!billingEnabled()) return { billing: false, active: true, cancelAtPeriodEnd: false, periodEnd: null, creditCents: 0, usedCents: 0, remainingCents: Number.MAX_SAFE_INTEGER };
 const db = executor ?? await getDb();
 const rows = await db.select().from(user_fs_entitlement).where(eq(user_fs_entitlement.userId, userId));
 // One row per license means repeated redirects and webhooks cannot grant twice.
 // Freeze legacy monthly grants at migration time; preserve already earned credits.
 const legacyMonthly = Math.round(Number(process.env.MONTHLY_CREDIT_USD || 20) * 100);
 const granted = rows.reduce((sum, row) => {
  if (row.revoked) return sum;
  const legacy = row.type === 'subscription' && row.fsPlanId === process.env.FREEMIUS_PLAN_ID
   ? monthsStarted(row.createdAt, row.expiration && row.expiration < row.creditCutoffAt ? row.expiration : row.creditCutoffAt) * legacyMonthly : 0;
  return sum + Math.max(0, row.creditCents + legacy - row.refundedCreditCents);
 }, 0);
 const [used] = await db.select({ cents: sql<number>`coalesce(sum(${swaps.costCents}), 0)::int` }).from(swaps)
  .where(and(eq(swaps.userId, userId), eq(swaps.refunded, false)));
 const usedCents = Number(used?.cents ?? 0);
 return {
  billing: true,
  active: granted > usedCents,
  cancelAtPeriodEnd: false,
  periodEnd: null,
  creditCents: granted,
  usedCents,
  remainingCents: Math.max(0, granted - usedCents),
 };
}
