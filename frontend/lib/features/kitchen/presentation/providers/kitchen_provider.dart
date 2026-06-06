import 'package:flutter_riverpod/flutter_riverpod.dart';
import '../../domain/models/kitchen_order_model.dart';

class KitchenNotifier extends StateNotifier<List<KitchenOrder>> {
  KitchenNotifier() : super([
    // Mock Data for initial testing
    KitchenOrder(id: 'k1', orderId: 'ord1', branchId: 'b1', status: 'Pending', priority: 'High', notes: 'No onions'),
    KitchenOrder(id: 'k2', orderId: 'ord2', branchId: 'b1', status: 'Preparing', priority: 'Normal', notes: ''),
  ]);

  // Invoked via Socket.IO
  void addOrder(KitchenOrder order) {
    state = [...state, order];
  }

  // Invoked via Socket.IO or User Action
  void updateOrderStatus(String id, String newStatus) {
    state = [
      for (final order in state)
        if (order.id == id)
          KitchenOrder(
            id: order.id,
            orderId: order.orderId,
            branchId: order.branchId,
            status: newStatus,
            priority: order.priority,
            notes: order.notes,
          )
        else
          order,
    ];
  }
}

final kitchenProvider = StateNotifierProvider<KitchenNotifier, List<KitchenOrder>>((ref) {
  return KitchenNotifier();
});
