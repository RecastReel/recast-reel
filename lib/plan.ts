import { and, eq, sql } from 'drizzle-orm';
import { billingEnabled } from './config';
import { getDb, type Db } from './db';
import { swaps, user_fs_entitlement } from './db/schema';
import { freemius, planId } from './freemius';

/** The single subscription: $25/month adds credits (1 credit = $1) spent at
 * MadeByCue's own prices. Unused credits carry over. */
export const PLAN = {
 name: 'Recast Reel',
 priceUsd: 25,
 creditCents: Math.round(Number(process.env.MONTHLY_CREDIT_USD || 20) * 100),
};
// MadeByCue character swaps accept 40–600 second sources.
export const MIN_SWAP_SECONDS = 40;
export const MAX_SWAP_SECONDS = 600;

export type PlanStatus = {
 /** False when running locally without Freemius: no credit limit, the API key pays. */
 billing: boolean;
 active: boolean;
 cancelAtPeriodEnd: boolean;
 periodEnd: string | null;
 /** Monthly credit added, all-time spend and the unexpired balance, in US cents. */
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

/** Access follows the user's Freemius subscription license: valid until it
 * expires, including after renewal is cancelled. */
export async function planStatus(userId: string, executor?: Pick<Db, 'select'>): Promise<PlanStatus> {
 if (!billingEnabled()) return { billing: false, active: true, cancelAtPeriodEnd: false, periodEnd: null, creditCents: 0, usedCents: 0, remainingCents: Number.MAX_SAFE_INTEGER };
 const db = executor ?? await getDb();
 const rows = await db.select().from(user_fs_entitlement).where(eq(user_fs_entitlement.userId, userId));
 const plan = planId();
 const current = (freemius().entitlement.getActives(rows.filter((row) => !plan || row.fsPlanId === plan)) ?? [])
  .sort((a, b) => (b.expiration?.getTime() ?? Infinity) - (a.expiration?.getTime() ?? Infinity))[0];
 const now = new Date();
 // Credits never expire: every billing month started on any subscription adds
 // the monthly credit, and every video ever made spends from that total.
 const granted = rows
  .filter((row) => row.type === 'subscription' && (!plan || row.fsPlanId === plan))
  .reduce((sum, row) => sum + monthsStarted(row.createdAt, row.expiration && row.expiration < now ? row.expiration : now), 0)
  * PLAN.creditCents;
 const [used] = await db.select({ cents: sql<number>`coalesce(sum(${swaps.costCents}), 0)::int` }).from(swaps)
  .where(and(eq(swaps.userId, userId), eq(swaps.refunded, false)));
 const usedCents = Number(used?.cents ?? 0);
 return {
  billing: true,
  active: Boolean(current),
  cancelAtPeriodEnd: Boolean(current && !current.renewalDate),
  periodEnd: (current?.renewalDate ?? current?.expiration)?.toISOString() ?? null,
  creditCents: PLAN.creditCents,
  usedCents,
  remainingCents: current ? Math.max(0, granted - usedCents) : 0,
 };
}
