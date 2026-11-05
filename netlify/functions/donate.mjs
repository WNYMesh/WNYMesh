// Donate form (POST /api/donate): starts a Stripe Checkout session for a one-time or
// monthly gift and sends the donor to Stripe's secure payment page. The receipt is sent
// by stripe-webhook.mjs once the payment succeeds. Settings are in the README under "Donations".
import { readForm, isBot, done, fail } from '../lib/forms.mjs';
import { stripePost, DONATION_METADATA } from '../lib/stripe.mjs';
import { toCents } from '../lib/donations.mjs';

export const config = { path: '/api/donate', method: 'POST' };

export default async (req) => {
  const form = await readForm(req);
  if (!form) return fail(req, 'server', '/donate/');
  if (isBot(form)) return done(req, '/donate/');

  const choice = form.one('amount', 20);
  const custom = form.one('custom_amount', 20);
  const cents = toCents(choice === 'other' || custom ? custom : choice);
  if (!cents) return fail(req, 'amount', '/donate/');
  const monthly = form.one('frequency') === 'monthly';

  const origin = new URL(req.url).origin;
  const name = monthly ? 'Monthly donation to WNYMesh Inc.' : 'Donation to WNYMesh Inc.';
  const lineItem = {
    quantity: 1,
    price_data: {
      currency: 'usd',
      unit_amount: cents,
      product_data: { name },
      ...(monthly && { recurring: { interval: 'month' } }),
    },
  };

  const params = {
    mode: monthly ? 'subscription' : 'payment',
    line_items: [lineItem],
    success_url: `${origin}/donate/thanks/`,
    cancel_url: `${origin}/donate/`,
    metadata: DONATION_METADATA,
    ...(monthly
      ? { subscription_data: { description: name, metadata: DONATION_METADATA } }
      : {
          submit_type: 'donate',
          payment_intent_data: { description: name, metadata: DONATION_METADATA },
        }),
  };

  const { ok, data } = await stripePost('checkout/sessions', params);
  if (!ok || !data?.url) return fail(req, 'server', '/donate/');
  return done(req, data.url);
};
