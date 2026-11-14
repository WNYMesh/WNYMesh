import { defineCollection, z } from 'astro:content';
import { glob } from 'astro/loaders';

// Long-form page text that board members can edit in plain Markdown.
const pages = defineCollection({
  loader: glob({ pattern: '**/*.md', base: './src/content/pages' }),
  schema: z.object({
    title: z.string(),
    description: z.string(),
  }),
});

const events = defineCollection({
  loader: glob({ pattern: '**/*.md', base: './src/content/events' }),
  schema: z.object({
    title: z.string(),
    // Leave `date` out while the date is still being decided; `when` is shown instead.
    date: z.coerce.date().optional(),
    when: z.string(),
    location: z.string(),
    summary: z.string(),
    // Optional paid registration through a Square payment link (https://square.link/u/...).
    registrationUrl: z.string().url().optional().or(z.literal('')),
    price: z.string().optional(),
    // Hidden from the site until set to false.
    draft: z.boolean().default(false),
  }),
});

// News posts and press coverage.
const news = defineCollection({
  loader: glob({ pattern: '**/*.md', base: './src/content/news' }),
  schema: z.object({
    title: z.string(),
    date: z.coerce.date(),
    summary: z.string(),
    // For press coverage: who ran the story, its headline, and a link to it.
    outlet: z.string().optional(),
    storyTitle: z.string().optional(),
    storyUrl: z.string().url().optional().or(z.literal('')),
    // The part after "watch?v=" in a YouTube link.
    videoId: z.string().optional(),
    // Shown on the home page while true.
    featured: z.boolean().default(false),
    // Hidden from the site until set to false.
    draft: z.boolean().default(false),
  }),
});

export const collections = { pages, events, news };
