import { boolean, index, integer, jsonb, pgTable, text, timestamp, uniqueIndex } from 'drizzle-orm/pg-core';

// Better Auth core tables, plus the fields the Creem plugin adds to user.
export const user = pgTable('user', {
 id: text('id').primaryKey(),
 name: text('name').notNull(),
 email: text('email').notNull().unique(),
 emailVerified: boolean('email_verified').notNull().default(false),
 image: text('image'),
 creemCustomerId: text('creem_customer_id'),
 hadTrial: boolean('had_trial').default(false),
 createdAt: timestamp('created_at').notNull().defaultNow(),
 updatedAt: timestamp('updated_at').notNull().defaultNow(),
});

export const session = pgTable('session', {
 id: text('id').primaryKey(),
 expiresAt: timestamp('expires_at').notNull(),
 token: text('token').notNull().unique(),
 ipAddress: text('ip_address'),
 userAgent: text('user_agent'),
 userId: text('user_id').notNull().references(() => user.id, { onDelete: 'cascade' }),
 createdAt: timestamp('created_at').notNull().defaultNow(),
 updatedAt: timestamp('updated_at').notNull().defaultNow(),
}, (t) => [index('session_user_idx').on(t.userId)]);

export const account = pgTable('account', {
 id: text('id').primaryKey(),
 accountId: text('account_id').notNull(),
 providerId: text('provider_id').notNull(),
 userId: text('user_id').notNull().references(() => user.id, { onDelete: 'cascade' }),
 accessToken: text('access_token'),
 refreshToken: text('refresh_token'),
 idToken: text('id_token'),
 accessTokenExpiresAt: timestamp('access_token_expires_at'),
 refreshTokenExpiresAt: timestamp('refresh_token_expires_at'),
 scope: text('scope'),
 password: text('password'),
 createdAt: timestamp('created_at').notNull().defaultNow(),
 updatedAt: timestamp('updated_at').notNull().defaultNow(),
}, (t) => [index('account_user_idx').on(t.userId)]);

export const verification = pgTable('verification', {
 id: text('id').primaryKey(),
 identifier: text('identifier').notNull(),
 value: text('value').notNull(),
 expiresAt: timestamp('expires_at').notNull(),
 createdAt: timestamp('created_at').notNull().defaultNow(),
 updatedAt: timestamp('updated_at').notNull().defaultNow(),
});

// Written by the Creem plugin from verified webhooks (persistSubscriptions).
export const creem_subscription = pgTable('creem_subscription', {
 id: text('id').primaryKey(),
 productId: text('product_id').notNull(),
 referenceId: text('reference_id').notNull(),
 creemCustomerId: text('creem_customer_id'),
 creemSubscriptionId: text('creem_subscription_id'),
 creemOrderId: text('creem_order_id'),
 status: text('status').notNull().default('pending'),
 periodStart: timestamp('period_start'),
 periodEnd: timestamp('period_end'),
 cancelAtPeriodEnd: boolean('cancel_at_period_end').default(false),
}, (t) => [index('creem_subscription_reference_idx').on(t.referenceId)]);

/** One row per creation: a character swap or a generated video. `seconds`
 * is the allowance it uses; one that fails is refunded and stops counting. */
export const swaps = pgTable('swaps', {
 id: text('id').primaryKey(),
 kind: text('kind').$type<'swap' | 'generate'>().notNull().default('swap'),
 userId: text('user_id').notNull().references(() => user.id, { onDelete: 'cascade' }),
 taskId: text('task_id').unique(),
 idempotencyKey: text('idempotency_key').notNull(),
 prompt: text('prompt').notNull(),
 seconds: integer('seconds').notNull(),
 status: text('status').notNull().default('queued'),
 refunded: boolean('refunded').notNull().default(false),
 task: jsonb('task').$type<Record<string, unknown>>(),
 createdAt: timestamp('created_at').notNull().defaultNow(),
 updatedAt: timestamp('updated_at').notNull().defaultNow(),
}, (t) => [
 index('swaps_user_time_idx').on(t.userId, t.createdAt),
 uniqueIndex('swaps_user_idempotency_idx').on(t.userId, t.idempotencyKey),
]);
