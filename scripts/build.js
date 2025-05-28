// scripts/build.js - Simple build script to ensure proper file placement
const fs = require('fs');
const path = require('path');

const sourcePreload = path.join(__dirname, '../public/preload.js');
const targetPreload = path.join(__dirname, '../build/preload.js');

// Copy preload script to build directory
try {
  if (fs.existsSync(sourcePreload)) {
    fs.copyFileSync(sourcePreload, targetPreload);
    console.log('✅ Preload script copied to build directory');
  } else {
    console.warn('⚠️ Preload script not found at:', sourcePreload);
  }
} catch (error) {
  console.error('❌ Failed to copy preload script:', error);
}

console.log('Build preparation complete!');