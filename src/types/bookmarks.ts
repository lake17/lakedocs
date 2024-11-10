// src/types/bookmarks.ts
  
  export interface Bookmark {
    title: string;
    url?: string;
    icon?: string;
    note?: string;
    tags?: string[];
  }
  
  export interface BookmarkBucket {
    title: string;
    description?: string;
    links: Bookmark[];
  }
  
  export interface BookmarkCollection {
    title: string;
    description?: string;
    buckets: BookmarkBucket[];
  }
  
  export interface BookmarkData {
    collections: BookmarkCollection[];
  }