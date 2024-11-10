// src/content/config.ts
import { defineCollection, z } from 'astro:content';
import { docsSchema } from '@astrojs/starlight/schema';

export const collections = {
  docs: defineCollection({
    schema: docsSchema({
      extend: z.object({
        // Preserve special fields
        category: z.string(),
        owner: z.string(),
        createdOn: z.date(),
        createdBy: z.string(),
        
        // Tag support
        tags: z.array(z.string()).default([]),
        
        // Optional description for better discovery
        description: z.string().optional(),
      })
    })
  })
};