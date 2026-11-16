// Private guest list for event registrations (GET /api/guest-list).
// The browser asks for a password: any username, and the password in GUEST_LIST_PASSWORD.
//   /api/guest-list                          events that have registrations
//   /api/guest-list?event=fall-meetup        the list, with a head count (good for the door)
//   /api/guest-list?event=fall-meetup&format=csv   the same as a spreadsheet download
import { timingSafeEqual, createHash } from 'node:crypto';
import { env, escapeHtml } from '../lib/forms.mjs';
import { listRsvps, listRsvpEvents } from '../lib/rsvps.mjs';

export const config = { path: '/api/guest-list', method: 'GET' };

const PRIVATE = { 'Cache-Control': 'no-store', 'X-Robots-Tag': 'noindex' };

const digest = (s) => createHash('sha256').update(s).digest();

function authorized(req) {
  const password = env('GUEST_LIST_PASSWORD');
  if (!password) return false;
  const header = req.headers.get('authorization') || '';
  if (!header.startsWith('Basic ')) return false;
  const decoded = Buffer.from(header.slice(6), 'base64').toString();
  const given = decoded.slice(decoded.indexOf(':') + 1);
  return timingSafeEqual(digest(given), digest(password));
}

export default async (req) => {
  if (!env('GUEST_LIST_PASSWORD')) {
    console.error('Guest list: GUEST_LIST_PASSWORD is not set. Add it in Netlify and redeploy.');
    return new Response('The guest list password has not been set up yet. See the README under "Event registration".', {
      status: 503,
      headers: PRIVATE,
    });
  }
  if (!authorized(req)) {
    return new Response('Password required.', {
      status: 401,
      headers: { ...PRIVATE, 'WWW-Authenticate': 'Basic realm="WNYMesh guest list", charset="UTF-8"' },
    });
  }

  const url = new URL(req.url);
  const eventId = url.searchParams.get('event');
  try {
    if (!eventId) {
      const ids = await listRsvpEvents();
      const items = ids.map((id) => `<li><a href="?event=${encodeURIComponent(id)}">${escapeHtml(id)}</a></li>`).join('');
      return page('Guest lists', ids.length ? `<ul>${items}</ul>` : '<p>No one has registered for anything yet.</p>');
    }

    const rows = await listRsvps(eventId);
    const total = rows.reduce((n, r) => n + (r.party || 1), 0);
    if (url.searchParams.get('format') === 'csv') {
      // Quote every cell, and stop spreadsheet apps treating a name like "=SUM(...)" as a formula.
      const cell = (v) => `"${String(v ?? '').replace(/^[=+\-@\t\r]/, "'$&").replace(/"/g, '""')}"`;
      const when = (iso) => new Date(iso).toLocaleString('en-US', { timeZone: 'America/New_York' });
      const csv = [
        ['Name', 'Email', 'People', 'Registered'],
        ...rows.map((r) => [r.name, r.email, r.party, when(r.registeredAt)]),
        [],
        ['Total people', '', total, ''],
      ]
        .map((r) => r.map(cell).join(','))
        .join('\r\n');
      return new Response('﻿' + csv, {
        headers: {
          ...PRIVATE,
          'Content-Type': 'text/csv; charset=utf-8',
          'Content-Disposition': `attachment; filename="guest-list-${eventId.replace(/[^\w-]/g, '')}.csv"`,
        },
      });
    }

    const body = rows.length
      ? `<p class="count"><strong>${total}</strong> ${total === 1 ? 'person' : 'people'} from <strong>${rows.length}</strong> ${rows.length === 1 ? 'registration' : 'registrations'}</p>
         <p><a href="?event=${encodeURIComponent(eventId)}&amp;format=csv">Download as a spreadsheet (CSV)</a></p>
         <table><thead><tr><th></th><th>Name</th><th>People</th><th>Email</th></tr></thead><tbody>${rows
           .map(
             (r) =>
               `<tr><td><input type="checkbox" aria-label="Checked in"></td><td>${escapeHtml(r.name)}</td><td>${r.party}</td><td>${escapeHtml(r.email)}</td></tr>`
           )
           .join('')}</tbody></table>
         <p class="small">The checkboxes are for ticking people off at the door. They aren't saved.</p>`
      : '<p>No one has registered for this event yet.</p>';
    return page(`Guest list: ${eventId}`, body);
  } catch (err) {
    console.error(`Guest list: could not read registrations (${err.name}: ${err.message}).`);
    return new Response('Could not load the guest list. Try again in a minute.', { status: 502, headers: PRIVATE });
  }
};

function page(title, body) {
  const html = `<!doctype html><html lang="en"><head><meta charset="utf-8"><meta name="viewport" content="width=device-width, initial-scale=1">
<meta name="robots" content="noindex"><title>${escapeHtml(title)}</title>
<style>
body{font-family:system-ui,sans-serif;margin:0;padding:16px;color:#1f2a30;background:#fff;max-width:900px}
h1{font-size:1.4rem}.count{font-size:1.2rem}table{border-collapse:collapse;width:100%}
th,td{text-align:left;padding:10px 8px;border-bottom:1px solid #d8e0e4;vertical-align:top}
td:last-child{word-break:break-all}input{width:22px;height:22px}.small{color:#4d5e68;font-size:.9rem}
</style></head><body><h1>${escapeHtml(title)}</h1>${body}</body></html>`;
  return new Response(html, { headers: { ...PRIVATE, 'Content-Type': 'text/html; charset=utf-8' } });
}
