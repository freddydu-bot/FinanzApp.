import sharp from 'sharp';
import { readFileSync } from 'fs';
import { join, dirname } from 'path';
import { fileURLToPath } from 'url';

const __dirname = dirname(fileURLToPath(import.meta.url));
const srcIcon = join(__dirname, '..', 'src', 'assets', 'icon-source.png');
const publicDir = join(__dirname, '..', 'public');

const sizes = [72, 96, 128, 144, 152, 192, 384, 512];

for (const size of sizes) {
  await sharp(srcIcon)
    .resize(size, size)
    .toFile(join(publicDir, `icon-${size}x${size}.png`));
  console.log(`✓ icon-${size}x${size}.png`);
}

// Also generate apple-touch-icon (180x180)
await sharp(srcIcon)
  .resize(180, 180)
  .toFile(join(publicDir, 'apple-touch-icon.png'));
console.log('✓ apple-touch-icon.png');

console.log('\nAll icons generated!');
