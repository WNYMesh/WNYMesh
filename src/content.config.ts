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
    // Hidden from the site until set to false.
    draft: z.boolean().default(false),
  }),
});

export const collections = { pages, events };
