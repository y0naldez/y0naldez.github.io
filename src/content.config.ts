import { defineCollection } from 'astro:content';
import { glob } from 'astro/loaders';
import { z } from 'astro/zod';

const blog = defineCollection({
	// Load Markdown and MDX files in the `src/content/blog/` directory.
	loader: glob({ base: './src/content/blog', pattern: '**/*.{md,mdx}' }),

	// Type-check frontmatter using a schema.
	schema: ({ image }) =>
		z.object({
			title: z.string(),
			description: z.string(),

			// Transform string to Date object.
			pubDate: z.coerce.date(),
			updatedDate: z.coerce.date().optional(),

			// Image imported from src/assets or relative path in Markdown.
			heroImage: image().optional(),

			// Language for filtering posts.
			lang: z.enum(['es', 'en']).default('es'),

			// Collection used to group related posts on the blog index.
			category: z.string().optional(),

			// Optional tags for categories later.
			tags: z.array(z.string()).optional(),
		}),
});

export const collections = { blog };
