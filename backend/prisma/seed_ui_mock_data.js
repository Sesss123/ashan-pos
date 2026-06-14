const { PrismaClient } = require('@prisma/client');
const prisma = new PrismaClient();

async function main() {
  console.log('Seeding mock data for UI presentations...');

  // 1. Get ALL Cashier Users to ensure the logged-in one gets the data
  const users = await prisma.user.findMany({ where: { role: { in: ['Cashier', 'Admin'] } } });
  
  if (users.length === 0) {
    console.log('No Cashier or Admin found. Skipping shift seeding.');
    return;
  }

  // 2. Create an Active Shift for each Cashier
  for (const user of users) {
    const activeShift = await prisma.shift.findFirst({
      where: { userId: user.id, status: 'OPEN' }
    });
    if (!activeShift) {
      await prisma.shift.create({
        data: {
          userId: user.id,
          startTime: new Date(new Date().setHours(8, 0, 0, 0)),
          openingCash: 500.0,
          expectedCash: 850.50,
          totalSales: 1450.75,
          cardPayments: 600.25,
          totalOrders: 32,
          status: 'OPEN'
        }
      });
      console.log(`Created active shift mock data for ${user.name}.`);
    }
  }

  // 3. Create Additional Dummy Customers
  const dummyCustomers = [
    { name: 'John Doe', phone: '+94 77 123 4567', credit: 1500.0, loyaltyPoints: 120 },
    { name: 'Jane Smith', phone: '+94 71 987 6543', credit: 0.0, loyaltyPoints: 45 },
    { name: 'Michael Silva', phone: '+94 70 555 1122', credit: 500.0, loyaltyPoints: 210 },
    { name: 'Sarah Fernando', phone: '+94 75 444 9988', credit: 3200.0, loyaltyPoints: 85 },
  ];

  for (const cust of dummyCustomers) {
    await prisma.customer.upsert({
      where: { phone: cust.phone },
      update: { credit: cust.credit, loyaltyPoints: cust.loyaltyPoints },
      create: { name: cust.name, phone: cust.phone, credit: cust.credit, loyaltyPoints: cust.loyaltyPoints }
    });
  }
  console.log('Created dummy customers.');

  // 4. Create Mock Running Orders (KitchenOrders)
  // Need a product to associate
  let product = await prisma.product.findFirst();
  if (!product) {
    let category = await prisma.category.findFirst() || await prisma.category.create({ data: { name: 'Mock Category' } });
    product = await prisma.product.create({
      data: { name: 'Mock Product', price: 10.0, categoryId: category.id, requiresKitchen: true }
    });
  }

  const mockOrders = [
    { status: 'Pending', type: 'Dining', items: [{ qty: 3, price: 10.0 }] },
    { status: 'Preparing', type: 'Takeaway', items: [{ qty: 2, price: 15.0 }, { qty: 1, price: 8.0 }] },
    { status: 'Ready', type: 'Dining', items: [{ qty: 1, price: 18.0 }] }
  ];

    for (const mo of mockOrders) {
      const orderSubtotal = mo.items.reduce((sum, item) => sum + (item.qty * item.price), 0);
      const order = await prisma.order.create({
        data: {
          userId: users[0].id,
          status: 'Pending',
          total: orderSubtotal * 1.1,
          subtotal: orderSubtotal,
          taxAmount: orderSubtotal * 0.1,
          type: mo.type,
          items: {
            create: mo.items.map(i => ({
              productId: product.id,
              quantity: i.qty,
              price: i.price,
              subtotal: i.qty * i.price
            }))
          }
        }
      });

      await prisma.kitchenOrder.create({
        data: {
          orderId: order.id,
          status: mo.status,
          priority: 'Normal'
        }
      });
    }
  console.log('Created mock running orders.');

  console.log('Mock UI Data Seeding Completed!');
}

main()
  .catch((e) => {
    console.error(e);
    process.exit(1);
  })
  .finally(async () => {
    await prisma.$disconnect();
  });
