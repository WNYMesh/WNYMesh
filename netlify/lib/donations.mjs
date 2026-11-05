// Donation helpers shared by the donate and stripe-webhook functions.
import { detailsTable, escapeHtml } from './forms.mjs';
import site from '../../src/data/site.json' with { type: 'json' };

export const MIN_DOLLARS = 5;
export const MAX_DOLLARS = 10000;

/** Dollars as typed ("$1,250.5") → whole cents, or null if not a usable amount. */
export function toCents(raw) {
  const cleaned = String(raw ?? '').replace(/[$,\s]/g, '');
  if (!/^\d+(\.\d{1,2})?$/.test(cleaned)) return null;
  const cents = Math.round(Number(cleaned) * 100);
  return cents >= MIN_DOLLARS * 100 && cents <= MAX_DOLLARS * 100 ? cents : null;
}

const isDonation = (metadata) => metadata?.purpose === 'donation';
export const money = (cents, currency = 'usd') =>
  new Intl.NumberFormat('en-US', { style: 'currency', currency: currency.toUpperCase() }).format(cents / 100);
const day = (unixSeconds) =>
  new Date(unixSeconds * 1000).toLocaleDateString('en-US', { year: 'numeric', month: 'long', day: 'numeric', timeZone: 'America/New_York' });

/** Pull what a receipt needs out of a Stripe event, or null if it isn't a completed donation. */
export function donationFromEvent(event) {
  const obj = event?.data?.object ?? {};
  switch (event?.type) {
    case 'checkout.session.completed':
    case 'checkout.session.async_payment_succeeded': {
      // Monthly gifts are receipted from invoice.paid instead, so each month gets one.
      if (obj.mode !== 'payment' || obj.payment_status !== 'paid' || !isDonation(obj.metadata)) return null;
      return {
        email: obj.customer_details?.email,
        name: obj.customer_details?.name,
        cents: obj.amount_total,
        currency: obj.currency,
        paidAt: obj.created,
        type: 'One-time donation',
        reference: obj.payment_intent || obj.id,
      };
    }
    case 'invoice.paid': {
      // Where the subscription's metadata lives depends on the Stripe API version.
      const metadata =
        obj.parent?.subscription_details?.metadata ?? obj.subscription_details?.metadata ?? obj.lines?.data?.[0]?.metadata;
      if (!isDonation(metadata) || !obj.amount_paid) return null;
      return {
        email: obj.customer_email,
        name: obj.customer_name,
        cents: obj.amount_paid,
        currency: obj.currency,
        paidAt: obj.status_transitions?.paid_at ?? obj.created,
        type: obj.billing_reason === 'subscription_create' ? 'Monthly donation (first gift)' : 'Monthly donation',
        reference: obj.number || obj.id,
      };
    }
    default:
      return null;
  }
}

/** The donor's receipt: amount, date, and the statements the IRS expects from a 501(c)(3). */
export function receiptEmail(d) {
  const first = (d.name || '').trim().split(/\s+/)[0];
  const rows = [
    ['Amount', money(d.cents, d.currency)],
    ['Date', day(d.paidAt)],
    ['Type', d.type],
    ['Reference', d.reference],
  ];
  const legal =
    `${site.legalName} is a tax-exempt organization under section 501(c)(3) of the Internal Revenue Code ` +
    `(EIN ${site.ein}). No goods or services were provided in exchange for this contribution. ` +
    'Please keep this receipt for your tax records.';
  const address = site.mailingAddress.join(' · ');
  const monthlyNote = d.type.startsWith('Monthly')
    ? 'You will get a receipt like this each month. To change or cancel your monthly gift, just reply to this email.'
    : '';
  const table = detailsTable(rows);
  const greeting = first ? `Thank you for your gift, ${first}!` : 'Thank you for your gift!';
  const intro = 'Your donation helps keep Western New York neighbors connected when the power and cell service go out.';

  const text = [greeting, intro, table.text, legal, monthlyNote, `${address} · wnymesh.org`].filter(Boolean).join('\n\n');
  const html =
    '<div style="font-family:Arial,sans-serif;color:#23323b;font-size:15px;line-height:1.55;max-width:600px">' +
    `<p style="font-size:20px;font-weight:bold;color:#1d3a4c;margin:0 0 12px">${escapeHtml(greeting)}</p>` +
    `<p>${escapeHtml(intro)}</p>` +
    table.html +
    `<p style="background:#fbeed6;border-left:4px solid #e8a33d;padding:10px 14px;font-size:14px">${escapeHtml(legal)}</p>` +
    (monthlyNote ? `<p style="font-size:14px">${escapeHtml(monthlyNote)}</p>` : '') +
    `<p style="font-size:13px;color:#4d5e68">${escapeHtml(address)} · <a href="https://wnymesh.org">wnymesh.org</a></p></div>`;
  return { subject: `Your donation receipt from ${site.legalName}`, text, html };
}
