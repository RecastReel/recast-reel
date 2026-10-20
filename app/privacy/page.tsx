import type { Metadata } from 'next';
import { CONTACT, LegalPage } from '../legal';

export const metadata: Metadata = { title: 'Privacy Policy · Recast Reel' };
export const dynamic = 'force-dynamic';

export default function Privacy() {
 return (
  <LegalPage title="Privacy Policy">
   <p>Recast Reel (“Recast Reel”, “we”, “us”) runs recastreel.com. This policy explains what we collect when you use the site, why, and what you can do about it.</p>

   <h2>What we collect</h2>
   <ul>
    <li><strong>Your email address</strong>, to send sign-in links and run your account. We don’t ask for your name or a password.</li>
    <li><strong>What you upload and create</strong>: videos, character and reference images, prompts, and the videos we make for you.</li>
    <li><strong>Usage records</strong>: which videos you created, their length, cost and status, so we can track your credit balance and return credits for failed videos.</li>
    <li><strong>Subscription details</strong> from our payment provider: whether your plan is active and its billing dates. We never see or store your full card details.</li>
    <li><strong>Basic technical data</strong> such as IP address and browser type, used to keep sessions secure and stop abuse.</li>
   </ul>

   <h2>How we use it</h2>
   <p>Only to provide Recast Reel: signing you in, creating your videos, enforcing your credit balance, billing, preventing abuse, and contacting you about your account. We don’t sell your data, show ads, or use your uploads or videos to train AI models.</p>

   <h2>Who processes it for us</h2>
   <ul>
    <li><strong>MadeByCue</strong> creates the videos and stores uploads and results.</li>
    <li><strong>Freemius</strong> handles checkout, payments and invoices as the merchant of record.</li>
    <li><strong>Resend</strong> sends sign-in emails.</li>
    <li>Our <strong>hosting and database providers</strong> run the site and store account records.</li>
   </ul>
   <p>Each receives only what it needs for its part. We may also disclose information when required by law or to protect people from harm.</p>

   <h2>How long we keep it</h2>
   <ul>
    <li>Uploaded media and finished videos are deleted automatically after <strong>7 days</strong>. Download anything you want to keep.</li>
    <li>Your account and usage records are kept while your account exists.</li>
    <li>Billing records are kept as long as tax and accounting law requires.</li>
   </ul>

   <h2>Cookies</h2>
   <p>We use one essential cookie to keep you signed in. No advertising or tracking cookies.</p>

   <h2>Your choices</h2>
   <p>You can ask us for a copy of your data, to correct it, or to delete your account by emailing <a href={`mailto:${CONTACT}`}>{CONTACT}</a> from the address on your account. Deleting your account removes your account and usage records, except billing records we must keep. Depending on where you live, you may also have the right to object to processing or complain to your data protection authority.</p>

   <h2>Security</h2>
   <p>Data is encrypted in transit, media links are signed and short-lived, and each account can only reach its own videos. No system is perfectly secure, so please tell us if you spot a problem.</p>

   <h2>Children</h2>
   <p>Recast Reel is for people 18 and over. We don’t knowingly collect data from children.</p>

   <h2>Changes</h2>
   <p>If we change this policy we’ll update the date above, and email you about significant changes.</p>

   <h2>Contact</h2>
   <p>Questions about privacy: <a href={`mailto:${CONTACT}`}>{CONTACT}</a>.</p>
  </LegalPage>
 );
}
