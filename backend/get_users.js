const { PrismaClient } = require('@prisma/client');
const prisma = new PrismaClient();

async function main() {
  const users = await prisma.user.findMany();
  console.log('--- USERS IN DB ---');
  console.log(users.map(u => ({ id: u.id, name: u.name, email: u.email, role: u.role })));
}

main().finally(() => prisma.$disconnect());
