/** All amounts are USD cents. Freemius adds applicable tax at checkout. */
export const SERVICE_FEE_PERCENT = 22;
export const CREDIT_PACKS = [10, 25, 50, 100].map((usd) => ({
 usd,
 creditCents: usd * 100,
 feeCents: usd * SERVICE_FEE_PERCENT,
 totalCents: usd * (100 + SERVICE_FEE_PERCENT),
}));
export const usd = (cents: number) => new Intl.NumberFormat('en-US', { style: 'currency', currency: 'USD' }).format(cents / 100);
export const creditPack = (value: unknown) => CREDIT_PACKS.find((pack) => pack.usd === value);

export function packPricingId(amount: number) {
 return process.env[`FREEMIUS_PRICING_ID_TOPUP_${amount}`];
}
export function packForPricing(pricingId: string) {
 return CREDIT_PACKS.find((pack) => packPricingId(pack.usd) === pricingId);
}
