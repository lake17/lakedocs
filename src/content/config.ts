import { defineCollection } from 'astro:content';
import { docsSchema } from '@astrojs/starlight/schema';
import { baseSchema } from "../schemas/base.ts";

export const collections = {
	docs: defineCollection({ schema: docsSchema({
		extend: baseSchema,
	}),
 }),
};
