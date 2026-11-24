// Events that take registrations, read by the registration function (netlify/functions/rsvp.mjs)
// so the details in confirmation emails always match the website.
import type { APIRoute } from 'astro';
import { getCollection } from 'astro:content';
import { eventPath } from '../../lib/events';

const DAY_END_MS = 29 * 60 * 60 * 1000;

export const GET: APIRoute = async ({ site }) => {
  const events = await getCollection('events', ({ data }) => !data.draft && data.rsvp);
  const list = events.map((e) => ({
    id: e.id,
    title: e.data.title,
    when: e.data.when,
    location: e.data.location,
    mapUrl: e.data.mapUrl || '',
    note: e.data.rsvpNote || '',
    url: new URL(eventPath(e), site ?? 'https://wnymesh.org').href,
    closed: e.data.rsvpClosed,
    capacity: e.data.capacity ?? null,
    closesAt: e.data.date ? e.data.date.getTime() + DAY_END_MS : null,
  }));
  return new Response(JSON.stringify({ events: list }), { headers: { 'Content-Type': 'application/json' } });
};
