// src/scripts/convert-bookmarks.ts
import fs from 'fs/promises';
import path from 'path';
import type { 
  BookmarkData, 
  BookmarkCollection, 
  BookmarkBucket, 
  Bookmark,
  BookmarkNote 
} from 'src/types/bookmarks';

interface LegacyNote {
  title: string;
}

interface LegacyLink {
  title: string;
  url?: string;
  notes?: LegacyNote[];
}

interface LegacyBucket {
  title: string;
  links: LegacyLink[];
}

interface LegacyCollection {
  title: string;
  buckets: LegacyBucket[];
}

interface LegacyBookmarkFile {
  key: string;
  collections: LegacyCollection[];
}

interface LegacyData {
  bookmarks: LegacyBookmarkFile[];
}

function convertNote(oldNote: LegacyNote): BookmarkNote {
  return {
    title: oldNote.title,
    description: undefined // New field to be filled manually
  };
}

function convertLink(oldLink: LegacyLink): Bookmark {
  return {
    title: oldLink.title,
    url: oldLink.url,
    icon: undefined, // New field to be filled manually
    notes: oldLink.notes?.map(convertNote),
    tags: [] // New field to be filled manually
  };
}

function convertBucket(oldBucket: LegacyBucket): BookmarkBucket {
  return {
    title: oldBucket.title,
    description: undefined, // New field to be filled manually
    links: oldBucket.links.map(convertLink)
  };
}

function convertCollection(oldCollection: LegacyCollection): BookmarkCollection {
  return {
    title: oldCollection.title,
    description: undefined, // New field to be filled manually
    buckets: oldCollection.buckets.map(convertBucket)
  };
}

function convertBookmarks(oldData: LegacyData): BookmarkData {
  // Flatten all collections from all bookmark files into a single array
  const allCollections = oldData.bookmarks.flatMap(file => 
    file.collections.map(convertCollection)
  );

  return {
    collections: allCollections
  };
}

async function main() {
  try {
    // Read the old format file
    const oldDataPath = path.join(process.cwd(), 'src/data/old-bookmarks.json');
    const oldDataRaw = await fs.readFile(oldDataPath, 'utf-8');
    const oldData: LegacyData = JSON.parse(oldDataRaw);

    // Convert to new format
    const newData = convertBookmarks(oldData);

    // Write the new format file
    const newDataPath = path.join(process.cwd(), 'src/data/bookmarks.json');
    await fs.writeFile(
      newDataPath, 
      JSON.stringify(newData, null, 2),
      'utf-8'
    );

    // Generate a report of fields that need manual review
    const reportPath = path.join(process.cwd(), 'src/data/bookmarks-conversion-report.md');
    const report = generateReport(newData);
    await fs.writeFile(reportPath, report, 'utf-8');

    console.log('Conversion completed successfully!');
    console.log('Please review src/data/bookmarks-conversion-report.md for fields that need manual attention.');

  } catch (error) {
    console.error('Error during conversion:', error);
    process.exit(1);
  }
}

function generateReport(data: BookmarkData): string {
  let report = '# Bookmarks Conversion Report\n\n';
  report += 'The following fields need manual review and completion:\n\n';

  data.collections.forEach((collection, cIndex) => {
    if (!collection.description) {
      report += `## Collection: "${collection.title}"\n`;
      report += '- Needs a description\n\n';
    }

    collection.buckets.forEach((bucket, bIndex) => {
      if (!bucket.description) {
        report += `### Bucket: "${bucket.title}" (in ${collection.title})\n`;
        report += '- Needs a description\n\n';
      }

      bucket.links.forEach((link, lIndex) => {
        const needsReview = [];
        if (!link.icon) needsReview.push('icon');
        if (!link.tags?.length) needsReview.push('tags');
        if (link.notes?.some(note => !note.description)) needsReview.push('note descriptions');

        if (needsReview.length > 0) {
          report += `#### Link: "${link.title}" (in ${bucket.title})\n`;
          report += `- Needs: ${needsReview.join(', ')}\n`;
          report += `- Path: collections[${cIndex}].buckets[${bIndex}].links[${lIndex}]\n\n`;
        }
      });
    });
  });

  return report;
}

// Run the conversion
main();