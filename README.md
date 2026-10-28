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

Production adds accounts, a subscription and a hosted database. The app requires
the services below to be configured. See `.env.example` for each setting.

| Service                                | Used for               | Settings                                                                                                                        |
| -------------------------------------- | ---------------------- | ------------------------------------------------------------------------------------------------------------------------------- |
| [MadeByCue](https://www.madebycue.dev) | Making the videos      | `CUE_API_KEY`                                                                                                                   |
| [Neon](https://neon.tech) (Postgres)   | Database               | `DATABASE_URL`                                                                                                                  |
| [Resend](https://resend.com)           | Sign-in emails         | `RESEND_API_KEY`, `EMAIL_FROM`                                                                                                  |
| [Freemius](https://freemius.com)       | $25/month subscription | `FREEMIUS_PRODUCT_ID`, `FREEMIUS_API_KEY`, `FREEMIUS_SECRET_KEY`, `FREEMIUS_PUBLIC_KEY`, `FREEMIUS_PLAN_ID`, `FREEMIUS_SANDBOX` |
| Better Auth                            | Sessions               | `BETTER_AUTH_SECRET`, `BETTER_AUTH_URL`                                                                                         |

Setup:

1. Set the environment variables for your deployment. For migrations, provide
   `DATABASE_URL` in the shell environment or in `.env.local`, then run
   `npm run db:migrate` against your Neon database.
2. Verify your sending domain in Resend.
3. In Freemius, create the $25/month plan. Add the webhook
   `https://<your-domain>/api/webhooks/freemius` (all `license.*` events, plus
   `subscription.created` and `subscription.cancelled`), and set the plan's checkout
   redirect URL to `https://<your-domain>/api/billing/redirect`.
4. Freemius uses its sandbox unless `FREEMIUS_SANDBOX=false`; set it to `false`
   when you're ready to accept real payments.
5. Optionally, change the credits added each month with `MONTHLY_CREDIT_USD`
   (default 20; 1 credit = $1). Each video uses MadeByCue's price for it, and
   unused credits carry over.
6. Build and start the app with `npm run build` and `npm start`.
