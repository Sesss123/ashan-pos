const { PrismaClient } = require('@prisma/client');
const bcrypt = require('bcrypt');
const prisma = new PrismaClient();

async function main() {
  console.log('Seeding mobile test users (cashier, waiter, kitchen)...');

  const hashedPassword = await bcrypt.hash('password123', 10);

  // 0. Ensure a Tenant exists
  const tenant = await prisma.tenant.upsert({
    where: { id: 'global-tenant' },
    update: {},
    create: {
      id: 'global-tenant',
      name: 'Global Tenant',
    }
  });

  // 1. Ensure a Global branch exists for them
  const branch = await prisma.branch.upsert({
    where: { id: 'global-branch' },
    update: {},
    create: {
      id: 'global-branch',
      name: 'Global Branch',
      tenantId: tenant.id
    }
  });

  // 2. Create users
  await prisma.user.upsert({
    where: { email: 'cashier@dubay.com' },
    update: { password: hashedPassword, tenantId: tenant.id },
    create: {
      name: 'Test Cashier',
      email: 'cashier@dubay.com',
      password: hashedPassword,
      role: 'Cashier',
      branchId: branch.id,
      tenantId: tenant.id
    }
  });

  await prisma.user.upsert({
    where: { email: 'waiter@dubay.com' },
    update: { password: hashedPassword, tenantId: tenant.id },
    create: {
      name: 'Test Waiter',
      email: 'waiter@dubay.com',
      password: hashedPassword,
      role: 'Waiter',
      branchId: branch.id,
      tenantId: tenant.id
    }
  });

  await prisma.user.upsert({
    where: { email: 'kitchen@dubay.com' },
    update: { password: hashedPassword, tenantId: tenant.id },
    create: {
      name: 'Test Kitchen',
      email: 'kitchen@dubay.com',
      password: hashedPassword,
      role: 'Kitchen',
      branchId: branch.id,
      tenantId: tenant.id
    }
  });

  console.log('Mobile test users seeded successfully!');
}

main()
  .catch((e) => {
    console.error(e);
    process.exit(1);
  })
  .finally(async () => {
    await prisma.$disconnect();
  });
