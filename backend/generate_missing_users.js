const { PrismaClient } = require('@prisma/client');
const bcrypt = require('bcrypt');
const prisma = new PrismaClient();

async function main() {
  const branches = await prisma.branch.findMany({
    include: {
      users: true
    }
  });

  const generatedCredentials = [];

  for (const branch of branches) {
    const hasCashier = branch.users.some(u => u.role === 'Cashier' && !u.isDeleted);
    const hasWaiter = branch.users.some(u => u.role === 'Waiter' && !u.isDeleted);

    if (hasCashier && hasWaiter) {
      console.log(`Branch "${branch.name}" already has both Cashier and Waiter users.`);
      continue;
    }

    const slug = branch.name.toLowerCase()
      .replace(/[^a-z0-9\s]/g, '')
      .trim()
      .replace(/\s+/g, '.');

    const safeSlug = slug || 'branch';
    const credentials = {
      branchName: branch.name,
      cashier: null,
      waiter: null
    };

    if (!hasCashier) {
      const cashierEmail = `${safeSlug}.cashier@ashnpos.local`;
      const cashierPasswordText = `${safeSlug}.cashier123`;
      const hashedPassword = await bcrypt.hash(cashierPasswordText, 10);

      let uniqueEmail = cashierEmail;
      const existingUser = await prisma.user.findUnique({ where: { email: uniqueEmail } });
      if (existingUser) {
        uniqueEmail = `${safeSlug}.${branch.id.substring(0, 4)}.cashier@ashnpos.local`;
      }

      await prisma.user.create({
        data: {
          name: `${branch.name} Cashier`,
          email: uniqueEmail,
          password: hashedPassword,
          role: 'Cashier',
          branchId: branch.id
        }
      });

      credentials.cashier = {
        email: uniqueEmail,
        password: cashierPasswordText
      };
    }

    if (!hasWaiter) {
      const waiterEmail = `${safeSlug}.waiter@ashnpos.local`;
      const waiterPasswordText = `${safeSlug}.waiter123`;
      const hashedPassword = await bcrypt.hash(waiterPasswordText, 10);

      let uniqueEmail = waiterEmail;
      const existingUser = await prisma.user.findUnique({ where: { email: uniqueEmail } });
      if (existingUser) {
        uniqueEmail = `${safeSlug}.${branch.id.substring(0, 4)}.waiter@ashnpos.local`;
      }

      await prisma.user.create({
        data: {
          name: `${branch.name} Waiter`,
          email: uniqueEmail,
          password: hashedPassword,
          role: 'Waiter',
          branchId: branch.id
        }
      });

      credentials.waiter = {
        email: uniqueEmail,
        password: waiterPasswordText
      };
    }

    generatedCredentials.push(credentials);
  }

  console.log('GENERATION_RESULT_START');
  console.log(JSON.stringify(generatedCredentials, null, 2));
  console.log('GENERATION_RESULT_END');
}

main()
  .catch(console.error)
  .finally(() => prisma.$disconnect());
