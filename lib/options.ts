/** Choices for generated videos, shared by the studio and the server. */
export const GENERATE_SECONDS = [5, 10, 15];
export const GENERATE_RATIOS = ['16:9', '9:16', '1:1'];
export const MAX_REFERENCES = 4;
/** MadeByCue's per-second prices in cents, for rough guides only; real
 * charges come from its estimate and task cost. */
export const CENTS_PER_SECOND = { generate: 21, swap: 18 };

/** US cents as dollars, e.g. 1050 → "$10.50". */
export function usd(cents: number) {
 return `$${(Math.max(0, cents) / 100).toFixed(2)}`;
}
