const sharp = require('sharp');
const fs = require('fs');
const path = require('path');

const inputFile = path.join(__dirname, '../public/favicon.jpeg');
const outputDir = path.join(__dirname, '../public');

async function generateFavicons() {
  try {
    // Read the input image
    const image = sharp(inputFile);

    // Generate various favicon sizes
    const sizes = [
      { name: 'favicon-16x16.png', size: 16 },
      { name: 'favicon-32x32.png', size: 32 },
      { name: 'apple-touch-icon.png', size: 180 },
      { name: 'android-chrome-192x192.png', size: 192 },
      { name: 'android-chrome-512x512.png', size: 512 },
    ];

    // Generate PNG files
    for (const { name, size } of sizes) {
      await image
        .resize(size, size, {
          fit: 'contain',
          background: { r: 0, g: 0, b: 0, alpha: 0 }
        })
        .png()
        .toFile(path.join(outputDir, name));
      console.log(`Generated ${name}`);
    }

    // Generate favicon.ico (multi-size ICO file)
    // Note: sharp doesn't support ICO directly, so we'll create a 32x32 PNG and rename it
    // For a proper ICO, we'd need a different library, but modern browsers support PNG as favicon
    await image
      .resize(32, 32, {
        fit: 'contain',
        background: { r: 0, g: 0, b: 0, alpha: 0 }
      })
      .png()
      .toFile(path.join(outputDir, 'favicon.ico'));
    console.log('Generated favicon.ico');

    console.log('All favicons generated successfully!');
  } catch (error) {
    console.error('Error generating favicons:', error);
    process.exit(1);
  }
}

generateFavicons();

