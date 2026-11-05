// Contact form (POST /api/contact): emails the message to the organization's inbox.
// Settings are listed in the README under "Forms".
import { EMAIL, readForm, isBot, done, fail, emailInbox } from '../lib/forms.mjs';

export const config = { path: '/api/contact', method: 'POST' };

export default async (req) => {
  const form = await readForm(req);
  if (!form) return fail(req, 'server', '/form-problem/');
  if (isBot(form)) return done(req, '/thanks/');

  const name = form.one('name', 100);
  const email = form.one('email', 254);
  const message = form.one('message', 5000);
  if (!name || !message) return fail(req, 'missing', '/form-problem/');
  if (!EMAIL.test(email)) return fail(req, 'email', '/form-problem/');

  const sent = await emailInbox({
    subject: `Website message from ${name}`,
    replyTo: { email, name },
    rows: [
      ['Name', name],
      ['Email', email],
      ['Message', message],
    ],
  });
  return sent ? done(req, '/thanks/') : fail(req, 'server', '/form-problem/');
};
