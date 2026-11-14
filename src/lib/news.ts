import { getCollection, type CollectionEntry } from 'astro:content';

export type Post = CollectionEntry<'news'>;

// Published posts, newest first.
export async function getPosts() {
  const all = await getCollection('news', ({ data }) => !data.draft);
  return all.sort((a, b) => b.data.date.getTime() - a.data.date.getTime());
}

export const formatDate = (d: Date) =>
  d.toLocaleDateString('en-US', { month: 'long', day: 'numeric', year: 'numeric', timeZone: 'UTC' });
