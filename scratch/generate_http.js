const fs = require('fs');
const path = require('path');

const serverFile = path.join(__dirname, '../backend/src/server.ts');
const srcDir = path.join(__dirname, '../backend/src');

const serverCode = fs.readFileSync(serverFile, 'utf8');

// Match app.use('/api/v1/xxx', yyyRoutes)
const useRegex = /app\.use\(['"](\/api\/v1\/[^'"]+)['"],\s*([a-zA-Z0-9_]+)\)/g;
let match;
const routeMappings = [];

while ((match = useRegex.exec(serverCode)) !== null) {
  routeMappings.push({ prefix: match[1], variable: match[2] });
}

// Find import paths for these variables
const importRegex = /import\s+([a-zA-Z0-9_]+)\s+from\s+['"](\.[^'"]+)['"]/g;
const imports = {};
while ((match = importRegex.exec(serverCode)) !== null) {
  imports[match[1]] = match[2];
}

let httpContent = `### AUTO-GENERATED FULL API TEST SUITE
@baseUrl = http://localhost:5000
@token = {{YOUR_AUTH_TOKEN}}

`;

for (const mapping of routeMappings) {
  const importPath = imports[mapping.variable];
  if (!importPath) continue;

  let filePath = path.join(srcDir, importPath) + '.ts';
  if (!fs.existsSync(filePath)) {
     filePath = path.join(srcDir, importPath, 'index.ts');
  }
  if (!fs.existsSync(filePath)) continue;

  const routeCode = fs.readFileSync(filePath, 'utf8');
  
  httpContent += `### ==========================================\n`;
  httpContent += `### MODULE: ${mapping.prefix.toUpperCase()}\n`;
  httpContent += `### ==========================================\n\n`;

  const routerRegex = /router\.(get|post|put|delete|patch)\(['"]([^'"]+)['"]/g;
  let routeMatch;
  while ((routeMatch = routerRegex.exec(routeCode)) !== null) {
    const method = routeMatch[1].toUpperCase();
    let endpoint = routeMatch[2];
    if (endpoint === '/') endpoint = '';
    
    httpContent += `# ${method} ${mapping.prefix}${endpoint}\n`;
    httpContent += `${method} {{baseUrl}}${mapping.prefix}${endpoint}\n`;
    httpContent += `Authorization: Bearer {{token}}\n`;
    if (['POST', 'PUT', 'PATCH'].includes(method)) {
      httpContent += `Content-Type: application/json\n\n`;
      httpContent += `{\n  // Add payload here\n}\n`;
    }
    httpContent += `\n###\n\n`;
  }
}

fs.writeFileSync(path.join(__dirname, '../all_api_tests.http'), httpContent);
console.log('Successfully generated all_api_tests.http');
