import type { PaymentEntity } from '@freemius/sdk';

/** Compute refunded credits from authoritative, pre-tax payment amounts.
 * A partial monetary refund includes the same fraction of the service fee.
 * Replays recompute an absolute total instead of incrementing a balance. */
export function refundedCredits(creditCents: number, payments: PaymentEntity[]) {
 const paid = payments.filter((p) => p.type === 'payment').reduce((sum, p) => sum + Math.abs(p.gross ?? 0), 0);
 const refunds = payments.filter((p) => p.type === 'refund').reduce((sum, p) => sum + Math.abs(p.gross ?? 0), 0);
 const disputed = payments.some((p) => ['disputed', 'lost_dispute', 'chargeback'].includes(p.type ?? ''));
 const won = payments.some((p) => p.type === 'won_dispute');
 if (disputed && !won) return creditCents;
 if (!paid) throw new Error('No confirmed payment for credit purchase');
 return Math.min(creditCents, Math.round(creditCents * refunds / paid));
}
