// Stripe webhook (POST /api/stripe-webhook): when a donation made through our donate form
// succeeds, email the donor a tax receipt and let the organization's inbox know.
// Listens for: checkout.session.completed, checkout.session.async_payment_succeeded
// (one-time gifts) and invoice.paid (every monthly gift, including the first).
// Settings are in the README under "Donations".
import { env, sendEmail, detailsTable } from '../lib/forms.mjs';
import { verifyStripeSignature } from '../lib/stripe.mjs';
import { donationFromEvent, receiptEmail, money } from '../lib/donations.mjs';
import site from '../../src/data/site.json' with { type: 'json' };

export const config = { path: '/api/stripe-webhook', method: 'POST' };

export default async (req) => {
  const raw = await req.text();
  const secret = env('STRIPE_WEBHOOK_SECRET');
  if (!secret) console.error('Stripe webhook: STRIPE_WEBHOOK_SECRET is not available to this function.');
  if (!verifyStripeSignature(raw, req.headers.get('stripe-signature'), secret)) {
    return new Response('Invalid signature', { status: 400 });
  }

  let event;
  try {
    event = JSON.parse(raw);
  } catch {
    return new Response('Bad JSON', { status: 400 });
  }

  const gift = donationFromEvent(event);
  if (!gift) return new Response('Ignored', { status: 200 });
  if (!gift.email) {
    console.error(`Stripe webhook: donation ${gift.reference} has no email address; no receipt sent.`);
    return new Response('No email', { status: 200 });
  }

  const inbox = env('FORM_INBOX');
  const receipt = receiptEmail(gift);
  const sent = await sendEmail({
    to: { email: gift.email, name: gift.name },
    replyTo: inbox ? { email: inbox, name: site.legalName } : undefined,
    fromName: site.legalName,
    fromEmail: env('DONATION_FROM') || env('FORM_FROM'),
    subject: receipt.subject,
    text: receipt.text,
    html: receipt.html,
  });
  // A failure tells Stripe to retry later, so the donor still gets a receipt.
  if (!sent) return new Response('Receipt not sent', { status: 500 });

  if (inbox) {
    const amount = money(gift.cents, gift.currency);
    const t = detailsTable([
      ['Donor', gift.name],
      ['Email', gift.email],
      ['Amount', amount],
      ['Type', gift.type],
      ['Reference', gift.reference],
    ]);
    // Only a heads-up for us; a failure here shouldn't make Stripe resend the donor's receipt.
    await sendEmail({
      to: { email: inbox },
      replyTo: { email: gift.email, name: gift.name },
      subject: `New donation: ${amount} from ${gift.name || gift.email}`,
      text: `${t.text}\n\nA receipt was emailed to the donor.`,
      html: `${t.html}<p style="font-family:sans-serif;color:#4d5e68;font-size:13px">A receipt was emailed to the donor.</p>`,
    });
  }
  return new Response('Receipt sent', { status: 200 });
};
