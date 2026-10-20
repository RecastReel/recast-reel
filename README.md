# Recast Reel

Make AI videos in your browser. Describe a scene to generate a video, optionally guided by
reference images, or upload a clip and swap a new character into it. The videos are made
by the [MadeByCue](https://www.madebycue.dev) API.

Use the hosted version at [recastreel.com](https://recastreel.com), or run it yourself.

## Run it locally

All you need is a MadeByCue API key.

```bash
npm install
echo "CUE_API_KEY=your-madebycue-key" > .env.local
npm run dev
```

Open http://localhost:3000. There's no sign-up and no billing. Videos are charged to your
API key, and your data is kept in a local database in `.data/`. Use port 3000, because
MadeByCue only accepts browser uploads from `localhost:3000`.

This mode is for your own machine. Don't expose it to the internet.

## Run it in production

Production adds accounts, a subscription and a hosted database. It won't start unless
every service below is configured. See `.env.example` for each setting.

| Service | Used for | Settings |
| --- | --- | --- |
| [MadeByCue](https://www.madebycue.dev) | Making the videos | `CUE_API_KEY` |
| [Neon](https://neon.tech) (Postgres) | Database | `DATABASE_URL` |
| [Resend](https://resend.com) | Sign-in emails | `RESEND_API_KEY`, `EMAIL_FROM` |
| [Creem](https://creem.io) | $25/month subscription | `CREEM_API_KEY`, `CREEM_WEBHOOK_SECRET`, `CREEM_PRODUCT_ID`, `CREEM_TEST_MODE=0` |
| Better Auth | Sessions | `BETTER_AUTH_SECRET`, `BETTER_AUTH_URL` |

Setup:

1. Run `npm run db:migrate` against your Neon database.
2. Verify your sending domain in Resend.
3. In Creem, create the monthly product and add the webhook
   `https://<your-domain>/api/auth/creem/webhook`.
4. Ask MadeByCue to allow browser uploads from your domain.
5. Optionally, change the monthly allowance with `MONTHLY_VIDEO_SECONDS` (default 120).
