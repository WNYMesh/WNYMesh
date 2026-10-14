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
