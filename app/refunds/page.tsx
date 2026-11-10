import type { Metadata } from 'next';
import Link from 'next/link';
import { CONTACT, LegalPage } from '../legal';

export const metadata: Metadata = { title: 'Refund Policy · Recast Reel' };
export const dynamic = 'force-dynamic';

export default function Refunds() {
 return (
  <LegalPage title="Refund Policy">
   <p>This policy applies to payments for Recast Reel and forms part of our <Link href="/terms">Terms of Service</Link>. Nothing in this policy limits refunds or other remedies required by applicable law.</p>

   <h2>Consumed credits</h2>
   <p>Credits successfully consumed to generate a video are non-refundable because the processing service has already been delivered. AI results can vary; dissatisfaction with a successfully generated result alone does not qualify consumed credits for a refund. This does not exclude remedies for a defective service or any rights required by law.</p>

   <h2>Unused credits</h2>
   <p>You may request a refund for unused purchased credits within 14 days of purchase. If some credits from that purchase have been consumed, only the unused portion is eligible. Refunds are calculated using the price actually paid for the eligible unused portion, including the proportional service fee, if charged. Any applicable tax adjustment is handled by Freemius. Promotional or free credits are not refundable for cash.</p>
   <p>Credits approved for a refund are removed from your balance and cannot subsequently be used. We verify purchase and usage records before processing a refund. Credits are not otherwise redeemable or transferable for cash.</p>

   <h2>Failed generations</h2>
   <p>When a generation fails, is cancelled, or expires, the credits charged for that generation are automatically restored to your Recast Reel balance once its status is confirmed. Restoring credits is not a refund to your payment method. If credits have not been restored, contact us with the generation details.</p>

   <h2>How to request a refund</h2>
   <p>Email <a href={`mailto:${CONTACT}`}>{CONTACT}</a> from your account email address with your purchase receipt or order reference and the reason for your request. Do not send card details or passwords. Approved monetary refunds are processed through Freemius, our merchant of record, to the original payment method. The time for a refund to appear depends on the payment provider and your bank.</p>
   <p>For existing subscriptions, cancellation stops future renewals; it does not itself request a refund. Please contact us separately to request a refund under this policy.</p>

   <h2>Fees and taxes</h2>
   <p>Any service fee is disclosed before payment and is separate from sales tax or VAT. Applicable taxes are calculated and collected by Freemius at checkout. The checkout shows the final amount payable before you confirm your purchase.</p>
  </LegalPage>
 );
}
