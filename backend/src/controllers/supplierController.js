const prisma = require('../config/db');

// ---- SUPPLIER MANAGEMENT ----

const createSupplier = async (req, res) => {
  try {
    const { branchId, name, email, phone, address, creditLimit } = req.body;
    const supplier = await prisma.supplier.create({
      data: { branchId, name, email, phone, address, creditLimit }
    });
    res.status(201).json({ message: 'Supplier created', supplier });
  } catch (error) {
    res.status(500).json({ message: 'Failed to create supplier', error: error.message });
  }
};

const getSuppliers = async (req, res) => {
  try {
    const { branchId } = req.query;
    const suppliers = await prisma.supplier.findMany({
      where: { branchId },
      include: { ledgers: { orderBy: { date: 'desc' }, take: 5 } }
    });
    res.json(suppliers);
  } catch (error) {
    res.status(500).json({ message: 'Failed to fetch suppliers' });
  }
};

// ---- PURCHASE ORDERS & GRN ----

const createPurchaseOrder = async (req, res) => {
  try {
    const { branchId, supplierId, items } = req.body;
    
    const result = await prisma.$transaction(async (tx) => {
      // Create PO
      const totalAmount = items.reduce((sum, item) => sum + (item.quantity * item.unitPrice), 0);
      const poNumber = `PO-${Date.now()}`;

      const po = await tx.purchaseOrder.create({
        data: {
          branchId, supplierId, poNumber, totalAmount, status: 'Pending',
          items: {
            create: items
          }
        },
        include: { items: true }
      });

      return po;
    });

    res.status(201).json({ message: 'Purchase Order created', po: result });
  } catch (error) {
    res.status(500).json({ message: 'Failed to create PO', error: error.message });
  }
};

const receivePurchaseOrder = async (req, res) => {
  try {
    const { id } = req.params; // PO ID
    const { invoiceNumber } = req.body;

    const result = await prisma.$transaction(async (tx) => {
      const po = await tx.purchaseOrder.findUnique({ where: { id }, include: { items: true } });
      if (!po || po.status === 'Received') throw new Error('Invalid PO');

      // 1. Mark PO as Received
      await tx.purchaseOrder.update({
        where: { id },
        data: { status: 'Received' }
      });

      // 2. Create Invoice
      const invoice = await tx.purchaseInvoice.create({
        data: { poId: id, invoiceNumber, date: new Date(), amount: po.totalAmount }
      });

      // 3. Update Supplier Ledger & Balance
      const supplier = await tx.supplier.findUnique({ where: { id: po.supplierId } });
      const newBalance = supplier.outstandingBalance + po.totalAmount;
      
      await tx.supplier.update({
        where: { id: po.supplierId },
        data: { outstandingBalance: newBalance }
      });

      await tx.supplierLedger.create({
        data: {
          supplierId: po.supplierId,
          type: 'INVOICE',
          credit: po.totalAmount, // Supplier gave us goods on credit
          balance: newBalance,
          referenceId: invoice.id
        }
      });

      // 4. Increment Inventory (Phase 5 integration)
      for (const item of po.items) {
        // Find existing stock item
        const stockItem = await tx.stockItem.findFirst({
          where: { productId: item.productId, branchId: po.branchId }
        });

        if (stockItem) {
          await tx.stockItem.update({
            where: { id: stockItem.id },
            data: { quantity: stockItem.quantity + item.quantity }
          });
        } else {
          await tx.stockItem.create({
            data: { productId: item.productId, branchId: po.branchId, quantity: item.quantity }
          });
        }

        // Record stock movement IN
        await tx.stockMovement.create({
          data: {
            productId: item.productId,
            branchId: po.branchId,
            type: 'IN',
            quantity: item.quantity,
            referenceId: po.id,
            notes: 'Received from PO'
          }
        });
      }

      return { po, invoice, newBalance };
    });

    res.json({ message: 'PO Received, Invoice Created, Inventory Updated', result });
  } catch (error) {
    res.status(500).json({ message: 'Failed to receive PO', error: error.message });
  }
};

module.exports = {
  createSupplier,
  getSuppliers,
  createPurchaseOrder,
  receivePurchaseOrder
};
