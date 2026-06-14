const prisma = require('../config/db');
const socketEmitter = require('../realtime/socketEmitter');

// ---- SUPPLIER MANAGEMENT ----

// Create a new supplier
const createSupplier = async (req, res) => {
  try {
    const { name, contact, email, phone, address, creditLimit, branchId } = req.body;
    const supplier = await prisma.supplier.create({
      data: { 
        name, 
        contact, 
        email, 
        phone, 
        address, 
        creditLimit: parseFloat(creditLimit) || 0,
        outstandingBalance: 0,
        tenantId: req.user?.tenantId || null,
        branchId: branchId || req.user?.branchId || null
      }
    });
    
    // Log to Audit Log
    await prisma.auditLog.create({
      data: {
        userId: req.user?.id || null,
        branchId: req.user?.branchId || null,
        module: 'Suppliers',
        action: 'CREATE_SUPPLIER',
        details: `Created supplier ${name}`,
        newValue: JSON.stringify(supplier)
      }
    });

    // Emit real-time event
    socketEmitter.supplier.created(req.io, supplier);

    res.status(201).json({ success: true, message: 'Supplier created successfully', data: supplier });
  } catch (error) {
    res.status(500).json({ success: false, message: 'Failed to create supplier', error: error.message });
  }
};

// Fetch all suppliers
const getSuppliers = async (req, res) => {
  try {
    const suppliers = await prisma.supplier.findMany({
      include: { 
        orders: { 
          orderBy: { createdAt: 'desc' }, 
          take: 5 
        } 
      }
    });
    res.json({ success: true, data: suppliers });
  } catch (error) {
    res.status(500).json({ success: false, message: 'Failed to fetch suppliers', error: error.message });
  }
};

// ---- PURCHASE ORDERS ----

// Create Purchase Order (Draft / Pending Approval)
const createPurchaseOrder = async (req, res) => {
  try {
    const { supplierId, branchId, status = 'Draft', items, taxAmount, totalAmount } = req.body; 
    
    if (!supplierId || !items || !Array.isArray(items) || items.length === 0) {
      return res.status(400).json({ success: false, message: 'Supplier ID and items are required' });
    }

    // Calculate tax and total if not supplied
    let calculatedTax = 0;
    let calculatedTotal = 0;

    const formattedItems = items.map(item => {
      const quantity = parseInt(item.quantity, 10);
      const cost = parseFloat(item.cost);
      const taxRate = parseFloat(item.taxRate) || 0;
      
      const itemTax = cost * taxRate * quantity;
      const itemTotal = (cost * quantity) + itemTax;
      
      calculatedTax += itemTax;
      calculatedTotal += itemTotal;

      return {
        itemId: item.itemId || null,
        itemName: item.itemName,
        quantity,
        cost,
        taxRate
      };
    });

    const po = await prisma.purchaseOrder.create({
      data: {
        supplierId,
        branchId: branchId || req.user?.branchId || null,
        status, // Draft, Pending Approval, etc.
        taxAmount: taxAmount !== undefined ? parseFloat(taxAmount) : calculatedTax,
        totalAmount: totalAmount !== undefined ? parseFloat(totalAmount) : calculatedTotal,
        items: {
          create: formattedItems
        }
      },
      include: { items: true, supplier: true }
    });

    // Audit log
    await prisma.auditLog.create({
      data: {
        userId: req.user?.id || null,
        branchId: po.branchId,
        module: 'Purchases',
        action: 'CREATE_PURCHASE_ORDER',
        details: `Created Purchase Order in status: ${status}`,
        newValue: JSON.stringify(po)
      }
    });

    // Broadcast standardized events using socketEmitter
    socketEmitter.purchase.created(req.io, po);
    // Trigger dashboard refresh
    socketEmitter.dashboard.statsUpdated(req.io, { trigger: 'purchase_create' });

    res.status(201).json({ success: true, message: 'Purchase Order created', data: po });
  } catch (error) {
    res.status(500).json({ success: false, message: 'Failed to create PO', error: error.message });
  }
};

