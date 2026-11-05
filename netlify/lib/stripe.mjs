// Minimal Stripe helpers for the donation functions. Talks to Stripe's REST API directly,
// so the site needs no extra packages.
import { createHmac, timingSafeEqual } from 'node:crypto';
import { env } from './forms.mjs';

// Turn { a: { b: 1 }, c: [{ d: 2 }] } into Stripe's form fields: a[b]=1&c[0][d]=2
function encode(params, prefix = '', out = new URLSearchParams()) {
  for (const [key, value] of Object.entries(params)) {
    if (value === undefined || value === null) continue;
    const name = prefix ? `${prefix}[${key}]` : key;
    if (typeof value === 'object') encode(value, name, out);
    else out.append(name, String(value));
  }
  return out;
}

/** POST to the Stripe API. Returns { ok, data }. Never throws, never logs the key. */
export async function stripePost(path, params) {
  const key = env('STRIPE_SECRET_KEY');
  if (!key) {
    console.error('Stripe: STRIPE_SECRET_KEY is not available to this function. Check its scopes and deploy contexts, then redeploy.');
    return { ok: false };
  }
  try {
    const res = await fetch(`https://api.stripe.com/v1/${path}`, {
      method: 'POST',
      headers: { Authorization: `Bearer ${key}`, 'Content-Type': 'application/x-www-form-urlencoded' },
      body: encode(params),
      signal: AbortSignal.timeout(10000),
    });
    const data = await res.json().catch(() => ({}));
    if (!res.ok) console.error(`Stripe returned ${res.status}: ${data?.error?.message ?? 'no message'}`);
    return { ok: res.ok, data };
  } catch (err) {
    console.error(`Stripe could not be reached (${err.name}).`);
    return { ok: false };
  }
}

/**
 * Check the Stripe-Signature header on a webhook, so only Stripe can trigger receipts.
 * See https://docs.stripe.com/webhooks#verify-manually. Returns true if valid.
 */
export function verifyStripeSignature(rawBody, header, secret, toleranceSeconds = 300, now = Date.now() / 1000) {
  if (!header || !secret) return false;
  const parts = header.split(',').map((p) => p.split('='));
  const timestamp = Number(parts.find(([k]) => k === 't')?.[1]);
  const signatures = parts.filter(([k]) => k === 'v1').map(([, v]) => v);
  if (!timestamp || !signatures.length || Math.abs(now - timestamp) > toleranceSeconds) return false;
  const expected = createHmac('sha256', secret).update(`${timestamp}.${rawBody}`).digest('hex');
  return signatures.some((sig) => {
    const a = Buffer.from(sig, 'hex');
    const b = Buffer.from(expected, 'hex');
    return a.length === b.length && timingSafeEqual(a, b);
  });
}

/** Marks Stripe objects created by our donate form, so other Stripe activity is ignored. */
export const DONATION_METADATA = { purpose: 'donation', source: 'wnymesh.org' };
