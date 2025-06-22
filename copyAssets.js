const fs = require("fs");
const path = require("path");

const sourceDir = path.join(__dirname, "src/templates");
const destDir = path.join(__dirname, "dist/templates");
const assetsDir = path.join(__dirname, "src/assets");
const destAssetsDir = path.join(__dirname, "dist/assets");

function copyDirectory(source, destination) {
  if (!fs.existsSync(source)) {
    console.error(`Source directory does not exist: ${source}`);
    process.exit(1);
  }

  fs.mkdirSync(destination, { recursive: true });

  const entries = fs.readdirSync(source, { withFileTypes: true });

  for (const entry of entries) {
    const sourcePath = path.join(source, entry.name);
    const destPath = path.join(destination, entry.name);

    if (entry.isDirectory()) {
      copyDirectory(sourcePath, destPath);
    } else {
      fs.copyFileSync(sourcePath, destPath);
    }
  }
}

copyDirectory(sourceDir, destDir);
console.log(`Templates copied from ${sourceDir} to ${destDir}`);

// Copy assets directory
copyDirectory(assetsDir, destAssetsDir);
console.log(`Assets copied from ${assetsDir} to ${destAssetsDir}`);