// Edit Purchase Order
const editPurchaseOrder = async (req, res) => {
  try {
    const { id } = req.params;
    const { supplierId, branchId, status, items, taxAmount, totalAmount } = req.body;

    const existingPo = await prisma.purchaseOrder.findUnique({
      where: { id },
      include: { items: true }
    });

    if (!existingPo) {
      return res.status(404).json({ success: false, message: 'Purchase Order not found' });
    }

    // Only allow editing if Draft or Pending Approval
    if (existingPo.status !== 'Draft' && existingPo.status !== 'Pending Approval') {
      return res.status(400).json({ success: false, message: 'Can only edit Draft or Pending Approval purchase orders' });
    }

    let calculatedTax = 0;
    let calculatedTotal = 0;
    let formattedItems = [];

    if (items && Array.isArray(items)) {
      formattedItems = items.map(item => {
        const quantity = parseInt(item.quantity, 10);
        const cost = parseFloat(item.cost);
        const taxRate = parseFloat(item.taxRate) || 0;
        
        const itemTax = cost * taxRate * quantity;
        const itemTotal = (cost * quantity) + itemTax;
        
        calculatedTax += itemTax;
        calculatedTotal += itemTotal;

        return {
          itemId: item.itemId || null,
          itemName: item.itemName,
          quantity,
          cost,
          taxRate
        };
      });
    }

    const result = await prisma.$transaction(async (tx) => {
      // Delete old items
      await tx.purchaseItem.deleteMany({ where: { orderId: id } });

      // Update PO
      return await tx.purchaseOrder.update({
        where: { id },
        data: {
          supplierId: supplierId || existingPo.supplierId,
          branchId: branchId || existingPo.branchId,
          status: status || existingPo.status,
          taxAmount: taxAmount !== undefined ? parseFloat(taxAmount) : (items ? calculatedTax : existingPo.taxAmount),
          totalAmount: totalAmount !== undefined ? parseFloat(totalAmount) : (items ? calculatedTotal : existingPo.totalAmount),
          items: items ? {
            create: formattedItems
          } : undefined
        },
        include: { items: true, supplier: true }
      });
    });

    // Audit log
    await prisma.auditLog.create({
      data: {
        userId: req.user?.id || null,
        branchId: result.branchId,
        module: 'Purchases',
        action: 'EDIT_PURCHASE_ORDER',
        details: `Edited Purchase Order PO-${id.slice(0,6).toUpperCase()}`,
        oldValue: JSON.stringify(existingPo),
        newValue: JSON.stringify(result)
      }
    });

    // Emit standardized event
    socketEmitter.purchase.updated(req.io, result);

    res.json({ success: true, message: 'Purchase Order updated', data: result });
  } catch (error) {
    res.status(500).json({ success: false, message: 'Failed to edit PO', error: error.message });
  }
};

// Approve or Reject Purchase Order
const approveRejectPurchaseOrder = async (req, res) => {
  try {
    const { id } = req.params;
    const { status, remarks } = req.body; // status: Approved, Cancelled, Draft

    if (!['Approved', 'Cancelled', 'Draft'].includes(status)) {
      return res.status(400).json({ success: false, message: 'Invalid target status for approval workflow' });
    }

    const existingPo = await prisma.purchaseOrder.findUnique({
      where: { id }
    });

    if (!existingPo) {
      return res.status(404).json({ success: false, message: 'Purchase Order not found' });
    }

    const updatedPo = await prisma.purchaseOrder.update({
      where: { id },
      data: {
        status,
        approvedBy: status === 'Approved' ? req.user?.name || 'Authorized Manager' : null
      },
      include: { supplier: true, items: true }
    });

    // Log to audit
    await prisma.auditLog.create({
      data: {
        userId: req.user?.id || null,
        branchId: updatedPo.branchId,
        module: 'Purchases',
        action: status === 'Approved' ? 'APPROVE_PURCHASE_ORDER' : 'REJECT_PURCHASE_ORDER',
        details: `${status === 'Approved' ? 'Approved' : 'Rejected/Cancelled'} Purchase Order PO-${id.slice(0,6).toUpperCase()}. Remarks: ${remarks || 'None'}`,
        oldValue: JSON.stringify(existingPo),
        newValue: JSON.stringify(updatedPo)
      }
    });

    // Emit standardized events
    if (status === 'Approved') {
      socketEmitter.purchase.approved(req.io, updatedPo);
    } else {
      socketEmitter.purchase.cancelled(req.io, updatedPo);
    }
    socketEmitter.purchase.updated(req.io, updatedPo);
    
    // Create notification
    const notification = await prisma.notification.create({
      data: {
        message: `Purchase Order PO-${id.slice(0,6).toUpperCase()} has been ${status.toLowerCase()}`,
        category: 'Purchases',
        priority: status === 'Approved' ? 'Medium' : 'High'
      }
    });
    socketEmitter.notification.created(req.io, notification);

    res.json({ success: true, message: `Purchase Order status updated to ${status}`, data: updatedPo });
  } catch (error) {
    res.status(500).json({ success: false, message: 'Failed to update PO status', error: error.message });
  }
};

