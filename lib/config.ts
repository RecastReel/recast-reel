/** Two ways to run Recast Reel:
 *
 * - Local (`npm run dev`): only CUE_API_KEY is needed. It's a single-user app
 *   with no sign-in and no billing (videos are paid for by that key), and the
 *   database is an embedded Postgres in .data/. Set LOCAL_MODE=0 to try the
 *   hosted sign-in and billing flow locally.
 * - Hosted (production build): every service must be configured, or the app
 *   refuses to serve rather than run without auth email or billing. */
export const isProduction = process.env.NODE_ENV === 'production';

const HOSTED_SETTINGS = ['DATABASE_URL', 'BETTER_AUTH_SECRET', 'BETTER_AUTH_URL', 'RESEND_API_KEY', 'FREEMIUS_PRODUCT_ID', 'FREEMIUS_API_KEY', 'FREEMIUS_SECRET_KEY', 'FREEMIUS_PUBLIC_KEY', 'FREEMIUS_PLAN_ID', 'CUE_API_KEY'];

export function assertHostedConfig() {
 if (!isProduction) return;
 const missing = HOSTED_SETTINGS.filter((name) => !process.env[name]);
 if (missing.length) throw new Error(`Recast Reel is missing production settings: ${missing.join(', ')}`);
}

export const localMode = () => !isProduction && process.env.LOCAL_MODE !== '0';

/** Freemius billing: always in production; with LOCAL_MODE=0, when configured. */
export const billingEnabled = () => isProduction || (!localMode() && Boolean(process.env.FREEMIUS_API_KEY));

/** With LOCAL_MODE=0 and no Resend, sign-in links are shown on the page. */
export const showSignInLinks = () => !isProduction && !process.env.RESEND_API_KEY;

export const hasVideoKey = () => Boolean(process.env.CUE_API_KEY);

export function authSecret() {
 return process.env.BETTER_AUTH_SECRET || (isProduction ? '' : 'recast-reel-local-development-secret');
}

export function appUrl() {
 return process.env.BETTER_AUTH_URL || (isProduction ? undefined : `http://localhost:${process.env.PORT || 3000}`);
}

/** Embedded database and other local files. */
export async function dataDir() {
 const { join } = await import('node:path');
 return process.env.DATA_DIR || join(process.cwd(), '.data');
}
