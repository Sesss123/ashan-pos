const { PrismaClient } = require('@prisma/client');
const prisma = new PrismaClient();

async function main() {
  console.log('Generating AI Analytics Sample Data...');

  // 1. Ensure Admin User exists to link orders to
  let admin = await prisma.user.findFirst({ where: { role: 'Admin' } });
  if (!admin) {
    console.log('No Admin found, skipping...');
    return;
  }

  // 2. Create Branches
  const ensureBranch = async (name, location, contact) => {
    let branch = await prisma.branch.findFirst({ where: { name } });
    if (!branch) {
      branch = await prisma.branch.create({
        data: { name, location, contact, isActive: true }
      });
    }
    return branch;
  };

  const b1 = await ensureBranch('Colombo Main', 'Colombo 03', '0112345678');
  const b2 = await ensureBranch('Kandy Hub', 'Kandy City', '0812345678');
  const b3 = await ensureBranch('Galle Fort', 'Galle', '0912345678');

  const branches = [b1, b2, b3];

  // 3. Generate past 7 days of orders
  console.log('Generating past 7 days of orders...');
  const today = new Date();
  
  for (let i = 0; i < 7; i++) {
    const targetDate = new Date(today);
    targetDate.setDate(targetDate.getDate() - i);
    
    // Create 10-30 random orders per day
    const numOrders = Math.floor(Math.random() * 20) + 10;
    
    for (let j = 0; j < numOrders; j++) {
      const branch = branches[Math.floor(Math.random() * branches.length)];
      const total = Math.floor(Math.random() * 5000) + 500; // Rs. 500 to 5500
      
      // Randomize time within that day
      targetDate.setHours(Math.floor(Math.random() * 12) + 10); // 10 AM to 10 PM
      targetDate.setMinutes(Math.floor(Math.random() * 60));

      await prisma.order.create({
        data: {
          branchId: branch.id,
          userId: admin.id,
          status: 'Completed',
          total: total,
          type: 'Dining',
          createdAt: targetDate
        }
      });
    }
  }

  console.log('Sample Data Seeding Completed Successfully! ✅');
}

main()
  .catch((e) => {
    console.error(e);
    process.exit(1);
  })
  .finally(async () => {
    await prisma.$disconnect();
  });
