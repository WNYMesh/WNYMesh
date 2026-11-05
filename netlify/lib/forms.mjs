// Shared helpers for the site's form functions (netlify/functions/*.mjs).
//
// Every form works without JavaScript (the function answers with a redirect). When the
// page's script submits it instead, it asks for JSON so it can show problems in place
// and keep what the person typed.

export const EMAIL = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;

export const env = (name) => process.env[name]?.trim() || '';

/** Read a submitted form. Returns null if the body can't be read. */
export async function readForm(req) {
  try {
    const form = await req.formData();
    const one = (k, max = 200) => String(form.get(k) ?? '').trim().slice(0, max);
    const all = (k) => form.getAll(k).map((v) => String(v).trim().slice(0, 100)).filter(Boolean);
    return { one, all };
  } catch {
    return null;
  }
}

/** True when a bot filled the hidden honeypot field. */
export const isBot = (form) => !!form.one('website');

const wantsJson = (req) => (req.headers.get('accept') || '').includes('application/json');

/** Success: send the browser to a thank-you page. */
export function done(req, path) {
  if (wantsJson(req)) return Response.json({ ok: true, redirect: path });
  return Response.redirect(new URL(path, req.url), 303);
}

/** Failure: `reason` is 'email' (bad address), 'missing' (required field empty), or 'server'. */
export function fail(req, reason, fallbackPath) {
  if (wantsJson(req)) return Response.json({ ok: false, reason }, { status: reason === 'server' ? 502 : 400 });
  return Response.redirect(new URL(`${fallbackPath}?reason=${reason}`, req.url), 303);
}

const escapeHtml = (s) =>
  String(s).replace(/[&<>"']/g, (c) => ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&#39;' })[c]);
const oneLine = (s) => String(s).replace(/[\r\n]+/g, ' ').trim();

/**
 * Add or update a MailerLite subscriber. Returns true on success. Never throws.
 * If MailerLite rejects a custom field that hasn't been created yet, it retries
 * without the custom fields so the person still gets added.
 */
export async function addToMailerLite({ email, fields = {}, customFields = {}, groups = [] }) {
  const apiKey = env('MAILERLITE_API_KEY');
  if (!apiKey) {
    console.error('MailerLite: MAILERLITE_API_KEY is not available to this function. Check its scopes and deploy contexts, then redeploy.');
    return false;
  }
  const send = async (allFields) => {
    const body = { email, fields: allFields };
    const ids = groups.filter(Boolean);
    if (ids.length) body.groups = ids;
    return fetch('https://connect.mailerlite.com/api/subscribers', {
      method: 'POST',
      headers: { Authorization: `Bearer ${apiKey}`, 'Content-Type': 'application/json', Accept: 'application/json' },
      body: JSON.stringify(body),
      signal: AbortSignal.timeout(8000),
    });
  };
  try {
    const hasCustom = Object.keys(customFields).length > 0;
    let res = await send({ ...fields, ...customFields });
    if (res.status === 422 && hasCustom) {
      const detail = await res.text();
      if (/field/i.test(detail)) {
        console.error(`MailerLite: a custom field was rejected; saving without it. Create it under Subscribers → Fields. ${detail.slice(0, 300)}`);
        res = await send(fields);
      } else {
        console.error(`MailerLite returned 422. ${detail.slice(0, 500)}`);
        return false;
      }
    }
    if (res.ok) return true;
    // Never log the key or the person's details.
    console.error(`MailerLite returned ${res.status}. ${(await res.text()).slice(0, 500)}`);
    if (res.status === 401) console.error('MailerLite rejected the API key. Create a new key and update MAILERLITE_API_KEY.');
    if (res.status === 422) console.error('If the message mentions groups, check the MAILERLITE_*_GROUP_ID settings.');
    return false;
  } catch (err) {
    console.error(`MailerLite: could not be reached (${err.name}).`);
    return false;
  }
}

/**
 * Email a form submission to the organization's inbox through MailerSend.
 * Replying to the email replies to the person who filled in the form.
 * `rows` is a list of [label, value] pairs. Returns true on success. Never throws.
 */
export async function emailInbox({ subject, replyTo, rows }) {
  const apiKey = env('MAILERSEND_API_KEY');
  const to = env('FORM_INBOX');
  const from = env('FORM_FROM');
  const missing = [!apiKey && 'MAILERSEND_API_KEY', !to && 'FORM_INBOX', !from && 'FORM_FROM'].filter(Boolean);
  if (missing.length) {
    console.error(`Email: ${missing.join(', ')} not available to this function. Check scopes and deploy contexts, then redeploy.`);
    return false;
  }

  const filled = rows.filter(([, v]) => v);
  const text = filled.map(([k, v]) => `${k}:\n${v}`).join('\n\n') + '\n\nSent from the form on wnymesh.org. Reply to this email to answer them.';
  const html =
    '<table cellpadding="6" style="font-family:sans-serif;font-size:15px;border-collapse:collapse">' +
    filled
      .map(([k, v]) => `<tr><th align="left" valign="top" style="color:#1d3a4c;white-space:nowrap">${escapeHtml(k)}</th><td style="white-space:pre-wrap">${escapeHtml(v)}</td></tr>`)
      .join('') +
    '</table><p style="font-family:sans-serif;color:#4d5e68;font-size:13px">Sent from the form on wnymesh.org. Reply to this email to answer them.</p>';

  try {
    const res = await fetch('https://api.mailersend.com/v1/email', {
      method: 'POST',
      headers: { Authorization: `Bearer ${apiKey}`, 'Content-Type': 'application/json', Accept: 'application/json' },
      body: JSON.stringify({
        from: { email: from, name: 'WNYMesh website' },
        to: [{ email: to }],
        reply_to: { email: replyTo.email, name: oneLine(replyTo.name || replyTo.email).slice(0, 100) },
        subject: oneLine(subject).slice(0, 150),
        text,
        html,
      }),
      signal: AbortSignal.timeout(8000),
    });
    if (res.ok) return true;
    console.error(`Email: MailerSend returned ${res.status}. ${(await res.text()).slice(0, 500)}`);
    if (res.status === 401) console.error('MailerSend rejected the API key. Check MAILERSEND_API_KEY.');
    if (res.status === 422) console.error('Check that FORM_FROM uses a domain verified in MailerSend.');
    return false;
  } catch (err) {
    console.error(`Email: MailerSend could not be reached (${err.name}).`);
    return false;
  }
}
