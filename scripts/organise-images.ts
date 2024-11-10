import fs from 'fs/promises';
import path from 'path';
import { glob } from 'glob';

// Configuration - adjust these paths as needed
const CONTENT_DIR = './src/content';
const ASSETS_DIR = './src/assets';
const IMAGE_EXTENSIONS = ['png', 'jpg', 'jpeg', 'gif', 'webp', 'svg'];

interface ImageReference {
  docFile: string;
  originalPath: string;
  newPath: string;
}

async function main() {
  try {
    // 1. Find all documentation files
    const docFiles = await glob('**/*.{mdoc}', { cwd: CONTENT_DIR });
    const imageRefs: ImageReference[] = [];

    // 2. Process each document
    for (const docFile of docFiles) {
      const docPath = path.join(CONTENT_DIR, docFile);
      const docContent = await fs.readFile(docPath, 'utf-8');
      const docBaseName = path.basename(docFile, path.extname(docFile));

      // Find image references using regex
      const imageRegex = /!\[.*?\]\((\.\.\/assets\/.*?)\)/g;
      let match;
      let counter = 1;

      while ((match = imageRegex.exec(docContent)) !== null) {
        const originalPath = match[1].replace('../assets/', '');
        const originalExt = path.extname(originalPath);
        const newFileName = `${docBaseName}-${counter}${originalExt}`;
        counter++;

        imageRefs.push({
          docFile: docPath,
          originalPath,
          newPath: newFileName,
        });
      }
    }

    // 3. Rename files and update references
    for (const ref of imageRefs) {
      const oldPath = path.join(ASSETS_DIR, ref.originalPath);
      const newPath = path.join(ASSETS_DIR, ref.newPath);

      // Read the document content
      let docContent = await fs.readFile(ref.docFile, 'utf-8');

      // Check if the original file exists
      try {
        await fs.access(oldPath);
        
        // Rename the file
        await fs.rename(oldPath, newPath);
        console.log(`Renamed: ${ref.originalPath} -> ${ref.newPath}`);

        // Update the reference in the document
        docContent = docContent.replace(
          `../assets/${ref.originalPath}`,
          `../assets/${ref.newPath}`
        );

        // Write updated content back to the document
        await fs.writeFile(ref.docFile, docContent, 'utf-8');
        console.log(`Updated references in: ${ref.docFile}`);
      } catch (err) {
        console.warn(`Warning: Could not access file ${oldPath}`);
        continue;
      }
    }

    console.log('Image organization complete!');
  } catch (error) {
    console.error('Error:', error);
    process.exit(1);
  }
}

// Create a backup function
async function createBackup() {
  const timestamp = new Date().toISOString().replace(/[:]/g, '-');
  
  // Backup content directory
  const contentBackupDir = `${CONTENT_DIR}-backup-${timestamp}`;
  await fs.cp(CONTENT_DIR, contentBackupDir, { recursive: true });
  
  // Backup assets directory
  const assetsBackupDir = `${ASSETS_DIR}-backup-${timestamp}`;
  await fs.cp(ASSETS_DIR, assetsBackupDir, { recursive: true });
  
  console.log(`Backup created at:\n${contentBackupDir}\n${assetsBackupDir}`);
}

// Run the script with backup
async function run() {
  try {
    console.log('Creating backup...');
    await createBackup();
    console.log('Starting image organization...');
    await main();
  } catch (error) {
    console.error('Fatal error:', error);
    process.exit(1);
  }
}

run();