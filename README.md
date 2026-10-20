# Recast Reel

Generate videos, with or without reference images, or put any character into your own
clip. Runs on the MadeByCue API. Use the hosted version at recastreel.com, or run it
yourself with just an API key.

## Run it yourself

```bash
npm install
echo "CUE_API_KEY=your-madebycue-key" > .env.local
npm run dev                  # http://localhost:3000
```

That's all you need. Locally, Recast Reel:

- stores data in Drizzle's embedded Postgres (PGlite) under `.data/postgres`, created and
  migrated automatically;
- has no sign-in: you're one built-in user, and every page goes straight to the studio;
- turns billing off, so there's no allowance and videos are charged to your `CUE_API_KEY`;
- shows a banner saying so, which warns you if `CUE_API_KEY` is missing.

Local mode is for your own machine only. Don't expose `npm run dev` to the internet.

## Hosted version

- **Plan:** one $25/month subscription (Creem) with a monthly allowance of video seconds
  (`MONTHLY_VIDEO_SECONDS`, default 120). A video uses its length; failed,
  cancelled or expired videos return their seconds. The allowance resets each billing period.
- **Auth:** Better Auth passwordless magic links, emailed with Resend from
  `noreply@recastreel.com`. The same link signs in or creates the account.
- **Database:** Drizzle + Postgres (Neon). Without `DATABASE_URL`, local runs use the
  embedded PGlite database in `.data/postgres`.
- **Videos:** the server calls MadeByCue with one platform key (`CUE_API_KEY`).
  Customers never supply keys.

## Pages

- `/` landing: hero, before/after showcase, ready-made characters, how it works, pricing, FAQ
- `/login` one passwordless sign-in (`/signup` redirects here)
- `/studio` composer and "My swaps" (paywall until subscribed)
- `/account` plan, usage, Creem billing portal, sign out
- `/terms`, `/privacy` legal pages (contact: support@recastreel.com)

## How a swap is protected

1. The browser uploads straight to MadeByCue storage with presigned URLs; the server only
   reserves, signs and confirms. Upload keys are signed per user.
2. On confirm, the server measures the MP4/MOV length itself with range requests, so the
   allowance can't be under-reported. Sources must be 60–600 seconds.
3. Media references are HMAC-signed for one user, URL and length. Swaps with unsigned or
   foreign media are refused.
4. Allowance reservations are serialized per user in a transaction, and the
   `Idempotency-Key` makes retries reach the same swap.

## Production setup (hosted)

A production build refuses to run without every setting below. It never falls back to
local mode: no local database, no on-page links, no free use.

1. Create a Neon database, set `DATABASE_URL`, run `npm run db:migrate`.
2. In Creem, create the $25/month product, set `CREEM_PRODUCT_ID`, `CREEM_API_KEY`,
   `CREEM_WEBHOOK_SECRET`, `CREEM_TEST_MODE=0`, and register the webhook
   `https://<domain>/api/auth/creem/webhook`.
3. Set `BETTER_AUTH_URL` to the site URL and a strong `BETTER_AUTH_SECRET`. Verify
   `recastreel.com` in Resend and set `RESEND_API_KEY`.
4. Set `CUE_API_KEY` to the MadeByCue platform key (funded account with video access).
5. Add the site origin to the MadeByCue R2 bucket CORS rules so browsers can upload.

## Showcase

Add finished swaps to `SHOWCASE` in `lib/catalog.ts` with files in `public/showcase/`.
Sources must be 60–600 seconds and cleared for commercial use.
