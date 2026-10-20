# Recast Reel

Make AI videos in your browser. Describe a scene to generate a video, optionally guided by
reference images, or upload a clip and swap a new character into it.

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

You don't need to sign up or pay; videos are charged to your API key.

## Run it in production

Production adds accounts, a subscription and a hosted database. It won't start unless
every service below is configured. See `.env.example` for each setting.

| Service | Used for | Settings |
| --- | --- | --- |
| [MadeByCue](https://www.madebycue.dev) | Making the videos | `CUE_API_KEY` |
| [Neon](https://neon.tech) (Postgres) | Database | `DATABASE_URL` |
| [Resend](https://resend.com) | Sign-in emails | `RESEND_API_KEY`, `EMAIL_FROM` |
| [Freemius](https://freemius.com) | $25/month subscription | `FREEMIUS_PRODUCT_ID`, `FREEMIUS_API_KEY`, `FREEMIUS_SECRET_KEY`, `FREEMIUS_PUBLIC_KEY`, `FREEMIUS_PLAN_ID`, `FREEMIUS_SANDBOX=false` |
| Better Auth | Sessions | `BETTER_AUTH_SECRET`, `BETTER_AUTH_URL` |

Setup:

1. Run `npm run db:migrate` against your Neon database.
2. Verify your sending domain in Resend.
3. In Freemius, create the $25/month plan. Add the webhook
   `https://<your-domain>/api/webhooks/freemius` (all `license.*` events, plus
   `subscription.created` and `subscription.cancelled`), and set the plan's checkout.
   redirect URL to `https://<your-domain>/api/billing/redirect`.
4. Ask MadeByCue to allow browser uploads from your domain.
5. Optionally, change the credits added each month with `MONTHLY_CREDIT_USD`
   (default 20; 1 credit = $1). Each video uses MadeByCue's price for it, and
   unused credits carry over
