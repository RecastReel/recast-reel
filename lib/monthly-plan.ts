export const MONTHLY_PRICE_USD = 99;
export const MONTHLY_CREDITS = 80;

export const PRO_PLAN_ID = '78736';
export const PRO_PRICING_ID = '118636';

export function monthlyPlanId() {
 return process.env.FREEMIUS_MONTHLY_PLAN_ID || PRO_PLAN_ID;
}
