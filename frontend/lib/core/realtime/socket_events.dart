class SocketEvents {
  // Orders
  static const String orderCreated = 'order.created';
  static const String orderUpdated = 'order.updated';
  static const String orderPreparing = 'order.preparing';
  static const String orderReady = 'order.ready';
  
  // Kitchen
  static const String kitchenQueueUpdated = 'kitchen.queue_updated';
  
  // Inventory
  static const String inventoryLowStock = 'inventory.low_stock';
  
  // System
  static const String connect = 'connect';
  static const String disconnect = 'disconnect';
}
