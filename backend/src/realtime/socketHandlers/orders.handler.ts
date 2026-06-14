module.exports = (io, socket) => {
  // Listen for order creation (e.g., from Waiter app)
  socket.on('order.create', (payload) => {
    // Validation would happen here
    console.log(`[Socket] order.create from ${socket.user.id}`);
    
    const branchId = socket.user?.branchId;
    const tenantId = socket.user?.tenantId;
    const tenantPrefix = tenantId ? `tenant:${tenantId}:` : '';
    const kitchenRoom = branchId ? `${tenantPrefix}branch:${branchId}:kitchen` : `${tenantPrefix}room:kitchen`;

    io.to(kitchenRoom).emit('kitchen.queue_updated', {
      message: 'New Order Received',
      data: payload
    });

    // Acknowledge back to sender
    socket.emit('order.created_ack', { status: 'success' });
  });

  // Listen for order status updates
  socket.on('order.update_status', (payload) => {
    // e.g. Kitchen marking order as Ready
    const branchId = socket.user?.branchId;
    const tenantId = socket.user?.tenantId;
    const tenantPrefix = tenantId ? `tenant:${tenantId}:` : '';
    const waiterRoom = branchId ? `${tenantPrefix}branch:${branchId}:waiter` : `${tenantPrefix}room:waiter`;
    const cashierRoom = branchId ? `${tenantPrefix}branch:${branchId}:cashier` : `${tenantPrefix}room:cashier`;

    io.to(waiterRoom).emit('order.ready', payload);
    io.to(cashierRoom).emit('dashboard.order_updated', payload);
  });
};
