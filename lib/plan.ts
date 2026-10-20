import { and, eq, gte, sql } from 'drizzle-orm';
import { billingEnabled } from './config';
import { getDb, type Db } from './db';
import { creem_subscription, swaps } from './db/schema';

/** The single subscription: $25/month for a monthly allowance of swap time. */
export const PLAN = {
 name: 'Recast Reel',
 priceUsd: 25,
 seconds: Number(process.env.MONTHLY_VIDEO_SECONDS || 120),
 productId: process.env.CREEM_PRODUCT_ID || '',
};
// MadeByCue character swaps accept 60–600 second sources.
export const MIN_SWAP_SECONDS = 60;
export const MAX_SWAP_SECONDS = 600;

export type PlanStatus = {
 /** False when running locally without Creem: no allowance, the API key pays. */
 billing: boolean;
 active: boolean;
 cancelAtPeriodEnd: boolean;
 periodEnd: string | null;
 allowanceSeconds: number;
 usedSeconds: number;
 remainingSeconds: number;
};

/** Access follows Creem: active, trialing or paid subscriptions, plus a
 * scheduled cancellation until its period ends. */
export async function planStatus(userId: string, executor?: Pick<Db, 'select'>): Promise<PlanStatus> {
 if (!billingEnabled()) return { billing: false, active: true, cancelAtPeriodEnd: false, periodEnd: null, allowanceSeconds: 0, usedSeconds: 0, remainingSeconds: Number.MAX_SAFE_INTEGER };
 const db = executor ?? await getDb();
 const rows = await db.select().from(creem_subscription).where(eq(creem_subscription.referenceId, userId));
 const now = Date.now();
 const current = rows
  .filter((row) => !PLAN.productId || row.productId === PLAN.productId)
  .find((row) => ['active', 'trialing', 'paid'].includes(row.status)
   || (row.status === 'scheduled_cancel' && row.periodEnd && row.periodEnd.getTime() > now));
 const since = current?.periodStart ?? new Date(now - 30 * 24 * 60 * 60 * 1000);
 const [used] = await db.select({ seconds: sql<number>`coalesce(sum(${swaps.seconds}), 0)::int` }).from(swaps)
  .where(and(eq(swaps.userId, userId), eq(swaps.refunded, false), gte(swaps.createdAt, since)));
 const usedSeconds = Number(used?.seconds ?? 0);
 return {
  billing: true,
  active: Boolean(current),
  cancelAtPeriodEnd: Boolean(current?.cancelAtPeriodEnd || current?.status === 'scheduled_cancel'),
  periodEnd: current?.periodEnd?.toISOString() ?? null,
  allowanceSeconds: PLAN.seconds,
  usedSeconds,
  remainingSeconds: current ? Math.max(0, PLAN.seconds - usedSeconds) : 0,
 };
}