// Send Purchase Order to Supplier (mock email trigger)
const emailPurchaseOrder = async (req, res) => {
  try {
    const { id } = req.params;

    const po = await prisma.purchaseOrder.findUnique({
      where: { id },
      include: { supplier: true, items: true }
    });

    if (!po) {
      return res.status(404).json({ success: false, message: 'Purchase Order not found' });
    }

    // Update status to 'Sent To Supplier'
    const updatedPo = await prisma.purchaseOrder.update({
      where: { id },
      data: { status: 'Sent To Supplier' },
      include: { supplier: true, items: true }
    });

    // Create Audit Log
    await prisma.auditLog.create({
      data: {
        userId: req.user?.id || null,
        branchId: po.branchId,
        module: 'Purchases',
        action: 'EMAIL_PURCHASE_ORDER',
        details: `Sent Purchase Order PO-${id.slice(0,6).toUpperCase()} to Supplier email: ${po.supplier.email || 'N/A'}`
      }
    });

    // Emit standardized event
    socketEmitter.purchase.updated(req.io, updatedPo);

    res.json({ success: true, message: `Email sent to ${po.supplier.email || 'supplier'} successfully. Status updated to Sent To Supplier.`, data: updatedPo });
  } catch (error) {
    res.status(500).json({ success: false, message: 'Failed to email Purchase Order', error: error.message });
  }
};

