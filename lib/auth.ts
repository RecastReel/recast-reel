import { createHmac } from 'node:crypto';
import { betterAuth } from 'better-auth';
import { drizzleAdapter } from 'better-auth/adapters/drizzle';
import { nextCookies } from 'better-auth/next-js';
import { emailOTP } from 'better-auth/plugins';
import { appUrl, assertHostedConfig, authSecret } from './config';
import { getDb, type Db } from './db';
import { sendSignInCode } from './email';
import * as schema from './db/schema';

function createAuth(db: Db) {
 return betterAuth({
  appName: 'Recast Reel',
  baseURL: appUrl(),
  secret: authSecret(),
  database: drizzleAdapter(db, { provider: 'pg', schema }),
  plugins: [
   // Single-use email codes sign in existing accounts and create new ones.
   emailOTP({
    otpLength: 6,
    expiresIn: 5 * 60,
    allowedAttempts: 3,
    resendStrategy: 'rotate',
    storeOTP: { hash: async (otp) => createHmac('sha256', authSecret()).update(`email-otp:${otp}`).digest('hex') },
    rateLimit: { window: 60, max: 3 },
    sendVerificationOTP: ({ email, otp, type }) => type === 'sign-in' ? sendSignInCode(email, otp) : Promise.resolve(),
   }),
   nextCookies(),
  ],
 });
}

export type Auth = ReturnType<typeof createAuth>;
// Module-level so code reloads rebuild it; settings changes rebuild it too
// (dev reloads .env.local in place). The database itself stays shared.
let cached: { settings: string; auth: Promise<Auth> } | undefined;
export function getAuth(): Promise<Auth> {
 const settings = ['BETTER_AUTH_URL', 'BETTER_AUTH_SECRET', 'RESEND_API_KEY']
  .map((name) => process.env[name] ?? '').join('\n');
 assertHostedConfig();
 if (cached?.settings !== settings) cached = { settings, auth: getDb().then(createAuth) };
 return cached.auth;
}
