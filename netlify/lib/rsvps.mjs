// Event registrations, kept in Netlify Blobs (store "rsvps"), one entry per person per event,
// keyed by event id and email so registering again updates the earlier entry.
import { getStore } from '@netlify/blobs';

const store = () => getStore({ name: 'rsvps', consistency: 'strong' });

/** An event id without stray slashes or spaces, e.g. "december-meetup/" → "december-meetup". */
export const cleanId = (id) => String(id || '').trim().replace(/^\/+|\/+$/g, '');

const keyFor = (eventId, email) => `${eventId}/${encodeURIComponent(email.toLowerCase())}`;

/** Save a registration. Returns { saved, updated } and never throws. */
export async function saveRsvp(eventId, entry) {
  try {
    const key = keyFor(eventId, entry.email);
    const earlier = await store().get(key, { type: 'json' });
    const now = new Date().toISOString();
    await store().setJSON(key, {
      ...entry,
      registeredAt: earlier?.registeredAt || now,
      updatedAt: now,
    });
    return { saved: true, updated: !!earlier };
  } catch (err) {
    console.error(`Registrations: could not save (${err.name}: ${err.message}).`);
    return { saved: false, updated: false };
  }
}

/** Every registration for an event, oldest first. Throws if the store can't be read. */
export async function listRsvps(eventId) {
  const s = store();
  const { blobs } = await s.list({ prefix: `${cleanId(eventId)}/` });
  const entries = await Promise.all(blobs.map((b) => s.get(b.key, { type: 'json' })));
  return entries.filter(Boolean).sort((a, b) => a.registeredAt.localeCompare(b.registeredAt));
}

/**
 * How many people are registered for an event, counting each person's group, leaving out
 * `exceptEmail` (so someone changing their own registration isn't counted twice).
 * Throws if the store can't be read.
 */
export async function headcount(eventId, exceptEmail = '') {
  const skip = exceptEmail.toLowerCase();
  const entries = await listRsvps(eventId);
  return entries.filter((e) => e.email.toLowerCase() !== skip).reduce((n, e) => n + (e.party || 1), 0);
}

/** The ids of every event that has registrations. Throws if the store can't be read. */
export async function listRsvpEvents() {
  const { directories } = await store().list({ directories: true });
  // Netlify Blobs may return directory names with a trailing slash ("fall-meetup/").
  return [...new Set(directories.map(cleanId))].sort();
}

/**
 * The events that take registrations, as published by the site at /events/rsvp.json.
 * Returns null if the list can't be loaded.
 */
export async function loadEvents(req) {
  try {
    const res = await fetch(new URL('/events/rsvp.json', req.url), { signal: AbortSignal.timeout(5000) });
    if (!res.ok) throw new Error(`status ${res.status}`);
    return (await res.json()).events;
  } catch (err) {
    console.error(`Registrations: could not load /events/rsvp.json (${err.message}).`);
    return null;
  }
}
