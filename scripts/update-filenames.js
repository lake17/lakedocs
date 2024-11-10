import fs from 'fs';
import path from 'path';
import yaml from 'js-yaml'
import * as readline from 'node:readline';
// You may need to: npm install js-yaml

/**
 * Convert a title to a filename-friendly slug
 * @param {string} title The document title
 * @returns {string} A filename-friendly slug
 */
function titleToSlug(title) {
  return title
    .toLowerCase()
    // Replace special characters with spaces
    .replace(/[^a-z0-9]+/g, ' ')
    // Trim spaces from ends
    .trim()
    // Replace spaces with hyphens
    .replace(/\s+/g, '-')
    // Remove any remaining unwanted characters
    .replace(/[^a-z0-9-]/g, '');
}

/**
 * Extract frontmatter from markdown content
 * @param {string} content The full markdown file content
 * @returns {Object|null} Parsed frontmatter or null if none found
 */
function extractFrontmatter(content) {
  const fmMatch = content.match(/^---\n([\s\S]*?)\n---/);
  if (!fmMatch) return null;
  
  try {
    return yaml.load(fmMatch[1]);
  } catch (e) {
    console.error('Error parsing frontmatter:', e);
    return null;
  }
}

/**
 * Process all documents in a directory
 * @param {string} contentDir The directory containing markdown files
 * @returns {Promise<Array>} Array of rename operations to perform
 */
async function processDocuments(contentDir) {
  const files = fs.readdirSync(contentDir)
    .filter(f => f.endsWith('.mdoc'));
  
  const renameOps = [];

  for (const file of files) {
    const filePath = path.join(contentDir, file);
    const content = fs.readFileSync(filePath, 'utf-8');
    
    const frontmatter = extractFrontmatter(content);
    if (!frontmatter || !frontmatter.title) {
      console.warn(`Skipping ${file} - No title found in frontmatter`);
      continue;
    }

    const newSlug = titleToSlug(frontmatter.title);
    const newFilename = `${newSlug}.mdoc`;
    
    if (file !== newFilename) {
      renameOps.push({
        oldPath: filePath,
        newPath: path.join(contentDir, newFilename),
        oldName: file,
        newName: newFilename,
        title: frontmatter.title
      });
    }
  }

  return renameOps;
}

/**
 * Update any references to the old filename in other documents
 * @param {string} contentDir The content directory
 * @param {string} oldName The old filename
 * @param {string} newName The new filename
 */
function updateReferences(contentDir, oldName, newName) {
  const files = fs.readdirSync(contentDir)
    .filter(f => f.endsWith('.md'));
  
  const oldSlug = oldName.replace('.md', '');
  const newSlug = newName.replace('.md', '');

  for (const file of files) {
    const filePath = path.join(contentDir, file);
    const content = fs.readFileSync(filePath, 'utf-8');
    
    // Update any links or references to the old filename
    const newContent = content.replace(
      new RegExp(`\\[([^\\]]+)\\]\\(${oldSlug}\\)`, 'g'),
      `[$1](${newSlug})`
    );

    if (content !== newContent) {
      fs.writeFileSync(filePath, newContent);
      console.log(`Updated references in ${file}`);
    }
  }
}

/**
 * Main execution function
 */
async function main() {
  const contentDir = path.join(process.cwd(), 'src/content/docs');
  
  console.log('Analyzing documents...');
  const renameOps = await processDocuments(contentDir);
  
  if (renameOps.length === 0) {
    console.log('All filenames are up to date!');
    return;
  }

  console.log('\nProposed filename changes:');
  renameOps.forEach(op => {
    console.log(`\n"${op.title}"`);
    console.log(`  ${op.oldName} -> ${op.newName}`);
  });

  // Prompt for confirmation
  let rl = readline.createInterface({
    input: process.stdin,
    output: process.stdout
  });

  const confirmed = await new Promise(resolve => {
    rl.question(`\nRename ${renameOps.length} files? (y/n): `, answer => {
      resolve(answer.toLowerCase() === 'y');
      rl.close();
    });
  });

  if (!confirmed) {
    console.log('No changes made.');
    return;
  }

  // Create a backup directory
  const backupDir = path.join(contentDir, '_backup_' + Date.now());
  fs.mkdirSync(backupDir);

  // Backup and rename files
  for (const op of renameOps) {
    // Backup the file
    const backupPath = path.join(backupDir, op.oldName);
    fs.copyFileSync(op.oldPath, backupPath);
    
    // Rename the file
    fs.renameSync(op.oldPath, op.newPath);
    console.log(`Renamed: ${op.oldName} -> ${op.newName}`);
    
    // Update references in other files
    updateReferences(contentDir, op.oldName, op.newName);
  }

  console.log(`\nComplete! Backup created in ${backupDir}`);
}

// Handle errors
main().catch(error => {
  console.error('Error:', error);
  process.exit(1);
});