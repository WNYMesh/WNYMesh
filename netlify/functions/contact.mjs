// Contact form (POST /api/contact): emails the message to the organization's inbox.
// If they ticked "Also send me the newsletter", they join MailerLite's Newsletter group.
// Settings are listed in the README under "Forms".
import { EMAIL, env, readForm, isBot, done, fail, emailInbox, addToMailerLite } from '../lib/forms.mjs';

export const config = { path: '/api/contact', method: 'POST' };

export default async (req) => {
  const form = await readForm(req);
  if (!form) return fail(req, 'server', '/form-problem/');
  if (isBot(form)) return done(req, '/thanks/');

  const name = form.one('name', 100);
  const email = form.one('email', 254);
  const message = form.one('message', 5000);
  const newsletter = form.one('newsletter') === 'yes';
  if (!name || !message) return fail(req, 'missing', '/form-problem/');
  if (!EMAIL.test(email)) return fail(req, 'email', '/form-problem/');

  // Run both at once. The email is what matters, so it decides success.
  const [sent] = await Promise.all([
    emailInbox({
      subject: `Website message from ${name}`,
      replyTo: { email, name },
      rows: [
        ['Name', name],
        ['Email', email],
        ['Message', message],
        ['Newsletter', newsletter ? 'Yes, added to the newsletter' : 'No'],
      ],
    }),
    newsletter &&
      addToMailerLite({
        email,
        fields: { name },
        groups: [env('MAILERLITE_NEWSLETTER_GROUP_ID') || env('MAILERLITE_GROUP_ID')],
      }),
  ]);
  return sent ? done(req, '/thanks/') : fail(req, 'server', '/form-problem/');
};
