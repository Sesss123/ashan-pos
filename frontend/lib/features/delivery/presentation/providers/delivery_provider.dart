import 'package:flutter_riverpod/flutter_riverpod.dart';
import '../../../../core/network/dio_client.dart';
import '../../../../core/realtime/socket_service.dart';

class DeliveryState {
  final List<dynamic> pending;
  final List<dynamic> preparing;
  final List<dynamic> outForDelivery;
  final List<dynamic> delivered;

  DeliveryState({
    required this.pending,
    required this.preparing,
    required this.outForDelivery,
    required this.delivered,
  });
}

class DeliveryNotifier extends AsyncNotifier<DeliveryState> {
  @override
  Future<DeliveryState> build() async {
    // Listen to real-time order updates to auto-refresh delivery screen
    socketService.on('order.updated', (data) {
      ref.invalidateSelf();
    });
    socketService.on('order.created', (data) {
      final d = data is Map ? data : {};
      if (d['type'] == 'Delivery') ref.invalidateSelf();
    });

    ref.onDispose(() {
      socketService.off('order.updated');
      socketService.off('order.created');
    });

    return _fetchData();
  }

  Future<DeliveryState> _fetchData() async {
    final dio = ref.read(dioClientProvider).dio;

    // Fetch all delivery-type orders from the fixed delivery endpoint
    final res = await dio.get('/delivery-system/orders');
    final data = (res.data['data'] as List<dynamic>?) ?? [];

    // Partition by status
    final pending = data.where((d) => d['status'] == 'Pending').toList();
    final preparing = data.where((d) => d['status'] == 'Preparing').toList();
    final outForDelivery = data.where((d) => d['status'] == 'Out for Delivery').toList();
    final delivered = data.where((d) => d['status'] == 'Completed' || d['status'] == 'Delivered').toList();

    return DeliveryState(
      pending: pending,
      preparing: preparing,
      outForDelivery: outForDelivery,
      delivered: delivered,
    );
  }

  /// Update a delivery order's status.
  Future<void> updateStatus(String orderId, String status) async {
    try {
      final dio = ref.read(dioClientProvider).dio;
      await dio.put('/delivery-system/orders/$orderId/status', data: {'status': status});
      ref.invalidateSelf();
    } catch (e) {
      rethrow;
    }
  }

  /// Create a new delivery order.
  Future<void> createDeliveryOrder(Map<String, dynamic> orderData) async {
    try {
      final dio = ref.read(dioClientProvider).dio;
      await dio.post('/delivery-system/orders', data: orderData);
      ref.invalidateSelf();
    } catch (e) {
      rethrow;
    }
  }

  /// Manual refresh.
  Future<void> refresh() async {
    ref.invalidateSelf();
  }
}

final deliveryProvider = AsyncNotifierProvider<DeliveryNotifier, DeliveryState>(() {
  return DeliveryNotifier();
});
