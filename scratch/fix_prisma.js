const fs = require('fs');
const path = require('path');

const srcDir = path.join(__dirname, '../backend/src');

function getRelativePathToDb(filePath) {
  const dbPath = path.join(srcDir, 'config/db');
  let relPath = path.relative(path.dirname(filePath), dbPath);
  if (!relPath.startsWith('.')) relPath = './' + relPath;
  // Replace backslashes with forward slashes
  return relPath.replace(/\\/g, '/');
}

function processDirectory(dir) {
  const files = fs.readdirSync(dir);
  for (const file of files) {
    const fullPath = path.join(dir, file);
    const stat = fs.statSync(fullPath);
    if (stat.isDirectory()) {
      processDirectory(fullPath);
    } else if (fullPath.endsWith('.ts') && !fullPath.includes('config\\db.ts') && !fullPath.includes('config/db.ts')) {
      let content = fs.readFileSync(fullPath, 'utf8');
      if (content.includes('new PrismaClient()')) {
        const relDb = getRelativePathToDb(fullPath);
        
        // Remove existing PrismaClient imports
        content = content.replace(/import\s*{\s*PrismaClient\s*}\s*from\s*['"]@prisma\/client['"];?\n?/g, '');
        content = content.replace(/const\s*{\s*PrismaClient\s*}\s*=\s*require\(['"]@prisma\/client['"]\);?\n?/g, '');
        content = content.replace(/var\s*{\s*PrismaClient\s*}\s*=\s*require\(['"]@prisma\/client['"]\);?\n?/g, '');
        
        // Replace new PrismaClient()
        content = content.replace(/const\s+prisma\s*=\s*new\s+PrismaClient\(\);?/g, `import prisma from '${relDb}';`);
        content = content.replace(/var\s+prisma\s*=\s*new\s+PrismaClient\(\);?/g, `import prisma from '${relDb}';`);
        
        // Handle inline inside functions
        content = content.replace(/const\s+prisma\s*=\s*new\s+PrismaClient\(\);?/g, '');

        fs.writeFileSync(fullPath, content, 'utf8');
        console.log(`Fixed: ${fullPath}`);
      }
    }
  }
}

processDirectory(srcDir);
console.log('Done!');
