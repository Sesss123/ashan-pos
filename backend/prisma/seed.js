const { PrismaClient } = require('@prisma/client');
const prisma = new PrismaClient();

async function main() {
  console.log('Seeding sample data...');

  // Categories
  const cat1 = await prisma.category.create({ data: { name: 'Burgers' } });
  const cat2 = await prisma.category.create({ data: { name: 'Beverages' } });
  const cat3 = await prisma.category.create({ data: { name: 'Desserts' } });

  // Products
  await prisma.product.createMany({
    data: [
      { name: 'Classic Beef Burger', price: 8.50, categoryId: cat1.id, barcode: 'B001' },
      { name: 'Chicken Cheese Burger', price: 9.00, categoryId: cat1.id, barcode: 'B002' },
      { name: 'Spicy Veggie Burger', price: 7.50, categoryId: cat1.id, barcode: 'B003' },
      { name: 'Coca Cola', price: 2.00, categoryId: cat2.id, barcode: 'D001' },
      { name: 'Orange Juice', price: 3.50, categoryId: cat2.id, barcode: 'D002' },
      { name: 'Chocolate Cake', price: 4.50, categoryId: cat3.id, barcode: 'C001' },
      { name: 'Ice Cream Sundae', price: 3.00, categoryId: cat3.id, barcode: 'C002' },
    ]
  });

  // Tables
  await prisma.table.createMany({
    data: [
      { name: 'Table 1', status: 'Available' },
      { name: 'Table 2', status: 'Occupied' },
      { name: 'Table 3', status: 'Available' },
      { name: 'Table 4', status: 'Cleaning' },
    ]
  });

  // Customers
  await prisma.customer.createMany({
    data: [
      { name: 'Sehas Ashan', phone: '0711234567', credit: 15.0, loyaltyPoints: 120 },
      { name: 'John Doe', phone: '0777654321', credit: 0, loyaltyPoints: 45 },
      { name: 'Jane Smith', phone: '0722334455', credit: 5.5, loyaltyPoints: 300 },
    ]
  });

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
