const fs = require('fs');
const path = require('path');

const schemaPath = path.join(__dirname, '../backend/prisma/schema.prisma');
let schema = fs.readFileSync(schemaPath, 'utf-8');

// 1. Add Tenant model at the bottom
if (!schema.includes('model Tenant')) {
  schema += `

// ==========================================
// SAAS MULTI-TENANT ARCHITECTURE
// ==========================================

model Tenant {
  id          String   @id @default(uuid())
  name        String
  plan        String   @default("Basic") // Basic, Pro, Enterprise
  maxBranches Int      @default(1)
  isActive    Boolean  @default(true)
  createdAt   DateTime @default(now())
  updatedAt   DateTime @updatedAt
  
  // Relations
  users           User[]
  branches        Branch[]
  categories      Category[]
  products        Product[]
  orders          Order[]
  tables          Table[]
  inventoryItems  InventoryItem[]
  suppliers       Supplier[]
  customers       Customer[]
  shifts          Shift[]
  rolePolicies    RolePolicy[]
  notifications   Notification[]
  auditLogs       AuditLog[]
}
`;
}

// 2. Models to inject tenantId into
const targetModels = [
  'User', 'Branch', 'Category', 'Product', 'Order', 
  'Table', 'InventoryItem', 'Supplier', 'Customer', 
  'Shift', 'RolePolicy', 'Notification', 'AuditLog'
];

for (const modelName of targetModels) {
  // Regex to find the start of the model block
  const modelRegex = new RegExp(`model\\s+${modelName}\\s+{([\\s\\S]*?)}`, 'g');
  schema = schema.replace(modelRegex, (match, body) => {
    if (body.includes('tenantId')) return match; // Already injected
    
    // Insert tenantId right after the id field
    const idRegex = /(id\s+String\s+@id[^\n]*\n)/;
    let newBody = body.replace(idRegex, `$1  tenantId String\n`);
    
    // If we couldn't find id String @id, just prepend it
    if (newBody === body) {
      newBody = `\n  tenantId String\n` + body;
    }

    // Add relation mapping
    // E.g., tenant Tenant @relation(fields: [tenantId], references: [id])
    // Find the place before the first @@ index or at the end
    const relationStr = `\n  tenant Tenant @relation(fields: [tenantId], references: [id])\n`;
    
    if (newBody.includes('@@')) {
      newBody = newBody.replace(/(\n\s*@@)/, `${relationStr}$1`);
    } else {
      newBody += relationStr;
    }

    // Add index for tenantId
    if (newBody.includes('@@')) {
       newBody = newBody.replace(/(\n\s*@@)/, `\n  @@index([tenantId])$1`);
    } else {
       newBody += `\n  @@index([tenantId])\n`;
    }

    return `model ${modelName} {${newBody}}`;
  });
}

fs.writeFileSync(schemaPath, schema);
console.log('Successfully injected tenantId into schema.prisma');
