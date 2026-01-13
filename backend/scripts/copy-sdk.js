import { copyFileSync, mkdirSync, existsSync } from 'fs';
import { dirname, join } from 'path';
import { fileURLToPath } from 'url';

const __dirname = dirname(fileURLToPath(import.meta.url));
const sdkSrc = join(__dirname, '../../sdk/dist');
const sdkDest = join(__dirname, '../public/sdk');

// Create destination directory
mkdirSync(sdkDest, { recursive: true });

// Copy SDK files
const files = ['uxtest.min.js', 'uxtest.min.js.map'];

for (const file of files) {
  const src = join(sdkSrc, file);
  const dest = join(sdkDest, file);
  
  if (existsSync(src)) {
    copyFileSync(src, dest);
    console.log(`Copied: ${file}`);
  } else {
    console.warn(`Warning: ${file} not found in sdk/dist`);
  }
}

console.log('SDK files copied to backend/public/sdk');
