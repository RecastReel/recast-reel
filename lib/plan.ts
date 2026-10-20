import { and, eq, gte, sql } from 'drizzle-orm';
import { billingEnabled } from './config';
import { getDb, type Db } from './db';
import { swaps, user_fs_entitlement } from './db/schema';
import { freemius, planId } from './freemius';

/** The single subscription: $25/month for a monthly credit spent at
 * MadeByCue's own prices. */
export const PLAN = {
 name: 'Recast Reel',
 priceUsd: 25,
 creditCents: Math.round(Number(process.env.MONTHLY_CREDIT_USD || 20) * 100),
};
// MadeByCue character swaps accept 60–600 second sources.
export const MIN_SWAP_SECONDS = 60;
export const MAX_SWAP_SECONDS = 600;

export type PlanStatus = {
 /** False when running locally without Freemius: no credit limit, the API key pays. */
 billing: boolean;
 active: boolean;
 cancelAtPeriodEnd: boolean;
 periodEnd: string | null;
 /** Monthly credit, spent and left, in US cents. */
 creditCents: number;
 usedCents: number;
 remainingCents: number;
};

/** Access follows the user's Freemius subscription license: valid until it
 * expires, including after renewal is cancelled. */
export async function planStatus(userId: string, executor?: Pick<Db, 'select'>): Promise<PlanStatus> {
 if (!billingEnabled()) return { billing: false, active: true, cancelAtPeriodEnd: false, periodEnd: null, creditCents: 0, usedCents: 0, remainingCents: Number.MAX_SAFE_INTEGER };
 const db = executor ?? await getDb();
 const rows = await db.select().from(user_fs_entitlement).where(eq(user_fs_entitlement.userId, userId));
 const plan = planId();
 const current = (freemius().entitlement.getActives(rows.filter((row) => !plan || row.fsPlanId === plan)) ?? [])
  .sort((a, b) => (b.expiration?.getTime() ?? Infinity) - (a.expiration?.getTime() ?? Infinity))[0];
 const now = Date.now();
 // The credit resets each billing month, which ends at the expiration.
 const monthBeforeEnd = current?.expiration ? new Date(current.expiration) : undefined;
 monthBeforeEnd?.setUTCMonth(monthBeforeEnd.getUTCMonth() - 1);
 const since = current
  ? new Date(Math.max(current.createdAt.getTime(), monthBeforeEnd?.getTime() ?? 0))
  : new Date(now - 30 * 24 * 60 * 60 * 1000);
 const [used] = await db.select({ cents: sql<number>`coalesce(sum(${swaps.costCents}), 0)::int` }).from(swaps)
  .where(and(eq(swaps.userId, userId), eq(swaps.refunded, false), gte(swaps.createdAt, since)));
 const usedCents = Number(used?.cents ?? 0);
 return {
  billing: true,
  active: Boolean(current),
  cancelAtPeriodEnd: Boolean(current && !current.renewalDate),
  periodEnd: (current?.renewalDate ?? current?.expiration)?.toISOString() ?? null,
  creditCents: PLAN.creditCents,
  usedCents,
  remainingCents: current ? Math.max(0, PLAN.creditCents - usedCents) : 0,
 };
}
