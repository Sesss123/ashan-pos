const prisma = require('../../config/db').default || require('../../config/db');
const socketEmitter = require('../../realtime/socketEmitter');

/**
 * GET /customers/search?phone=0771234567
 * Phone-based customer lookup. Used by Cashier for credit billing.
 */
const searchCustomer = async (req, res) => {
  try {
    const { phone, name } = req.query;

    if (!phone && !name) {
      return res.status(400).json({ success: false, message: 'Provide phone or name to search' });
    }

    const customers = await prisma.customer.findMany({
      where: {
        OR: [
          phone ? { phone: { contains: phone } } : undefined,
          name  ? { name:  { contains: name, mode: 'insensitive' } } : undefined
        ].filter(Boolean)
      },
      include: {
        creditHistories: { orderBy: { createdAt: 'desc' }, take: 3 }
      },
      take: 10
    });

    res.json({ success: true, data: customers });
  } catch (error) {
    res.status(500).json({ success: false, message: 'Customer search failed', error: error.message });
  }
};

const getCustomers = async (req, res) => {
  try {
    const customers = await prisma.customer.findMany({
      include: {
        creditHistories: {
          orderBy: { createdAt: 'desc' },
          take: 5
        }
      },
      orderBy: { name: 'asc' }
    });
    res.json({ success: true, data: customers });
  } catch (error) {
    res.status(500).json({ success: false, message: 'Failed to fetch customers', error: error.message });
  }
};

const createCustomer = async (req, res) => {
  try {
    const { name, phone, credit, loyaltyPoints } = req.body;
    
    // Check if phone already exists
    const existing = await prisma.customer.findUnique({ where: { phone } });
    if (existing) {
      return res.status(400).json({ success: false, message: 'Customer with this phone number already exists' });
    }

    const customer = await prisma.customer.create({
      data: { name, phone, credit: credit || 0, loyaltyPoints: loyaltyPoints || 0 }
    });

    // Emit real-time event
    socketEmitter.customer.created(req.io, customer);
    socketEmitter.dashboard.statsUpdated(req.io, { trigger: 'customer_create' });

    res.status(201).json({ success: true, data: customer, message: 'Customer created successfully' });
  } catch (error) {
    res.status(500).json({ success: false, message: 'Failed to create customer', error: error.message });
  }
};

const updateCustomer = async (req, res) => {
  try {
    const { id } = req.params;
    const { name, phone, credit, loyaltyPoints } = req.body;
    const customer = await prisma.customer.update({
      where: { id },
      data: { name, phone, credit, loyaltyPoints }
    });

    // Emit real-time event
    socketEmitter.customer.updated(req.io, customer);

    res.json({ success: true, data: customer, message: 'Customer updated successfully' });
  } catch (error) {
    res.status(500).json({ success: false, message: 'Failed to update customer', error: error.message });
  }
};

const deleteCustomer = async (req, res) => {
  try {
    const { id } = req.params;
    // Note: In a real system you'd probably soft-delete or anonymize to preserve historical orders
    await prisma.customerCreditHistory.deleteMany({ where: { customerId: id } });
    await prisma.customer.delete({ where: { id } });

    // Emit real-time event
    socketEmitter.customer.deleted(req.io, id);

    res.json({ success: true, message: 'Customer deleted successfully' });
  } catch (error) {
    res.status(500).json({ success: false, message: 'Failed to delete customer', error: error.message });
  }
};

const addCreditHistory = async (req, res) => {
  try {
    const { id } = req.params;
    const { amount, type, notes } = req.body;

    const result = await prisma.$transaction(async (tx) => {
      const history = await tx.customerCreditHistory.create({
        data: { customerId: id, amount, type, notes }
      });

      const customer = await tx.customer.findUnique({ where: { id } });
      const newCredit = type === 'ADD' ? customer.credit + amount : customer.credit - amount;
      
      const updatedCustomer = await tx.customer.update({
        where: { id },
        data: { credit: newCredit }
      });

      return { history, updatedCustomer };
    });

    // Emit real-time events
    socketEmitter.customer.creditUpdated(req.io, { customerId: id, amount, type, customer: result.updatedCustomer });
    socketEmitter.customer.updated(req.io, result.updatedCustomer);

    res.json({ success: true, data: result, message: 'Credit history added successfully' });
  } catch (error) {
    res.status(500).json({ success: false, message: 'Failed to add credit history', error: error.message });
  }
};

module.exports = {
  searchCustomer,
  getCustomers,
  createCustomer,
  updateCustomer,
  deleteCustomer,
  addCreditHistory
};

