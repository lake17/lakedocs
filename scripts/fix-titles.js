import { readdirSync, readFileSync, writeFileSync } from 'fs';
import { join, basename } from 'path';
import { createInterface } from 'readline';
import { load } from 'js-yaml';

const rl = createInterface({
  input: process.stdin,
  output: process.stdout
});

const TITLE_RULES = {
  explanation: {
    validate: (title) => {
      const startsWithVerb = /^(configure|install|start|create|build|deploy|discover|set|update|modify)/i.test(title);
      return false;
    },
    format: (title) => `Understanding implied - starts with noun? "${title}"`,
  },
  procedure: {
    validate: (title) => {
      const startsWithVerb = /^(configure|install|start|create|build|deploy|set|update|modify)/i.test(title);
      return true;
    },
    format: (title) => `Starts with action verb? "${title}"`,
  },
  reference: {
    validate: (title) => {
      return false;
    },
    format: (title) => `Noun phrase without 'reference'? "${title}"`,
  },
  tutorial: {
    validate: (title) => {
      const startsWithVerb = /^(configure|install|start|create|build|deploy|set|update|modify)/i.test(title);
      return false;
    },
    format: (title) => `Starts with action verb and shows complete task? "${title}"`,
  }
};

function normalizeCategoryName(category) {
  return category.toLowerCase().trim();
}

function extractFrontmatter(content) {
  const fmMatch = content.match(/^---\s*\n([\s\S]*?)\n---/);
  if (!fmMatch) return null;
  
  try {
    return load(fmMatch[1]);
  } catch (e) {
    console.error('Error parsing frontmatter:', e);
    return null;
  }
}

async function analyzeCategories(contentDir) {
  const categories = new Set();
  const files = readdirSync(contentDir)
    .filter(f => f.endsWith('.mdoc'));

  files.forEach(file => {
    const filePath = join(contentDir, file);
    const content = readFileSync(filePath, 'utf-8');
    
    try {
      const fm = extractFrontmatter(content);
      if (fm && fm.category) {
        categories.add(normalizeCategoryName(fm.category));
      }
    } catch (error) {
      console.error(`Error processing ${file}:`, error.message);
    }
  });

  return Array.from(categories);
}

async function processDocuments(contentDir, targetCategory) {
  const files = readdirSync(contentDir)
    .filter(f => f.endsWith('.mdoc'));
  
  const updates = [];
  const skipped = [];
  let categoryCount = 0;

  console.log(`\nValidating titles for category: ${targetCategory}`);

  for (const file of files) {
    const filePath = join(contentDir, file);
    const content = readFileSync(filePath, 'utf-8');
    
    const fm = extractFrontmatter(content);
    if (!fm) {
      skipped.push({ file, reason: 'No frontmatter found' });
      continue;
    }

    if (!fm.category) {
      skipped.push({ file, reason: 'No category in frontmatter' });
      continue;
    }

    const normalizedCategory = normalizeCategoryName(fm.category);
    
    // Skip if not the target category
    if (normalizedCategory !== targetCategory) {
      continue;
    }

    categoryCount++;

    if (!fm.title) {
      skipped.push({ file, reason: 'No title in frontmatter' });
      continue;
    }

    const rule = TITLE_RULES[normalizedCategory];
    if (!rule) {
      skipped.push({ file, reason: `No validation rules for category: ${fm.category}` });
      continue;
    }

    if (!rule.validate(fm.title)) {
      console.log(`\nFile: ${file}`);
      console.log(`Category: ${fm.category}`);
      console.log(`Current title: ${fm.title}`);
      console.log(rule.format(fm.title));

      const newTitle = await promptForNewTitle();
      if (newTitle && newTitle !== fm.title) {
        updates.push({
          file: filePath,
          oldTitle: fm.title,
          newTitle,
          content
        });
      }
    }
  }

  // Print summary
  console.log('\n=== Processing Summary ===');
  console.log(`Documents in ${targetCategory} category: ${categoryCount}`);
  console.log(`Updates needed: ${updates.length}`);
  console.log(`Files skipped: ${skipped.length}`);
  
  if (skipped.length > 0) {
    console.log('\nSkipped Files:');
    skipped.forEach(({file, reason}) => {
      console.log(`- ${file}: ${reason}`);
    });
  }

  return updates;
}

async function promptForNewTitle() {
  return new Promise(resolve => {
    rl.question('Enter new title (or press enter to skip): ', answer => {
      resolve(answer.trim() || null);
    });
  });
}

async function applyUpdates(updates) {
  for (const update of updates) {
    const newContent = update.content.replace(
      `title: ${update.oldTitle}`,
      `title: ${update.newTitle}`
    );
    writeFileSync(update.file, newContent);
    console.log(`Updated ${basename(update.file)}: "${update.oldTitle}" -> "${update.newTitle}"`);
  }
}

async function main() {
  const contentDir = join(process.cwd(), 'src/content/docs');
  
  // Get command line argument for category
  const targetCategory = process.argv[2]?.toLowerCase();
  
  if (!targetCategory) {
    // If no category specified, show available categories
    const categories = await analyzeCategories(contentDir);
    console.log('\nAvailable categories:');
    categories.forEach(category => {
      console.log(`- ${category}`);
    });
    console.log('\nUsage: node script.js <category>');
    rl.close();
    return;
  }

  // Validate that we have rules for this category
  if (!TITLE_RULES[targetCategory]) {
    console.error(`No validation rules defined for category: ${targetCategory}`);
    console.log('Available categories:', Object.keys(TITLE_RULES).join(', '));
    rl.close();
    return;
  }

  const updates = await processDocuments(contentDir, targetCategory);
  
  if (updates.length === 0) {
    console.log(`No title updates needed for ${targetCategory} documents.`);
    rl.close();
    return;
  }

  const confirmed = await new Promise(resolve => {
    rl.question(`\nApply ${updates.length} updates? (y/n): `, answer => {
      resolve(answer.toLowerCase() === 'y');
    });
  });

  if (confirmed) {
    await applyUpdates(updates);
    console.log('\nUpdates complete!');
  } else {
    console.log('\nNo changes made.');
  }
  
  rl.close();
}

main().catch(console.error);