const fs = require('fs');
const path = require('path');

const srcDir = path.join(__dirname, 'src');

function fixFile(filePath) {
  let content = fs.readFileSync(filePath, 'utf8');

  if (!content.includes('new PrismaClient')) {
    return;
  }

  // Skip db.ts itself because it defines basePrisma = new PrismaClient()
  if (filePath.endsWith('db.ts')) return;

  const fileDir = path.dirname(filePath);
  let relPath = path.relative(fileDir, path.join(srcDir, 'config', 'db')).replace(/\\/g, '/');
  if (!relPath.startsWith('.')) relPath = './' + relPath;

  let original = content;

  // 1. Remove ES module import
  content = content.replace(/import\s*\{\s*PrismaClient\s*\}\s*from\s*['"]@prisma\/client['"];?\n?/g, '');
  
  // 2. Remove CommonJS require
  content = content.replace(/const\s*\{\s*PrismaClient\s*\}\s*=\s*require\(['"]@prisma\/client['"]\);?\n?/g, '');

  // 3. Check for specific nested instantiation inside functions (like pos.controller.ts line 106)
  // We'll replace it with requiring the singleton or using the imported one.
  // Since some are CommonJS and some ES modules, let's look at the file style.
  const isESM = content.includes('import ') || content.includes('export default');
  
  const replacementLine = isESM 
    ? `import prisma from '${relPath}';` 
    : `const prisma = require('${relPath}').default || require('${relPath}');`;

  // Try to find top-level or global var prisma = new PrismaClient()
  content = content.replace(/^(const|let|var)\s+prisma\s*=\s*new\s+PrismaClient\s*\(\)\s*;?/gm, replacementLine);
  
  // Try to find nested instantiation
  content = content.replace(/^(\s*)(const|let|var)\s+prisma\s*=\s*new\s+PrismaClient\s*\(\)\s*;?/gm, `$1$2 prisma = require('${relPath}').default || require('${relPath}');`);

  if (content !== original) {
    fs.writeFileSync(filePath, content, 'utf8');
    console.log('Fixed:', filePath);
  }
}

function walkDir(dir) {
  const files = fs.readdirSync(dir);
  for (const file of files) {
    const fullPath = path.join(dir, file);
    if (fs.statSync(fullPath).isDirectory()) {
      walkDir(fullPath);
    } else if (fullPath.endsWith('.ts') || fullPath.endsWith('.js')) {
      fixFile(fullPath);
    }
  }
}

console.log('Starting PrismaClient replacement...');
walkDir(srcDir);
console.log('Done!');
