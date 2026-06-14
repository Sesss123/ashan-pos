const prisma = require('../config/db');
const socketEmitter = require('../realtime/socketEmitter');

// ── CUSTOMER MANAGEMENT (Delivery System) ────────────────────────────────────
// NOTE: Uses the existing Customer + Order schema.
// Delivery orders are Orders with type='Delivery' and a deliveryAddress field.

const createCustomer = async (req, res) => {
  try {
    const { name, phone, branchId } = req.body;

    // Prevent duplicate phone registration
    const existing = await prisma.customer.findUnique({ where: { phone } });
    if (existing) {
      return res.status(400).json({ message: 'Customer with this phone already exists', data: existing });
    }

    const customer = await prisma.customer.create({
      data: {
        name,
        phone,
        credit: 0,
        loyaltyPoints: 0,
        branchId: branchId || req.user?.branchId || null,
        tenantId: req.user?.tenantId || null
      }
    });

    socketEmitter.customer.created(req.io, customer);
    res.status(201).json({ message: 'Customer created', data: customer });
  } catch (error) {
    res.status(500).json({ message: 'Failed to create customer', error: error.message });
  }
};

const getCustomers = async (req, res) => {
  try {
    const { branchId, phone } = req.query;

    const where = {};
    if (branchId) where.branchId = branchId;
    if (phone) where.phone = { contains: phone };

    const customers = await prisma.customer.findMany({
      where,
      include: {
        creditHistories: { orderBy: { createdAt: 'desc' }, take: 5 }
      },
      orderBy: { name: 'asc' }
    });

    res.json({ data: customers });
  } catch (error) {
    res.status(500).json({ message: 'Failed to fetch customers', error: error.message });
  }
};

const getCustomerById = async (req, res) => {
  try {
    const { id } = req.params;
    const customer = await prisma.customer.findUnique({
      where: { id },
      include: {
        creditHistories: { orderBy: { createdAt: 'desc' }, take: 20 },
        orders: { orderBy: { createdAt: 'desc' }, take: 10 }
      }
    });

    if (!customer) return res.status(404).json({ message: 'Customer not found' });
    res.json({ data: customer });
  } catch (error) {
    res.status(500).json({ message: 'Failed to fetch customer', error: error.message });
  }
};

const updateCustomer = async (req, res) => {
  try {
    const { id } = req.params;
    const { name, phone } = req.body;

    const customer = await prisma.customer.update({
      where: { id },
      data: { name, phone }
    });

    socketEmitter.customer.updated(req.io, customer);
    res.json({ message: 'Customer updated', data: customer });
  } catch (error) {
    res.status(500).json({ message: 'Failed to update customer', error: error.message });
  }
};

// ── DELIVERY ORDER MANAGEMENT ─────────────────────────────────────────────────
// Uses the existing Order model with type='Delivery' and deliveryAddress field.

const createDeliveryOrder = async (req, res) => {
  try {
    const { customerId, deliveryAddress, items, total, subtotal, taxAmount, deliveryCharge } = req.body;

    if (!deliveryAddress) {
      return res.status(400).json({ message: 'Delivery address is required' });
    }

    const order = await prisma.order.create({
      data: {
        userId: req.user?.id,
        branchId: req.user?.branchId || null,
        tenantId: req.user?.tenantId || null,
        customerId: customerId || null,
        type: 'Delivery',
        status: 'Pending',
        deliveryAddress,
        total: (total || 0) + (deliveryCharge || 0),
        subtotal: subtotal || 0,
        taxAmount: taxAmount || 0,
        serviceCharge: deliveryCharge || 0,
        items: {
          create: (items || []).map(i => ({
            productId: i.productId,
            quantity: i.quantity,
            price: i.unitPrice || i.price
          }))
        }
      },
      include: { items: true, customer: true }
    });

    // Notify kitchen if items require preparation
    if (req.io) {
      req.io.emit('order.created', order);
    }

    res.status(201).json({ message: 'Delivery order created', data: order });
  } catch (error) {
    res.status(500).json({ message: 'Failed to create delivery order', error: error.message });
  }
};

const getDeliveryOrders = async (req, res) => {
  try {
    const { branchId, status } = req.query;

    const where = { type: 'Delivery' };
    if (branchId) where.branchId = branchId;
    if (status) where.status = status;

    const orders = await prisma.order.findMany({
      where,
      include: {
        customer: true,
        items: {
          include: { product: { select: { name: true } } }
        },
        payments: true
      },
      orderBy: { createdAt: 'desc' },
      take: 50
    });

    res.json({ data: orders });
  } catch (error) {
    res.status(500).json({ message: 'Failed to fetch delivery orders', error: error.message });
  }
};

const updateDeliveryStatus = async (req, res) => {
  try {
    const { id } = req.params;
    const { status } = req.body;

    const validStatuses = ['Pending', 'Preparing', 'Out for Delivery', 'Delivered', 'Cancelled'];
    if (!validStatuses.includes(status)) {
      return res.status(400).json({ message: `Invalid status. Must be one of: ${validStatuses.join(', ')}` });
    }

    const order = await prisma.order.update({
      where: { id },
      data: { status }
    });

    // Mark order as Completed when delivered
    if (status === 'Delivered') {
      await prisma.order.update({ where: { id }, data: { status: 'Completed' } });
    }

    if (req.io) {
      req.io.emit('order.updated', { orderId: id, status });
      socketEmitter.dashboard.statsUpdated(req.io, { trigger: 'delivery_status_update' });
    }

    res.json({ message: 'Delivery status updated', data: order });
  } catch (error) {
    res.status(500).json({ message: 'Failed to update delivery status', error: error.message });
  }
};

// ── PLACEHOLDER: Rider management (future — needs schema additions) ────────────

const getDeliveryDrivers = async (req, res) => {
  // Users with role 'Rider' can serve as delivery drivers
  try {
    const { branchId } = req.query;
    const where = { role: 'Rider' };
    if (branchId) where.branchId = branchId;

    const riders = await prisma.user.findMany({
      where,
      select: { id: true, name: true, email: true, branchId: true }
    });

    res.json({ data: riders });
  } catch (error) {
    res.status(500).json({ message: 'Failed to fetch drivers', error: error.message });
  }
};

module.exports = {
  createCustomer,
  getCustomers,
  getCustomerById,
  updateCustomer,
  createDeliveryOrder,
  getDeliveryOrders,
  updateDeliveryStatus,
  getDeliveryDrivers
};
