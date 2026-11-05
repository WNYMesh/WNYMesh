// Get Involved form (POST /api/get-involved): emails the details to the organization's
// inbox and adds the person to MailerLite's Volunteers group with their interests. If they
// ticked "Also send me the newsletter", they join the Newsletter group too.
// Settings are listed in the README under "Forms".
import { EMAIL, env, readForm, isBot, done, fail, emailInbox, addToMailerLite } from '../lib/forms.mjs';

export const config = { path: '/api/get-involved', method: 'POST' };

export default async (req) => {
  const form = await readForm(req);
  if (!form) return fail(req, 'server', '/form-problem/');
  if (isBot(form)) return done(req, '/thanks/');

  const first = form.one('first_name', 100);
  const last = form.one('last_name', 100);
  const email = form.one('email', 254);
  const town = form.one('town', 100);
  const interests = form.all('interest').slice(0, 10);
  const message = form.one('message', 5000);
  const newsletter = form.one('newsletter') === 'yes';
  if (!first) return fail(req, 'missing', '/form-problem/');
  if (!EMAIL.test(email)) return fail(req, 'email', '/form-problem/');

  const name = [first, last].filter(Boolean).join(' ');
  // Run both at once. The email is what matters for following up, so it decides success.
  const [sent] = await Promise.all([
    emailInbox({
      subject: `New volunteer: ${name}`,
      replyTo: { email, name },
      rows: [
        ['Name', name],
        ['Email', email],
        ['Town or neighborhood', town],
        ['Interested in', interests.join('\n')],
        ['Message', message],
        ['Newsletter', newsletter ? 'Yes, added to the newsletter' : 'No'],
      ],
    }),
    addToMailerLite({
      email,
      fields: { name: first, ...(last && { last_name: last }), ...(town && { city: town }) },
      customFields: interests.length ? { interests: interests.join(', ') } : {},
      groups: [
        env('MAILERLITE_VOLUNTEERS_GROUP_ID'),
        newsletter && (env('MAILERLITE_NEWSLETTER_GROUP_ID') || env('MAILERLITE_GROUP_ID')),
      ],
    }),
  ]);
  return sent ? done(req, '/thanks/') : fail(req, 'server', '/form-problem/');
};
