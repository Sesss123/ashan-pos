const fs = require('fs');
const path = require('path');

const filesToFix = [
  'src/modules/auth/auth.routes.ts',
  'src/modules/pos/pos.routes.ts',
  'src/modules/orders/orders.routes.ts',
  'src/modules/kitchen/kitchen.routes.ts',
  'src/modules/notifications/notifications.routes.ts',
  'src/modules/reports/reports.routes.ts',
  'src/modules/admin/admin.routes.ts',
  'src/modules/audit/audit.routes.ts',
  'src/modules/users/users.routes.ts',
  'src/modules/customers/customers.routes.ts',
  'src/modules/roles/roles.routes.ts',
  'src/routes/menuRoutes.ts',
  'src/routes/tableAdminRoutes.ts',
  'src/routes/branchAdminRoutes.ts',
  'src/routes/settingsRoutes.ts',
  'src/routes/inventoryRoutes.ts',
  'src/modules/waiter/waiter.routes.ts',
  'src/routes/supplierRoutes.ts',
  'src/routes/analyticsRoutes.ts',
  'src/routes/paymentRoutes.ts',
  'src/routes/customerDeliveryRoutes.ts',
];

for (const file of filesToFix) {
  const filePath = path.join(__dirname, file);
  if (fs.existsSync(filePath)) {
    let content = fs.readFileSync(filePath, 'utf8');
    
    // Replace requires with imports for express router
    content = content.replace(/const\s+express\s*=\s*require\(['"]express['"]\);/g, "import { Router } from 'express';");
    content = content.replace(/const\s+router\s*=\s*express\.Router\(\);/g, "const router = Router();");
    
    // Replace module.exports with export default
    content = content.replace(/module\.exports\s*=\s*router;/g, "export default router;");
    
    // Fallback: If no import/export exists at all, append export {}
    if (!content.includes('import ') && !content.includes('export ')) {
      content += '\nexport {};\n';
    }
    
    fs.writeFileSync(filePath, content);
    console.log(`Fixed ${file}`);
  } else {
    console.log(`File not found: ${file}`);
  }
}

// Fix socketServer.ts
const socketPath = path.join(__dirname, 'src/realtime/socketServer.ts');
if (fs.existsSync(socketPath)) {
  let content = fs.readFileSync(socketPath, 'utf8');
  content = content.replace(/module\.exports\s*=\s*\{\s*initSocketServer\s*\};/g, "export { initSocketServer };");
  fs.writeFileSync(socketPath, content);
  console.log('Fixed socketServer.ts');
}

// Fix backupService.ts
const backupPath = path.join(__dirname, 'src/services/backupService.ts');
if (fs.existsSync(backupPath)) {
  let content = fs.readFileSync(backupPath, 'utf8');
  content = content.replace(/module\.exports\s*=\s*\{\s*initBackupScheduler\s*\};/g, "export { initBackupScheduler };");
  fs.writeFileSync(backupPath, content);
  console.log('Fixed backupService.ts');
}
