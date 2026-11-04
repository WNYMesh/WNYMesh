// Handles the "Stay in the loop" signup form (POST /api/subscribe) and adds the person
// to MailerLite. Works without JavaScript in the browser: it answers with a redirect to
// a thank-you page, or to a "something went wrong" page.
//
// Settings (Netlify → Site configuration → Environment variables). Each must be
// available to the "Functions" scope, in every deploy context you test in:
//   MAILERLITE_API_KEY   required, mark it as secret
//   MAILERLITE_GROUP_ID  optional, the MailerLite group new subscribers join
// Problems are written to Netlify → Logs → Functions → subscribe.

const API = 'https://connect.mailerlite.com/api/subscribers';
const EMAIL = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;

export const config = { path: '/api/subscribe', method: 'POST' };

const go = (req, path) => Response.redirect(new URL(path, req.url), 303);

export default async (req) => {
  let form;
  try {
    form = await req.formData();
  } catch {
    return go(req, '/signup-problem/');
  }
  const get = (k) => String(form.get(k) ?? '').trim();

  // Honeypot: real people never fill this hidden field. Pretend it worked.
  if (get('website')) return go(req, '/thanks/subscribed/');

  const email = get('email');
  if (!EMAIL.test(email) || email.length > 254) return go(req, '/signup-problem/?reason=email');

  const apiKey = process.env.MAILERLITE_API_KEY?.trim();
  if (!apiKey) {
    console.error(
      'Signup failed: MAILERLITE_API_KEY is not available to this function. Check that the variable includes the Functions scope and this deploy context, then redeploy.'
    );
    return go(req, '/signup-problem/');
  }

  const fields = {};
  if (get('name')) fields.name = get('name').slice(0, 100);
  if (get('town')) fields.city = get('town').slice(0, 100);
  const body = { email, fields };
  const groupId = process.env.MAILERLITE_GROUP_ID?.trim();
  if (groupId) body.groups = [groupId];

  let res;
  try {
    res = await fetch(API, {
      method: 'POST',
      headers: { Authorization: `Bearer ${apiKey}`, 'Content-Type': 'application/json', Accept: 'application/json' },
      body: JSON.stringify(body),
      signal: AbortSignal.timeout(8000),
    });
  } catch (err) {
    console.error(`Signup failed: could not reach MailerLite (${err.name}).`);
    return go(req, '/signup-problem/');
  }

  if (res.ok) return go(req, '/thanks/subscribed/');

  // Never log the key or the subscriber's details. MailerLite's message says what was wrong.
  const detail = (await res.text()).slice(0, 500);
  console.error(`Signup failed: MailerLite returned ${res.status}. ${detail}`);
  if (res.status === 401) console.error('MailerLite rejected the API key. Create a new key and update MAILERLITE_API_KEY.');
  if (res.status === 422 && groupId) console.error('If the message mentions groups, check MAILERLITE_GROUP_ID.');
  return go(req, res.status === 422 && !/group/i.test(detail) ? '/signup-problem/?reason=email' : '/signup-problem/');
};
