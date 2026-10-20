import { boolean, index, integer, jsonb, pgTable, text, timestamp, uniqueIndex } from 'drizzle-orm/pg-core';

// Better Auth core tables.
export const user = pgTable('user', {
 id: text('id').primaryKey(),
 name: text('name').notNull(),
 email: text('email').notNull().unique(),
 emailVerified: boolean('email_verified').notNull().default(false),
 image: text('image'),
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

// Mirror of the user's Freemius licenses, written from the checkout redirect
// and verified webhooks. Freemius stays the source of truth.
export const user_fs_entitlement = pgTable('user_fs_entitlement', {
 id: text('id').primaryKey().$defaultFn(() => crypto.randomUUID()),
 userId: text('user_id').notNull().references(() => user.id, { onDelete: 'cascade' }),
 fsLicenseId: text('fs_license_id').notNull().unique(),
 fsPlanId: text('fs_plan_id').notNull(),
 fsPricingId: text('fs_pricing_id').notNull(),
 fsUserId: text('fs_user_id').notNull(),
 type: text('type').$type<'subscription' | 'oneoff'>().notNull(),
 expiration: timestamp('expiration'),
 /** Next charge; null once renewal is cancelled. */
 renewalDate: timestamp('renewal_date'),
 isCanceled: boolean('is_canceled').notNull(),
 createdAt: timestamp('created_at').notNull(),
}, (t) => [index('user_fs_entitlement_user_idx').on(t.userId)]);

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
