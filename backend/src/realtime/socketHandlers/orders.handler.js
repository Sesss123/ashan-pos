module.exports = (io, socket) => {
  // Listen for order creation (e.g., from Waiter app)
  socket.on('order:create', (payload) => {
    // Validation would happen here
    console.log(`[Socket] order:create from ${socket.user.id}`);
    
    // Emit to kitchen room instantly
    io.to('room:kitchen').emit('kitchen:queue_updated', {
      message: 'New Order Received',
      data: payload
    });

    // Acknowledge back to sender
    socket.emit('order:created_ack', { status: 'success' });
  });

  // Listen for order status updates
  socket.on('order:update_status', (payload) => {
    // e.g. Kitchen marking order as Ready
    io.to('room:waiter').emit('order:ready', payload);
    io.to('room:cashier').emit('dashboard:order_updated', payload);
  });
};
