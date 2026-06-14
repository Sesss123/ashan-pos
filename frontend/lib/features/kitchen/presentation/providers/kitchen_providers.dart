import 'package:flutter_riverpod/flutter_riverpod.dart';
import 'package:flutter/services.dart';
import '../../../../core/realtime/socket_service.dart';
import '../../domain/repositories/kitchen_repository.dart';

class KitchenQueueNotifier extends AsyncNotifier<List<dynamic>> {
  @override
  Future<List<dynamic>> build() async {
    return [];
  }


  Future<void> fetchQueue() async {
    state = const AsyncValue.loading();
    try {
      final repo = ref.read(kitchenRepositoryProvider);
      final orders = await repo.fetchQueue();
      state = AsyncValue.data(orders);
    } catch (e, st) {
      state = AsyncValue.error(e, st);
    }
  }

  void listenToSocket() {
    socketService.on('kitchen.queue_updated', (data) {
      fetchQueue();
    });
    
    socketService.on('kitchen.order_created', (data) {
      SystemSound.play(SystemSoundType.alert);
      fetchQueue();
    });

    socketService.on('order.status_changed', (data) {
      fetchQueue();
    });

    ref.onDispose(() {
      socketService.off('kitchen.queue_updated');
      socketService.off('kitchen.order_created');
      socketService.off('order.status_changed');
    });
    
    fetchQueue();
  }

  Future<void> updateStatus(String orderId, String newStatus) async {
    try {
      final repo = ref.read(kitchenRepositoryProvider);
      await repo.updateStatus(orderId, newStatus);
      // The socket event 'kitchen.queue_updated' will trigger a refresh
      fetchQueue(); 
    } catch (e) {
      throw Exception('Failed to update status: $e');
    }
  }
}

final kitchenQueueProvider = AsyncNotifierProvider<KitchenQueueNotifier, List<dynamic>>(() {
  return KitchenQueueNotifier();
});

class KitchenHistoryNotifier extends AsyncNotifier<List<dynamic>> {
  @override
  Future<List<dynamic>> build() async {
    return [];
  }

  Future<void> fetchHistory() async {
    state = const AsyncValue.loading();
    try {
      final repo = ref.read(kitchenRepositoryProvider);
      final orders = await repo.fetchHistory();
      state = AsyncValue.data(orders);
    } catch (e, st) {
      state = AsyncValue.error(e, st);
    }
  }

  void listenToSocket() {
    socketService.on('kitchen.queue_updated', (data) {
      fetchHistory();
    });
    
    socketService.on('order.status_changed', (data) {
      fetchHistory();
    });

    ref.onDispose(() {
      // Don't turn off sockets entirely here because QueueNotifier also uses them,
      // but in Riverpod we just re-fetch on these events.
    });
    
    fetchHistory();
  }
}

final kitchenHistoryProvider = AsyncNotifierProvider<KitchenHistoryNotifier, List<dynamic>>(() {
  return KitchenHistoryNotifier();
});

final kitchenAnalyticsProvider = FutureProvider.autoDispose<Map<String, dynamic>>((ref) async {
  final repo = ref.read(kitchenRepositoryProvider);
  return await repo.fetchAnalytics();
});

class SelectedStationNotifier extends Notifier<String?> {
  @override
  String? build() => null;
  void setStation(String? val) => state = val;
}

final selectedStationProvider = NotifierProvider<SelectedStationNotifier, String?>(SelectedStationNotifier.new);
