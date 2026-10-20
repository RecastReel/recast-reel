import type { Metadata } from 'next';
import Link from 'next/link';
import { credits } from '../../lib/options';
import { PLAN } from '../../lib/plan';
import { CONTACT, LegalPage } from '../legal';

export const metadata: Metadata = { title: 'Terms of Service · Recast Reel' };
export const dynamic = 'force-dynamic';

export default function Terms() {
 return (
  <LegalPage title="Terms of Service">
   <p>These terms are an agreement between you and Recast Reel (“Recast Reel”, “we”, “us”) for using recastreel.com. By signing in, you accept them. If you don’t agree, please don’t use the service.</p>

   <h2>1. Who can use Recast Reel</h2>
   <p>You must be at least 18 and able to enter a binding contract. You’re responsible for your account and for everything created with it. Keep access to your email secure, because sign-in links are sent there.</p>

   <h2>2. Subscription and credits</h2>
   <ul>
    <li>Recast Reel costs ${PLAN.priceUsd} per month, plus any applicable taxes, and adds {credits(PLAN.creditCents)} to your balance each billing month. One credit is worth $1 of video.</li>
    <li>Each video uses credits equal to our video provider’s price for it, shown before you start it. The final amount can be slightly higher or lower once the video is finished. Videos that fail, are cancelled or expire give their credits back.</li>
    <li>Unused credits don’t expire and roll over to later months. You can spend them while your subscription is active; if you cancel, they are kept and become usable again when you resubscribe. Credits have no cash value and aren’t refundable.</li>
    <li>Payments are processed by Freemius as merchant of record, and the subscription renews monthly until you cancel.</li>
    <li>You can cancel anytime from your account page and keep access until the end of the period you paid for. Payments aren’t refunded for partial months, except where the law requires it.</li>
    <li>We may change the price or monthly credits with at least 30 days’ notice. Changes apply from your next billing month.</li>
   </ul>

   <h2>3. Your content</h2>
   <p>You keep ownership of what you upload (videos, images and prompts) and of the videos you create, as far as the law allows. You give us a limited licence to store and process that content only to provide the service to you. Uploads and finished videos are deleted after 7 days, so download what you want to keep.</p>
   <p>You confirm that you have all the rights and permissions needed for what you upload. That includes the consent of any real person who appears in it or whose likeness you use.</p>

   <h2>4. Acceptable use</h2>
   <p>You may not use Recast Reel to create or share content that:</p>
   <ul>
    <li>puts a real person’s face or likeness into a video without their consent, or impersonates someone to deceive others;</li>
    <li>is sexual or intimate content of a real person, or any sexual content involving minors;</li>
    <li>harasses, threatens, defames or bullies anyone;</li>
    <li>is used for fraud, scams, election or political disinformation, or to pass AI video off as real footage in order to mislead;</li>
    <li>infringes someone else’s copyright, trademark, privacy or publicity rights;</li>
    <li>is otherwise illegal where you or the people depicted live.</li>
   </ul>
   <p>You also may not try to get around your credit balance, access other people’s videos, overload or probe the service, or resell access without our written permission. Where the law requires AI-generated media to be labelled, you are responsible for labelling it.</p>
   <p>We may refuse, remove or stop processing content, and suspend or close accounts, that break these rules. When the law requires it, we report illegal content.</p>

   <h2>5. AI output</h2>
   <p>Videos are made by AI models and can be inaccurate, inconsistent or unexpected. You decide how to use what you create and you’re responsible for it. Similar prompts from other users can produce similar results.</p>

   <h2>6. Availability</h2>
   <p>We work to keep Recast Reel running well, but the service is provided “as is” and “as available”. We don’t guarantee it will be uninterrupted, error-free, or finish within any particular time. We may change or discontinue features. If we shut down the service, we’ll give notice and refund any prepaid, unused subscription period.</p>

   <h2>7. Liability</h2>
   <p>To the extent the law allows, Recast Reel is not liable for indirect, incidental, special or consequential damages, or for lost profits, data or goodwill. Our total liability for any claim is limited to the amount you paid us in the 3 months before the claim. Nothing in these terms limits liability that cannot be limited by law, or your rights as a consumer.</p>

   <h2>8. Indemnity</h2>
   <p>If someone makes a claim against us because of content you uploaded or created, or because you broke these terms, you agree to cover our reasonable costs and losses from it.</p>

   <h2>9. Ending your use</h2>
   <p>You can stop using Recast Reel and cancel at any time, and ask us to delete your account as described in the <Link href="/privacy">Privacy Policy</Link>. We may suspend or end your access if you break these terms. Sections 3 (licence aside), 5, 7 and 8 continue to apply afterwards.</p>

   <h2>10. Changes to these terms</h2>
   <p>We may update these terms. We’ll change the date above and email you about significant changes. If you keep using Recast Reel after a change takes effect, you accept the new terms.</p>

   <h2>11. Contact</h2>
   <p>Questions about these terms: <a href={`mailto:${CONTACT}`}>{CONTACT}</a>.</p>
  </LegalPage>
 );
}
