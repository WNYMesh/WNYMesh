import { getCollection, type CollectionEntry } from 'astro:content';

export type Event = CollectionEntry<'events'>;

// Events with no date yet count as upcoming. Dated events are past once the day is over.
export async function getEvents() {
  const all = await getCollection('events', ({ data }) => !data.draft);
  const startOfToday = new Date();
  startOfToday.setHours(0, 0, 0, 0);
  const isPast = (e: Event) => !!e.data.date && e.data.date < startOfToday;
  const byDate = (a: Event, b: Event) =>
    (a.data.date?.getTime() ?? Infinity) - (b.data.date?.getTime() ?? Infinity);
  return {
    upcoming: all.filter((e) => !isPast(e)).sort(byDate),
    past: all.filter(isPast).sort((a, b) => byDate(b, a)),
  };
}

/** Each event has its own page, e.g. /events/fall-meetup/ (set `slug` in the event's file for a short address). */
export const eventPath = (e: Event) => `/events/${e.id}/`;

// The event day ends at midnight in Buffalo: 29 hours after midnight UTC covers Eastern time all year.
const DAY_END_MS = 29 * 60 * 60 * 1000;

/** Whether people can register for the event right now (checked when the site is built). */
export const rsvpOpen = (e: Event) =>
  e.data.rsvp && !e.data.rsvpClosed && (!e.data.date || Date.now() < e.data.date.getTime() + DAY_END_MS);
