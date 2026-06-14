import 'package:flutter_riverpod/flutter_riverpod.dart';
import 'package:flutter/services.dart';
import '../../../../core/network/dio_client.dart';
import '../../../../core/realtime/socket_service.dart';
import '../../../cashier/presentation/providers/cashier_providers.dart';

class RunningOrdersNotifier extends AsyncNotifier<List<dynamic>> {
  Set<String> _previousReadyOrderIds = {};

  @override
  Future<List<dynamic>> build() async {
    return [];
  }

  void _checkAndPlayAlarm(List<dynamic> newOrders) {
    final currentReadyIds = newOrders
        .where((o) => o['status'] == 'Ready')
        .map((o) => o['id'].toString())
        .toSet();
    final newReadyIds = currentReadyIds.difference(_previousReadyOrderIds);
    
    if (newReadyIds.isNotEmpty) {
      SystemSound.play(SystemSoundType.alert);
    }
    _previousReadyOrderIds = currentReadyIds;
  }

  Future<void> fetchRunningOrders(String branchId) async {
    state = const AsyncValue.loading();
    try {
      final dio = ref.read(dioClientProvider).dio;
      final response = await dio.get('/waiter/orders/running', queryParameters: {'branchId': branchId});
      final orders = response.data as List<dynamic>;
      _checkAndPlayAlarm(orders);
      state = AsyncValue.data(orders);
    } catch (e, st) {
      state = AsyncValue.error(e, st);
    }
  }

  void listenToSocket(String branchId) {
    socketService.on('kitchen.queue_updated', (data) {
      fetchRunningOrders(branchId);
    });
    
    socketService.on('order.updated', (data) {
      fetchRunningOrders(branchId);
    });

    socketService.on('table.updated', (data) {
      ref.invalidate(tablesProvider);
    });
    
    ref.onDispose(() {
      socketService.off('kitchen.queue_updated');
      socketService.off('order.updated');
      socketService.off('table.updated');
    });
    
    fetchRunningOrders(branchId);
  }

  Future<void> markAsServed(String orderId) async {
    final currentState = state.value ?? [];
    try {
      final dio = ref.read(dioClientProvider).dio;
      await dio.put('/waiter/orders/$orderId/serve');
      
      // We rely on socket 'order.updated' to refresh the list,
      // but for optimistic UI update, we filter it out now:
      state = AsyncValue.data(currentState.where((o) => o['id'] != orderId).toList());
    } catch (e) {
      throw Exception('Failed to mark order as served: $e');
    }
  }
}

final runningOrdersProvider = AsyncNotifierProvider<RunningOrdersNotifier, List<dynamic>>(() {
  return RunningOrdersNotifier();
});
