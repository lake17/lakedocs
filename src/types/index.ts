// src/types/index.ts
import type { CollectionEntry } from "astro:content";

export type Rank = 1|2|3|4|5|6;

export interface TeamMember {
  name: string;
  avatar: string;
  email: string;
  rank: Rank;
  id: string;
}

export interface TeamStats extends TeamMember {
  docs: number;
  words: number;
  score: number;
}

export interface RequestedDoc {
  title: string;
  since: string;
  type: "procedure" | "explanation" | "reference" | "tutorial";
  status: "pending" | "fulfilled";
  fulfilledOn: string;
  fulfilledBy: string;
  docId: string;
  tags: string[];
}

export const TITLE_THRESHOLDS = {
  1: 150,    // ~1 month of active contribution
  2: 450,    // ~3 months
  3: 900,    // ~6 months
  4: 1800,   // ~1 year
  5: 2700,   // ~1.5 years
  6: 3600    // ~2 years
} as const;

export type Doc = CollectionEntry<"docs">;