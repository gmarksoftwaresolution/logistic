const sharp = require('sharp');
const fs = require('fs');

async function resizeIcon() {
  try {
    const inputPath = './assets/images/GMU Logo.png';
    const outputPath = './assets/images/GMU Logo Splash.png';
    
    const metadata = await sharp(inputPath).metadata();
    const width = metadata.width;
    const height = metadata.height;
    
    const newWidth = Math.floor(width * 0.7);
    const newHeight = Math.floor(height * 0.7);
    
    await sharp({
      create: {
        width: width,
        height: height,
        channels: 4,
        background: { r: 0, g: 0, b: 0, alpha: 0 }
      }
    })
    .composite([
      {
        input: await sharp(inputPath).resize(newWidth, newHeight).toBuffer(),
        gravity: 'center'
      }
    ])
    .toFile(outputPath);
    
    console.log("Successfully created GMU Logo Splash.png");
  } catch (error) {
    console.error("Error creating splash logo:", error);
  }
}

resizeIcon();
