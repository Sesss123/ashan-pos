const { PrismaClient } = require('@prisma/client');
const bcrypt = require('bcrypt');
const prisma = new PrismaClient();

async function main() {
  const hashedPassword = await bcrypt.hash('password123', 10);
  
  await prisma.user.updateMany({
    where: { email: 'admin@ashn.com' },
    data: { password: hashedPassword }
  });
  
  console.log('✅ Admin password has been successfully updated to: password123');
}

main()
  .catch(console.error)
  .finally(() => prisma.$disconnect());
