/** Choices for generated videos, shared by the studio and the server. */
export const GENERATE_SECONDS = [5, 10, 15];
export const GENERATE_RATIOS = ['16:9', '9:16', '1:1'];
export const MAX_REFERENCES = 4;
/** US cents as credits (1 credit = $1), e.g. 1895 → "18.95 credits". */
export function credits(cents: number) {
 const value = Math.max(0, Math.round(cents)) / 100;
 return `${Number.isInteger(value) ? value : value.toFixed(2)} ${value === 1 ? 'credit' : 'credits'}`;
}