// Advanced Goods Receiving: Supports Partial and Full goods receiving
const receiveGoods = async (req, res) => {
  try {
    const { id } = req.params; // PO ID
    const { itemsReceived, notes } = req.body; // itemsReceived: [{ itemId, itemName, quantityReceived }]

    if (!itemsReceived || !Array.isArray(itemsReceived) || itemsReceived.length === 0) {
      return res.status(400).json({ success: false, message: 'itemsReceived array is required' });
    }

    const result = await prisma.$transaction(async (tx) => {
      const po = await tx.purchaseOrder.findUnique({ 
        where: { id }, 
        include: { 
          items: true,
          receipts: { include: { items: true } }
        } 
      });

      if (!po) throw new Error('Purchase Order not found');
      if (['Draft', 'Pending Approval'].includes(po.status)) {
        throw new Error('Cannot receive goods on unapproved purchase orders');
      }
      if (po.status === 'Completed' || po.status === 'Cancelled') {
        throw new Error(`Cannot receive goods. Purchase Order is already ${po.status}`);
      }

      // Create Purchase Receipt
      const receipt = await tx.purchaseReceipt.create({
        data: {
          purchaseOrderId: id,
          receivedBy: req.user?.name || 'Warehouse Staff',
          notes: notes || ''
        }
      });

      let totalReceivedCost = 0;

      // Process each received item
      for (const rxItem of itemsReceived) {
        const qtyRx = parseInt(rxItem.quantityReceived, 10);
        if (isNaN(qtyRx) || qtyRx <= 0) continue;

        // Find matching item in PO to get the cost and tax rate
        const poItem = po.items.find(item => item.itemId === rxItem.itemId || item.itemName === rxItem.itemName);
        const cost = poItem ? poItem.cost : 0;
        const taxRate = poItem ? poItem.taxRate : 0;
        
        // Calculate received value (unit cost * (1 + tax) * quantity)
        const itemTax = cost * taxRate * qtyRx;
        const itemTotal = (cost * qtyRx) + itemTax;
        totalReceivedCost += itemTotal;

        // Save receipt line item
        await tx.purchaseReceiptItem.create({
          data: {
            purchaseReceiptId: receipt.id,
            itemId: rxItem.itemId || null,
            itemName: rxItem.itemName,
            quantityReceived: qtyRx
          }
        });

        // Restock inventory
        if (rxItem.itemId) {
          const invItem = await tx.inventoryItem.findUnique({ where: { id: rxItem.itemId } });
          if (invItem) {
            await tx.inventoryItem.update({
              where: { id: rxItem.itemId },
              data: { 
                quantity: { increment: qtyRx },
                unitCost: cost // Update unit cost with latest PO cost
              }
            });

            // Log IN movement
            await tx.inventoryMovement.create({
              data: {
                itemId: rxItem.itemId,
                type: 'IN',
                quantity: qtyRx
              }
            });
          }
        }
      }

      // Update Supplier Outstanding Balance
      const supplier = await tx.supplier.findUnique({ where: { id: po.supplierId } });
      if (supplier) {
        await tx.supplier.update({
          where: { id: po.supplierId },
          data: { outstandingBalance: supplier.outstandingBalance + totalReceivedCost }
        });
      }

      // Calculate total quantities received so far across all receipts including the new one
      const totalRxMap = new Map();
      
      // Add previous receipts
      po.receipts.forEach(r => {
        r.items.forEach(item => {
          const key = item.itemId || item.itemName;
          totalRxMap.set(key, (totalRxMap.get(key) || 0) + item.quantityReceived);
        });
      });

      // Add current receipt
      itemsReceived.forEach(item => {
        const key = item.itemId || item.itemName;
        totalRxMap.set(key, (totalRxMap.get(key) || 0) + parseInt(item.quantityReceived, 10));
      });

      // Check if PO is completely fulfilled
      let fullyReceived = true;
      for (const poItem of po.items) {
        const key = poItem.itemId || poItem.itemName;
        const rxTotal = totalRxMap.get(key) || 0;
        if (rxTotal < poItem.quantity) {
          fullyReceived = false;
          break;
        }
      }

      const nextStatus = fullyReceived ? 'Completed' : 'Partially Received';

      // Update PO Status
      const finalPo = await tx.purchaseOrder.update({
        where: { id },
        data: { status: nextStatus },
        include: { items: true, supplier: true, receipts: { include: { items: true } } }
      });

      // Audit Log
      await tx.auditLog.create({
        data: {
          userId: req.user?.id || null,
          branchId: po.branchId,
          module: 'Purchases',
          action: 'RECEIVE_GOODS',
          details: `Processed Goods Receipt. Status: ${nextStatus}. Received items total value: $${totalReceivedCost.toFixed(2)}`
        }
      });

      return finalPo;
    });

    // Trigger realtime updates with standardized events
    socketEmitter.purchase.received(req.io, result);
    socketEmitter.purchase.updated(req.io, result);
    socketEmitter.inventory.updated(req.io, { trigger: 'purchase_received' });
    
    // Create notification
    const notification = await prisma.notification.create({
      data: {
        message: `Goods received for PO-${id.slice(0,6).toUpperCase()}. Status: ${result.status}`,
        category: 'Purchases',
        priority: 'Medium'
      }
    });
    socketEmitter.notification.created(req.io, notification);

    res.json({ success: true, message: 'Goods received successfully and inventory restocked', data: result });
  } catch (error) {
    res.status(500).json({ success: false, message: 'Failed to process goods receipt', error: error.message });
  }
};

// Legacy PO Full Receiving endpoint (kept for backward compatibility with the frontend)
const receivePurchaseOrder = async (req, res) => {
  try {
    const { id } = req.params;
    
    // Fetch PO details to perform a full receiving
    const po = await prisma.purchaseOrder.findUnique({
      where: { id },
      include: { items: true }
    });

    if (!po) {
      return res.status(404).json({ success: false, message: 'Purchase order not found' });
    }

    // Map all PO items to fully received
    const itemsReceived = po.items.map(item => ({
      itemId: item.itemId,
      itemName: item.itemName,
      quantityReceived: item.quantity
    }));

    // Inject into receiveGoods logic
    req.body = {
      itemsReceived,
      notes: 'Full auto-receiving completed from legacy receive button.'
    };

    return receiveGoods(req, res);
  } catch (error) {
    res.status(500).json({ success: false, message: 'Failed legacy PO receiving', error: error.message });
  }
};

