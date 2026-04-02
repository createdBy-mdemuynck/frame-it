const sharp = require('sharp');
const fs = require('fs');
const path = require('path');

const uploadsRoot = './uploads';

// Function to regenerate thumbnails for a user directory
function regenerateThumbnails(userDir) {
  const thumbDir = path.join(userDir, 'thumbnails');
  fs.mkdirSync(thumbDir, { recursive: true });

  const files = fs.readdirSync(userDir).filter(f => 
    (f.endsWith('.png') || f.endsWith('.jpg') || f.endsWith('.jpeg')) && 
    !f.startsWith('.')
  );

  console.log(`Processing ${files.length} images in ${userDir}...`);

  files.forEach(file => {
    const srcPath = path.join(userDir, file);
    const thumbPath = path.join(thumbDir, file);

    if (fs.existsSync(thumbPath)) {
      console.log(`✓ Exists: ${thumbPath}`);
    } else {
      console.log(`⏳ Generating: ${thumbPath}`);
      sharp(srcPath)
        .resize(150, 150)
        .toFile(thumbPath)
        .then(() => console.log(`✅ Generated: ${thumbPath}`))
        .catch(err => console.error(`❌ Error generating ${thumbPath}:`, err.message));
    }
  });
}

// Process all user directories
const userDirs = fs.readdirSync(uploadsRoot, { withFileTypes: true })
  .filter(dirent => dirent.isDirectory() && dirent.name !== 'tmp')
  .map(dirent => path.join(uploadsRoot, dirent.name));

userDirs.forEach(regenerateThumbnails);

console.log('\nThumbnail regeneration started for all users!');
