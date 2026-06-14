const { PrismaClient } = require('@prisma/client');
const prisma = new PrismaClient();

async function main() {
  console.log('Seeding sample data for Customers and Receipts...');

  // 1. Ensure we have an Admin/Cashier user to associate orders with
  let user = await prisma.user.findFirst({ where: { role: 'Cashier' } });
  if (!user) {
    user = await prisma.user.create({
      data: {
        name: 'Sample Cashier',
        email: 'cashier@ashnpos.local',
        password: 'password123',
        role: 'Cashier'
      }
    });
  }

  // 2. Add some more Customers
  const cust1 = await prisma.customer.upsert({
    where: { phone: '0711112222' },
    update: {},
    create: { name: 'Kasun Perera', phone: '0711112222', credit: 20.0, loyaltyPoints: 450 }
  });
  const cust2 = await prisma.customer.upsert({
    where: { phone: '0778889999' },
    update: {},
    create: { name: 'Nimal Silva', phone: '0778889999', credit: 0, loyaltyPoints: 15 }
  });
  const cust3 = await prisma.customer.upsert({
    where: { phone: '0705556666' },
    update: {},
    create: { name: 'Amal Fernando', phone: '0705556666', credit: 5.0, loyaltyPoints: 120 }
  });

  // 3. Create Sample Orders & Receipts
  const ordersToCreate = [
    {
      customer: cust1,
      total: 1250.50,
      receiptNo: 'REC-260606-001',
      status: 'Completed',
      paymentMethod: 'Cash',
      dateOffset: 0 // Today
    },
    {
      customer: cust2,
      total: 4500.00,
      receiptNo: 'REC-260606-002',
      status: 'Completed',
      paymentMethod: 'Card',
      dateOffset: 0 // Today
    },
    {
      customer: null, // Walk-in
      total: 850.00,
      receiptNo: 'REC-260606-003',
      status: 'Completed',
      paymentMethod: 'Cash',
      dateOffset: 1 // Yesterday
    },
    {
      customer: cust3,
      total: 2100.75,
      receiptNo: 'REC-260606-004',
      status: 'Cancelled',
      paymentMethod: 'Cash',
      dateOffset: 2 // 2 days ago
    }
  ];

  for (const o of ordersToCreate) {
    const date = new Date();
    date.setDate(date.getDate() - o.dateOffset);

    // Create Order
    const order = await prisma.order.create({
      data: {
        userId: user.id,
        status: o.status,
        total: o.total,
        type: 'Dining',
        createdAt: date
      }
    });

    // Create Payment
    await prisma.payment.create({
      data: {
        orderId: order.id,
        amount: o.total,
        method: o.paymentMethod,
        createdAt: date
      }
    });

    // Create Receipt
    await prisma.receipt.create({
      data: {
        orderId: order.id,
        receiptNo: o.receiptNo,
        createdAt: date
      }
    });

    // Optional: If customer is provided, we can't link it directly to order via foreign key 
    // because schema.prisma doesn't have customerId on Order, but let's assume it's logged in audit or notes
    if (o.customer) {
      await prisma.order.update({
        where: { id: order.id },
        data: { notes: `Customer: ${o.customer.name} (${o.customer.phone})` }
      });
    }
  }

  console.log('Sample data seeding completed successfully!');
}

main()
  .catch((e) => {
    console.error(e);
    process.exit(1);
  })
  .finally(async () => {
    await prisma.$disconnect();
  });
