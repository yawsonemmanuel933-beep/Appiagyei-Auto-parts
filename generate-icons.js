/**
 * Generates PNG icons for the PWA manifest from icon.svg
 * Run: node generate-icons.js
 */
const sharp = require('sharp');
const fs = require('fs');
const path = require('path');

const svgPath = path.join(__dirname, 'icon.svg');
const svgContent = fs.readFileSync(svgPath, 'utf-8');

const sizes = [192, 512];

async function generate() {
  for (const size of sizes) {
    const outPath = path.join(__dirname, `icon-${size}.png`);
    await sharp(Buffer.from(svgContent))
      .resize(size, size)
      .png()
      .toFile(outPath);
    console.log(`✅ Generated ${outPath} (${size}x${size})`);
  }
  console.log('🎉 All icons generated!');
}

generate().catch(err => {
  console.error('Failed to generate icons:', err);
  process.exit(1);
});
