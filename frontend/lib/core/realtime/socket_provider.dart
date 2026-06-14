import 'package:flutter_riverpod/flutter_riverpod.dart';
import 'socket_service.dart';
import '../../features/cashier/presentation/providers/cashier_providers.dart';
import '../../features/cashier/presentation/providers/pos_provider.dart';
import '../../features/kitchen/presentation/providers/kitchen_provider.dart';
import '../../features/waiter/presentation/providers/running_orders_provider.dart';
import '../../features/waiter/presentation/providers/waiter_cart_provider.dart';

final socketServiceProvider = Provider<SocketService>((ref) {
  final service = SocketService();
  
  // Connection should happen dynamically after login

  service.on('table.updated', (_) {
    ref.invalidate(tablesProvider);
  });
  
  service.on('table.status_changed', (_) {
    ref.invalidate(tablesProvider);
  });
  
  service.on('kitchen.queue_updated', (_) {
    ref.read(kitchenProvider.notifier).fetchKitchenOrders('main-branch');
    ref.read(runningOrdersProvider.notifier).fetchRunningOrders('main-branch');
  });
  
  service.on('kitchen.order_created', (_) {
    ref.read(kitchenProvider.notifier).fetchKitchenOrders('main-branch');
    ref.read(runningOrdersProvider.notifier).fetchRunningOrders('main-branch');
  });
  
  service.on('order.updated', (_) {
    ref.read(kitchenProvider.notifier).fetchKitchenOrders('main-branch');
    ref.read(runningOrdersProvider.notifier).fetchRunningOrders('main-branch');
    ref.invalidate(tablesProvider);
  });
  
  service.on('order.created', (_) {
    ref.read(kitchenProvider.notifier).fetchKitchenOrders('main-branch');
    ref.read(runningOrdersProvider.notifier).fetchRunningOrders('main-branch');
    ref.invalidate(currentShiftProvider);
  });
  
  // Menu Updates
  final menuEvents = [
    'menu.product_created', 'menu.product_updated', 'menu.product_deleted',
    'menu.category_created', 'menu.category_updated', 'menu.category_deleted'
  ];
  
  for (var event in menuEvents) {
    service.on(event, (_) {
      ref.invalidate(posDashboardProvider);
      ref.invalidate(categoriesProvider);
      ref.invalidate(productsProvider);
    });
  }
  
  ref.onDispose(() {
    service.disconnect();
  });
  
  return service;
});

// A provider that can be watched at the root to keep the socket alive
final realTimeSyncProvider = Provider<void>((ref) {
  ref.watch(socketServiceProvider);
});
