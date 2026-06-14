import 'package:flutter_riverpod/flutter_riverpod.dart';
import '../../../../../core/network/dio_client.dart';
import '../../../../../core/realtime/socket_service.dart';

class InventoryDashboardState {
  final Map<String, dynamic> kpis;
  final List<dynamic> items;
  final List<dynamic> timeline;
  final List<dynamic> purchaseOrders;
  final bool isLoading;
  final String? error;

  InventoryDashboardState({
    this.kpis = const {},
    this.items = const [],
    this.timeline = const [],
    this.purchaseOrders = const [],
    this.isLoading = false,
    this.error,
  });

  InventoryDashboardState copyWith({
    Map<String, dynamic>? kpis,
    List<dynamic>? items,
    List<dynamic>? timeline,
    List<dynamic>? purchaseOrders,
    bool? isLoading,
    String? error,
  }) {
    return InventoryDashboardState(
      kpis: kpis ?? this.kpis,
      items: items ?? this.items,
      timeline: timeline ?? this.timeline,
      purchaseOrders: purchaseOrders ?? this.purchaseOrders,
      isLoading: isLoading ?? this.isLoading,
      error: error ?? this.error,
    );
  }
}

class InventoryDashboardNotifier extends Notifier<InventoryDashboardState> {
  @override
  InventoryDashboardState build() {
    socketService.on('inventory.updated', (data) {
      fetchDashboard();
    });
    
    ref.onDispose(() {
      socketService.off('inventory.updated');
    });
    
    // Auto-fetch on init
    Future.microtask(() => fetchDashboard());
    return InventoryDashboardState();
  }

  Future<void> fetchDashboard() async {
    state = state.copyWith(isLoading: true, error: null);
    try {
      final dio = ref.read(dioClientProvider).dio;
      
      final dashboardRes = await dio.get('/inventory/dashboard');
      final timelineRes = await dio.get('/inventory/timeline');
      final poRes = await dio.get('/inventory/purchase-orders');

      state = state.copyWith(
        kpis: dashboardRes.data['kpis'],
        items: dashboardRes.data['items'],
        timeline: timelineRes.data,
        purchaseOrders: poRes.data,
        isLoading: false,
      );
    } catch (e) {
      state = state.copyWith(isLoading: false, error: e.toString());
    }
  }

  Future<bool> adjustStock(String itemId, String type, int quantity) async {
    try {
      final dio = ref.read(dioClientProvider).dio;
      await dio.post('/inventory/adjust', data: {
        'itemId': itemId,
        'type': type,
        'quantity': quantity
      });
      // Refresh dashboard after adjustment
      await fetchDashboard();
      return true;
    } catch (e) {
      return false;
    }
  }
}

final inventoryDashboardProvider = NotifierProvider<InventoryDashboardNotifier, InventoryDashboardState>(() {
  return InventoryDashboardNotifier();
});
