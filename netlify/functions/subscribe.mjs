// "Stay in the loop" signup form (POST /api/subscribe): adds the person to MailerLite.
// Settings are listed in the README under "Forms".
import { EMAIL, env, readForm, isBot, done, fail, addToMailerLite } from '../lib/forms.mjs';

export const config = { path: '/api/subscribe', method: 'POST' };

export default async (req) => {
  const form = await readForm(req);
  if (!form) return fail(req, 'server', '/signup-problem/');
  if (isBot(form)) return done(req, '/thanks/subscribed/');

  const email = form.one('email', 254);
  if (!EMAIL.test(email)) return fail(req, 'email', '/signup-problem/');

  const fields = {};
  const first = form.one('first_name', 100) || form.one('name', 100);
  if (first) fields.name = first;
  if (form.one('last_name')) fields.last_name = form.one('last_name', 100);
  if (form.one('town')) fields.city = form.one('town', 100);

  const ok = await addToMailerLite({
    email,
    fields,
    groups: [env('MAILERLITE_NEWSLETTER_GROUP_ID') || env('MAILERLITE_GROUP_ID')],
  });
  return ok ? done(req, '/thanks/subscribed/') : fail(req, 'server', '/signup-problem/');
};
