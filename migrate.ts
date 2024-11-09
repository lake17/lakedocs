// scripts/migrate-mdoc.ts
import { readdir, readFile, writeFile } from 'fs/promises';
import { join, parse } from 'path';
import yaml from 'js-yaml';
import chalk from 'chalk';

const DOCS_DIR = 'src/content/docs';

async function* walkDir(dir: string): AsyncGenerator<string> {
  const files = await readdir(dir, { withFileTypes: true });
  for (const file of files) {
    const path = join(dir, file.name);
    if (file.isDirectory()) {
      yield* walkDir(path);
    } else if (file.name.endsWith('.mdoc')) {
      yield path;
    }
  }
}

function extractFrontmatter(content: string): { frontmatter: string, body: string } {
  const matches = content.match(/^---\n([\s\S]*?)\n---\n([\s\S]*)$/);
  if (!matches) {
    throw new Error('Invalid frontmatter format');
  }
  return {
    frontmatter: matches[1],
    body: matches[2]
  };
}

async function migrateDocument(filePath: string): Promise<void> {
  try {
    const content = await readFile(filePath, 'utf-8');
    const { frontmatter, body } = extractFrontmatter(content);
    
    // Parse existing frontmatter
    const data = yaml.load(frontmatter) as Record<string, unknown>;
    
    // Get directory path relative to DOCS_DIR, excluding the filename
    const relativePath = filePath.replace(DOCS_DIR, '');
    const pathSegments = parse(relativePath).dir
      .split('/')
      .filter(Boolean)
      .map(segment => segment.toLowerCase());
    
    // Preserve existing tags and add directory-based tags
    const existingTags = Array.isArray(data.tags) ? data.tags : [];
    const newTags = [...new Set([...existingTags, ...pathSegments])];
    
    // Update frontmatter with new tags
    const updatedData = {
      ...data,
      tags: newTags
    };
    
    // Convert back to YAML
    const updatedFrontmatter = yaml.dump(updatedData, {
      lineWidth: -1, // Prevent line wrapping
      quotingType: '"' // Use double quotes
    });
    
    // Reconstruct document
    const updatedContent = `---\n${updatedFrontmatter}---\n${body}`;
    await writeFile(filePath, updatedContent);
    
    console.log(chalk.green(`✓ Migrated: ${filePath}`));
    console.log(chalk.blue(`  Tags: ${newTags.join(', ')}`));
  } catch (error) {
    console.error(chalk.red(`✗ Error migrating ${filePath}:`), error);
  }
}

async function migrateAllDocuments() {
  console.log(chalk.yellow('Starting Markdoc document migration...'));
  
  try {
    let count = 0;
    for await (const filePath of walkDir(DOCS_DIR)) {
      await migrateDocument(filePath);
      count++;
    }
    
    console.log(chalk.green(`\n✓ Migration complete! Processed ${count} documents.`));
  } catch (error) {
    console.error(chalk.red('\n✗ Migration failed:'), error);
    process.exit(1);
  }
}

// Run migration
migrateAllDocuments();