import 'package:flutter_riverpod/flutter_riverpod.dart';
import 'package:flutter/services.dart';
import '../../../../core/network/dio_client.dart';
import '../../../../core/realtime/socket_service.dart';

class KitchenNotifier extends AsyncNotifier<List<dynamic>> {
  int _previousPendingCount = 0;

  @override
  Future<List<dynamic>> build() async {
    return [];
  }

  Future<void> fetchKitchenOrders(String branchId) async {
    state = const AsyncValue.loading();
    try {
      final dio = ref.read(dioClientProvider).dio;
      final response = await dio.get('/kitchen/queue', queryParameters: {'branchId': branchId});
      
      // Parse data correctly based on standard backend response { success, data }
      final rawData = response.data['data'] as List? ?? [];
      
      // Filter out 'Served', 'Completed', or 'Ready' orders, keep Pending/Preparing
      final orders = rawData.where((o) => ['Pending', 'Preparing'].contains(o['status'])).toList();
      
      final pendingCount = orders.where((o) => o['status'] == 'Pending').length;
      if (pendingCount > _previousPendingCount) {
        SystemSound.play(SystemSoundType.alert);
      }
      _previousPendingCount = pendingCount;

      state = AsyncValue.data(orders);
    } catch (e, st) {
      state = AsyncValue.error(e, st);
    }
  }

  void listenToSocket(String branchId) {
    socketService.on('kitchen.queue_updated', (data) {
      fetchKitchenOrders(branchId);
    });

    socketService.on('order.updated', (data) {
      fetchKitchenOrders(branchId);
    });
    
    ref.onDispose(() {
      socketService.off('kitchen.queue_updated');
      socketService.off('order.updated');
    });
    
    fetchKitchenOrders(branchId);
  }

  Future<void> updateOrderStatus(String orderId, String newStatus) async {
    final currentState = state.value ?? [];
    try {
      final dio = ref.read(dioClientProvider).dio;
      await dio.put('/kitchen/status', data: {'orderId': orderId, 'status': newStatus});
      
      // We don't immediately change local state because the socket 'kitchen.queue_updated' will trigger a refresh.
      // But for optimistic UI update, we can do it here:
      state = AsyncValue.data(currentState.map((o) {
        if (o['id'] == orderId) {
          return {...o as Map<String,dynamic>, 'status': newStatus};
        }
        return o;
      }).toList());
    } catch (e) {
      // Return the error so UI can show a toast
      throw Exception('Failed to update order status: $e');
    }
  }
}

final kitchenProvider = AsyncNotifierProvider<KitchenNotifier, List<dynamic>>(() {
  return KitchenNotifier();
});