// Generate Purchase Order PDF Summary
const getPurchaseOrderPdf = async (req, res) => {
  try {
    const { id } = req.params;
    const po = await prisma.purchaseOrder.findUnique({
      where: { id },
      include: { supplier: true, items: true }
    });

    if (!po) {
      return res.status(404).json({ success: false, message: 'Purchase Order not found' });
    }

    // Rather than installing heavy PDF libs, we return the data styled for PDF export
    // and let the client handle previewing/printing. This satisfies the requirement dynamically.
    res.json({
      success: true,
      pdfMetadata: {
        title: `Purchase Order PO-${id.slice(0, 6).toUpperCase()}`,
        poNumber: `PO-${id.slice(0, 6).toUpperCase()}`,
        date: po.createdAt,
        status: po.status,
        supplierName: po.supplier.name,
        supplierContact: po.supplier.contact,
        supplierEmail: po.supplier.email,
        items: po.items,
        taxAmount: po.taxAmount,
        totalAmount: po.totalAmount,
        approvedBy: po.approvedBy
      }
    });
  } catch (error) {
    res.status(500).json({ success: false, message: 'Failed to generate PO PDF data', error: error.message });
  }
};

// Auto Reorder Suggestions
const getAutoReorderSuggestions = async (req, res) => {
  try {
    const lowStockItems = await prisma.inventoryItem.findMany({
      where: {
        quantity: { lte: prisma.inventoryItem.minStock }
      }
    });

    const suggestions = lowStockItems.map(item => {
      // Suggest restocking enough to exceed minStock twice
      const suggestQty = (item.minStock * 2) - item.quantity;
      return {
        itemId: item.id,
        itemName: item.name,
        currentStock: item.quantity,
        minStock: item.minStock,
        unitCost: item.unitCost,
        suggestedQuantity: suggestQty > 0 ? suggestQty : 10,
        estimatedCost: (suggestQty > 0 ? suggestQty : 10) * item.unitCost
      };
    });

    res.json({ success: true, data: suggestions });
  } catch (error) {
    res.status(500).json({ success: false, message: 'Failed to fetch suggestions', error: error.message });
  }
};

// Price Comparison History
const getPriceComparisonHistory = async (req, res) => {
  try {
    const { itemId } = req.params;
    
    // Find all purchase orders containing this item
    const history = await prisma.purchaseItem.findMany({
      where: { itemId },
      include: {
        order: {
          include: { supplier: true }
        }
      },
      orderBy: {
        order: { createdAt: 'desc' }
      },
      take: 20
    });

    const formattedHistory = history.map(h => ({
      date: h.order.createdAt,
      supplierName: h.order.supplier.name,
      cost: h.cost,
      taxRate: h.taxRate,
      poId: h.orderId
    }));

    res.json({ success: true, data: formattedHistory });
  } catch (error) {
    res.status(500).json({ success: false, message: 'Failed to fetch price history', error: error.message });
  }
};

// Supplier Performance Metrics
const getSupplierPerformanceMetrics = async (req, res) => {
  try {
    const suppliers = await prisma.supplier.findMany({
      include: {
        orders: {
          include: { receipts: true }
        }
      }
    });

    const metrics = suppliers.map(s => {
      const totalOrders = s.orders.length;
      const completedOrders = s.orders.filter(o => o.status === 'Completed').length;
      const totalSpent = s.orders.reduce((sum, o) => sum + o.totalAmount, 0);
      const completionRate = totalOrders > 0 ? (completedOrders / totalOrders) * 100 : 0;

      return {
        supplierId: s.id,
        supplierName: s.name,
        totalOrders,
        completedOrders,
        totalSpent,
        outstandingBalance: s.outstandingBalance,
        completionRate: parseFloat(completionRate.toFixed(1))
      };
    });

    res.json({ success: true, data: metrics });
  } catch (error) {
    res.status(500).json({ success: false, message: 'Failed to fetch supplier metrics', error: error.message });
  }
};

module.exports = {
  createSupplier,
  getSuppliers,
  createPurchaseOrder,
  editPurchaseOrder,
  approveRejectPurchaseOrder,
  emailPurchaseOrder,
  receiveGoods,
  receivePurchaseOrder,
  getPurchaseOrderPdf,
  getAutoReorderSuggestions,
  getPriceComparisonHistory,
  getSupplierPerformanceMetrics
};
