const prisma = require('../config/db');

// ---- CUSTOMER MANAGEMENT ----

const createCustomer = async (req, res) => {
  try {
    const { branchId, name, phone, email, groupId } = req.body;
    
    const result = await prisma.$transaction(async (tx) => {
      const customer = await tx.customer.create({
        data: { branchId, name, phone, email, groupId }
      });

      // Initialize Wallet and Points
      await tx.customerWallet.create({ data: { customerId: customer.id } });
      await tx.customerPoint.create({ data: { customerId: customer.id } });

      return customer;
    });

    res.status(201).json({ message: 'Customer created', customer: result });
  } catch (error) {
    res.status(500).json({ message: 'Failed to create customer', error: error.message });
  }
};

const getCustomers = async (req, res) => {
  try {
    const { branchId } = req.query;
    const customers = await prisma.customer.findMany({
      where: { branchId },
      include: { wallet: true, points: true }
    });
    res.json(customers);
  } catch (error) {
    res.status(500).json({ message: 'Failed to fetch customers' });
  }
};

// ---- DELIVERY MANAGEMENT ----

const createDeliveryOrder = async (req, res) => {
  try {
    const { orderId, customerId, address, deliveryCharge } = req.body;

    const delivery = await prisma.deliveryOrder.create({
      data: { orderId, customerId, address, deliveryCharge, status: 'Pending' }
    });

    res.status(201).json({ message: 'Delivery Order created', delivery });
  } catch (error) {
    res.status(500).json({ message: 'Failed to create delivery order', error: error.message });
  }
};

const assignRider = async (req, res) => {
  try {
    const { id } = req.params; // Delivery Order ID
    const { riderId } = req.body;

    const result = await prisma.$transaction(async (tx) => {
      const delivery = await tx.deliveryOrder.update({
        where: { id },
        data: { riderId, status: 'Dispatched' }
      });

      await tx.deliveryRider.update({
        where: { id: riderId },
        data: { status: 'Busy' }
      });

      return delivery;
    });

    res.json({ message: 'Rider assigned', delivery: result });
  } catch (error) {
    res.status(500).json({ message: 'Failed to assign rider', error: error.message });
  }
};

const getDeliveryOrders = async (req, res) => {
  try {
    const { branchId } = req.query;
    const deliveries = await prisma.deliveryOrder.findMany({
      where: { order: { branchId } },
      include: { order: true, rider: true, customer: true }
    });
    res.json(deliveries);
  } catch (error) {
    res.status(500).json({ message: 'Failed to fetch deliveries' });
  }
};

module.exports = {
  createCustomer,
  getCustomers,
  createDeliveryOrder,
  assignRider,
  getDeliveryOrders
};
