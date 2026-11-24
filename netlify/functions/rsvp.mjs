// Event registration form (POST /api/rsvp), shown on the page of each event with `rsvp: true`.
// Saves the person to the guest list, emails them a confirmation, and lets the form inbox know.
// The guest list is at /api/guest-list. Settings are listed in the README under "Event registration".
import { EMAIL, env, readForm, isBot, done, fail, sendEmail, emailInbox, escapeHtml } from '../lib/forms.mjs';
import { saveRsvp, loadEvents, headcount } from '../lib/rsvps.mjs';

export const config = { path: '/api/rsvp', method: 'POST' };

const PROBLEM = '/form-problem/';

export default async (req) => {
  const form = await readForm(req);
  if (!form) return fail(req, 'server', PROBLEM);
  const eventId = form.one('event', 100);
  const thanks = `/events/registered/?event=${encodeURIComponent(eventId)}`;
  if (isBot(form)) return done(req, thanks);

  const name = form.one('name', 100);
  const email = form.one('email', 254);
  const party = Math.min(Math.max(parseInt(form.one('party', 3), 10) || 1, 1), 6);
  if (!name) return fail(req, 'missing', PROBLEM);
  if (!EMAIL.test(email)) return fail(req, 'email', PROBLEM);

  const events = await loadEvents(req);
  if (!events) return fail(req, 'server', PROBLEM);
  const event = events.find((e) => e.id === eventId);
  if (!event || event.closed || (event.closesAt && Date.now() > event.closesAt)) return fail(req, 'closed', PROBLEM);

  if (event.capacity) {
    try {
      if ((await headcount(event.id, email)) + party > event.capacity) return fail(req, 'full', PROBLEM);
    } catch (err) {
      // If the guest list can't be read, take the registration rather than turn people away.
      console.error(`Registrations: could not check capacity (${err.message}).`);
    }
  }

  const { saved, updated } = await saveRsvp(event.id, { name, email, party });

  const [inboxSent] = await Promise.all([
    emailInbox({
      subject: `${updated ? 'Updated registration' : 'New registration'}: ${name} (${party}) for ${event.title}`,
      replyTo: { email, name },
      rows: [
        ['Event', event.title],
        ['Name', name],
        ['Email', email],
        ['People coming', String(party)],
        ['Guest list', saved ? `${new URL('/api/guest-list', req.url).href}?event=${event.id}` : 'NOT SAVED to the guest list. Add this person by hand.'],
      ],
    }),
    sendEmail({
      to: { email, name },
      fromName: 'WNYMesh',
      // Replies reach the organizers rather than the no-reply sending address.
      ...(env('FORM_INBOX') && { replyTo: { email: env('FORM_INBOX'), name: 'WNYMesh' } }),
      subject: `You're registered: ${event.title}`,
      ...confirmation(event, name, party),
    }),
  ]);
  // Success if the registration was recorded somewhere an organizer will see it.
  return saved || inboxSent ? done(req, thanks) : fail(req, 'server', PROBLEM);
};

function confirmation(event, name, party) {
  const people = party === 1 ? 'just you' : `${party} people, including you`;
  const lines = [
    `Hi ${name},`,
    `You're registered for ${event.title} (${people}).`,
    `When: ${event.when}`,
    `Where: ${event.location}`,
    event.mapUrl && `Map: ${event.mapUrl}`,
    event.note,
    `Details: ${event.url}`,
    `Need to change your number or can't make it? Reply to this email and let us know.`,
    `See you there!\nWNYMesh`,
  ].filter(Boolean);
  const p = 'style="font-family:sans-serif;font-size:16px;line-height:1.5;color:#1f2a30"';
  const html = [
    `<p ${p}>Hi ${escapeHtml(name)},</p>`,
    `<p ${p}>You're registered for <strong>${escapeHtml(event.title)}</strong> (${escapeHtml(people)}).</p>`,
    `<p ${p}><strong>When:</strong> ${escapeHtml(event.when)}<br><strong>Where:</strong> ${escapeHtml(event.location)}` +
      (event.mapUrl ? ` (<a href="${escapeHtml(event.mapUrl)}">map</a>)` : '') + '</p>',
    event.note && `<p ${p}>${escapeHtml(event.note)}</p>`,
    `<p ${p}><a href="${escapeHtml(event.url)}">Event details</a></p>`,
    `<p ${p}>Need to change your number or can't make it? Reply to this email and let us know.</p>`,
    `<p ${p}>See you there!<br>WNYMesh</p>`,
  ].filter(Boolean).join('\n');
  return { text: lines.join('\n\n'), html };
}
