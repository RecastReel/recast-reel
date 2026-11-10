# Recast Reel

Make AI videos in your browser. Describe a scene to generate a video, optionally guided by
reference images, or upload a clip and swap a new character into it.

[![Watch the character swap example](public/showcase/character-swap.jpg)](public/showcase/character-swap.mp4)

Click the image to watch the character swap example from the landing page.

Use the hosted version at [recastreel.com](https://recastreel.com), or run it yourself.

## Run it locally

1. Get an API key from [madebycue.dev](https://www.madebycue.dev).
2. Create a file named `.env.local` in this folder and add your key:

   ```
   CUE_API_KEY=your-api-key
   ```

3. Install and start the app:

   ```bash
   npm install
   npm run dev
   ```

4. Open http://localhost:3000 and start creating.

You don't need a Recast Reel account or subscription; videos are charged to your MadeByCue API key. Local mode uses an embedded database in `.data/`.

## Run it in production

Production adds accounts, prepaid credit purchases and a hosted database. The app requires
the services below to be configured. See `.env.example` for each setting.

| Service                                | Used for               | Settings                                                                                                                        |
| -------------------------------------- | ---------------------- | ------------------------------------------------------------------------------------------------------------------------------- |
| [MadeByCue](https://www.madebycue.dev) | Making the videos      | `CUE_API_KEY`                                                                                                                   |
| [Neon](https://neon.tech) (Postgres)   | Database               | `DATABASE_URL`                                                                                                                  |
| [Resend](https://resend.com)           | Sign-in emails         | `RESEND_API_KEY`, `EMAIL_FROM`                                                                                                  |
| [Freemius](https://freemius.com)       | One-time credit packs | `FREEMIUS_PRODUCT_ID`, `FREEMIUS_API_KEY`, `FREEMIUS_SECRET_KEY`, `FREEMIUS_PUBLIC_KEY`, `FREEMIUS_SANDBOX` |
| Better Auth                            | Sessions               | `BETTER_AUTH_SECRET`, `BETTER_AUTH_URL`                                                                                         |

Setup:

1. Set the environment variables for your deployment. For migrations, provide
   `DATABASE_URL` in the shell environment or in `.env.local`, then run
   `npm run db:migrate` against your Neon database.
2. Verify your sending domain in Resend.
3. In Freemius, create a dedicated **Credit Topup** SaaS plan with multi-unit pricing.
   Set the unit label to Credit. Use only USD one-off prices; leave monthly and
   annual prices empty. Do not reuse the old subscription plan.

   | Quota / credits | Service fee (22%) | One-off price before tax |
   | --- | --- | --- |
   | 10 | $2.20 | $12.20 |
   | 25 | $5.50 | $30.50 |
   | 50 | $11.00 | $61.00 |
   | 100 | $22.00 | $122.00 |

   The verified plan ID (`78471`) and pricing IDs (`118288`–`118291`) are
   included in `lib/credit-packs.ts`; no additional environment settings are needed.
   Optional `FREEMIUS_TOPUP_PLAN_ID` and `FREEMIUS_PRICING_ID_TOPUP_*` overrides
   support a different Freemius product or test configuration.
   Checkout validates the USD price, quota, and absence of recurring prices.
   The service fee is included in Freemius's configured product price, not an
   additional tax. Freemius calculates applicable sales taxes on that total.
4. Set the webhook to `https://<your-domain>/api/webhooks/freemius`. Enable
   `license.created`, `license.updated`, `license.extended`, `license.shortened`,
   `license.cancelled`, `license.expired`, `license.plan.changed`, `license.deleted`,
   `payment.created`, `payment.refund`, all `payment.dispute.*` events, and legacy
   `subscription.created` / `subscription.cancelled`. Set the checkout redirect
   to `https://<your-domain>/api/billing/redirect`.
5. In **Plans → Refund Policy**, set a 14-day refund window and enable
   **Limit refunds to unused credits for usage-based features**. Our `/refunds`
   policy allows unused purchased credits plus proportional service fees to be
   refunded. Review usage and restore/remove the eligible credits before approving
   a monetary refund through Freemius. Payment webhooks reconcile full and partial
   refunds from authoritative payment records; replaying a webhook cannot add credit.
6. Run `npm run db:migrate` before starting the updated application. The migration
   records a cutoff for legacy monthly grants. Keep the historical `FREEMIUS_PLAN_ID`
   and `MONTHLY_CREDIT_USD` settings to preserve credits earned before that cutoff.
   No monthly credits are granted after the cutoff. **Cancel existing recurring
   subscriptions in Freemius at the transition**, after reviewing customers and
   any unused prepaid period; changing this app does not cancel external charges.
   Disable the legacy plan for new sales. Keep billing portal access for invoices
   and any remaining legacy subscription administration.
7. Test all four sandbox purchases, a repeat purchase of the same pack, webhook
   replay, a partial refund, and a failed video. `FREEMIUS_SANDBOX` defaults to true;
   set it to false only when the live plan/prices and webhook configuration match.
8. Build and start with `npm run build` and `npm start`.
