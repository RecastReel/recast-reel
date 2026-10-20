# Agent notes

## Freemius paywall

### 1. Premium features — how to identify them

Premium features are gated by `requirePlan()` in `lib/swap-api.ts`, which returns
**402** without an active Freemius subscription. Free routes don't call it.

| Premium feature | Entry point | Gated by |
| --- | --- | --- |
| Generate a video / swap a character | `POST /api/swap/swaps` | `requirePlan` + monthly seconds allowance |
| Upload media for a creation | `POST /api/swap/uploads` | `requirePlan` |

Local mode (`npm run dev` without `LOCAL_MODE=0`) has billing off; `planStatus()`
reports unlimited access and the MadeByCue key pays.

### 2. Paywalling premium features with Freemius

1. **Sell**: `SubscribeButton` POSTs `/api/billing/checkout` and opens the hosted
   Freemius checkout (sandbox while `FREEMIUS_SANDBOX` isn't `false`).
2. **Sync**: the checkout redirect (`/api/billing/redirect`) and webhooks
   (`/api/webhooks/freemius`) re-fetch the license from Freemius and upsert
   `user_fs_entitlement`. Freemius stays the source of truth.
3. **Gate**: `planStatus()` picks the active subscription for `FREEMIUS_PLAN_ID`
   and counts seconds used since the billing month started. No entitlement → 402.

All Freemius SDK calls are server-side; the keys come from env only.

### 3. Where the paywall library functions live

| Concern | File |
| --- | --- |
| SDK client, sandbox flag, checkout link, license sync, portal link | `lib/freemius.ts` |
| Checkout/portal/redirect/webhook handlers | `lib/billing-api.ts` (routes in `app/api/billing/*`, `app/api/webhooks/freemius`) |
| Entitlement resolve + allowance | `lib/plan.ts` (`planStatus`) |
| Paywall guard (402) | `lib/swap-api.ts` (`requirePlan`) |
| Entitlement mirror table | `lib/db/schema.ts` (`user_fs_entitlement`) |

Env (server-only, git-ignored): `FREEMIUS_PRODUCT_ID`, `FREEMIUS_API_KEY`,
`FREEMIUS_SECRET_KEY`, `FREEMIUS_PUBLIC_KEY`, `FREEMIUS_PLAN_ID`, `FREEMIUS_SANDBOX`.
