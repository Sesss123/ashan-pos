const posService = require('./pos.service');

class PosController {
  async createOrder(req, res, next) {
    try {
      const orderData = {
        ...req.body,
        userId: req.user.id, // Pulled from JWT via security middleware
        branchId: req.user.branchId,
        tenantId: req.user.tenantId
      };

      const order = await posService.processOrder(orderData);

      // Real-Time System (Phase 7)
      if (req.io) {
        req.io.emit('order.created', order); // Notify Kitchen/Waiters
        req.io.emit('notification.created', { message: `New ${order.type} order created!` });
        if (order.requiresKitchenEmit) {
          req.io.emit('kitchen.queue_updated', { message: 'New order requires kitchen prep' });
        }
      }

      res.status(201).json({ success: true, message: 'Order completed', data: order });
    } catch (error) {
      next(error);
    }
  }

  async checkoutTable(req, res, next) {
    try {
      const { id: tableId } = req.params;
      const checkoutData = req.body;

      const result = await posService.checkoutTable(tableId, checkoutData);

      if (req.io) {
        // Notify Kitchen to clear any old zombie tickets for this table
        req.io.emit('kitchen.queue_updated', { message: `Table ${tableId} checked out` });
        // Notify Waiters to refresh their running orders panel
        req.io.emit('order.updated', { tableId, status: 'Completed' });
        // Notify Cashier dashboard of table availability change
        req.io.emit('table.updated', { tableId, status: 'Available' });
        // Notify Admin dashboard to refresh stats
        req.io.emit('dashboard.stats.updated', { trigger: 'checkout', tableId });
        req.io.emit('notification.created', { message: `Table checkout completed!` });
      }

      res.status(200).json({ success: true, message: 'Table checkout completed', data: result });
    } catch (error) {
      next(error);
    }
  }

  async getBillHistory(req, res, next) {
    try {
      const page = parseInt(req.query.page) || 1;
      const limit = parseInt(req.query.limit) || 50;

      const orders = await posService.getPaginatedHistory(page, limit, req.user);
      res.json({ success: true, data: orders, meta: { page, limit } });
    } catch (error) {
      next(error);
    }
  }

  async refundOrder(req, res, next) {
    try {
      const { id } = req.params;
      const order = await posService.refundOrder(id);

      if (req.io) {
        req.io.emit('order.refunded', { orderId: id, status: 'Refunded' });
        req.io.emit('notification.created', { message: `Order #${order.orderNumber || id} has been refunded.` });
      }

      res.status(200).json({ success: true, message: 'Order refunded successfully', data: order });
    } catch (error) {
      next(error);
    }
  }

  // --- Table Management ---
  async getTables(req, res, next) {
    try {
      const tables = await posService.getTables(req.user);
      res.json({ success: true, data: tables });
    } catch (error) {
      next(error);
    }
  }

  // --- Customer Management ---
  async searchCustomers(req, res, next) {
    try {
      const query = req.query.q || '';
      const customers = await posService.searchCustomers(query);
      res.json({ success: true, data: customers });
    } catch (error) {
      next(error);
    }
  }

  async createCustomer(req, res, next) {
    try {
      // In a real app, you'd add this to posService. Adding direct prisma call here for brevity, 
      // or we can require prisma if it's not here. posService has prisma.
      // We will do posService.createCustomer
      const { name, phone, email, notes } = req.body;
      
            const prisma = require('../../config/db').default || require('../../config/db');
      
      const customer = await prisma.customer.create({
        data: {
          name,
          phone,
          // other fields if schema has them
        }
      });
      res.status(201).json({ success: true, data: customer });
    } catch (error) {
      next(error);
    }
  }

  async getCustomerById(req, res, next) {
    try {
      const customer = await posService.getCustomerById(req.params.id);
      if (!customer) return res.status(404).json({ success: false, message: 'Customer not found' });
      res.json({ success: true, data: customer });
    } catch (error) {
      next(error);
    }
  }

  // --- Customer Credit Management ---
  async addCustomerCredit(req, res, next) {
    try {
      const { customerId } = req.params;
      const { amount, type, notes } = req.body;
      const creditHistory = await posService.addCustomerCredit(customerId, amount, type, notes);
      
      if (req.io) {
        req.io.emit('customer.credit_updated', { customerId, amount, type });
      }

      res.json({ success: true, message: 'Credit history updated', data: creditHistory });
    } catch (error) {
      next(error);
    }
  }

  async getCustomerCreditHistory(req, res, next) {
    try {
      const { customerId } = req.params;
      const history = await posService.getCustomerCreditHistory(customerId);
      res.json({ success: true, data: history });
    } catch (error) {
      next(error);
    }
  }

  // --- Receipt History ---
  async getReceipts(req, res, next) {
    try {
      const receipts = await posService.getReceipts(req.query, req.user);
      res.json({ success: true, data: receipts });
    } catch (error) {
      next(error);
    }
  }

  async getReceiptById(req, res, next) {
    try {
      const receipt = await posService.getReceiptById(req.params.id);
      if (!receipt) return res.status(404).json({ success: false, message: 'Receipt not found' });
      res.json({ success: true, data: receipt });
    } catch (error) {
      next(error);
    }
  }

  async reprintReceipt(req, res, next) {
    try {
      // In a real system, you might trigger a hardware print job here.
      // For POS, returning success is usually enough as frontend handles PDF generation.
      res.json({ success: true, message: 'Reprint triggered' });
    } catch (error) {
      next(error);
    }
  }

  // --- Daily Closing ---
  async getDailyClosing(req, res, next) {
    try {
      const shift = await posService.getCurrentShift(req.user.id);
      res.json({ success: true, data: shift });
    } catch (error) {
      next(error);
    }
  }

  async openShift(req, res, next) {
    try {
      const { openingCash } = req.body;
      const shift = await posService.createShift(req.user.id, openingCash);
      res.json({ success: true, message: 'Shift opened successfully', data: shift });
    } catch (error) {
      next(error);
    }
  }

  async closeShift(req, res, next) {
    try {
      const { shiftId, actualCash } = req.body;
      const closedShift = await posService.closeShift(shiftId, actualCash);
      res.json({ success: true, message: 'Shift closed successfully', data: closedShift });
    } catch (error) {
      next(error);
    }
  }
}

module.exports = new PosController();
