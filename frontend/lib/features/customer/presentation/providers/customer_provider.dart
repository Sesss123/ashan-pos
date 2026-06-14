import '../../../../core/utils/app_currency.dart';
import 'package:flutter_riverpod/flutter_riverpod.dart';
import '../../../../core/network/dio_client.dart';
import '../../../../core/realtime/socket_service.dart';

class CustomerState {
  final List<dynamic> customers;
  final Map<String, dynamic> stats;

  CustomerState({
    required this.customers,
    required this.stats,
  });
}

class CustomerNotifier extends AsyncNotifier<CustomerState> {
  @override
  Future<CustomerState> build() async {
    socketService.on('customer.updated', (data) {
      ref.invalidateSelf();
    });

    ref.onDispose(() {
      socketService.off('customer.updated');
    });

    return _fetchData();
  }

  Future<CustomerState> _fetchData() async {
    final dio = ref.read(dioClientProvider).dio;
    final res = await dio.get('/customers');
    final data = res.data as List<dynamic>;

    double totalWallet = data.fold(0.0, (sum, c) => sum + (c['wallet']?['balance'] ?? 0.0));
    int totalPoints = data.fold(0, (sum, c) => sum + ((c['points']?['balance'] ?? 0) as num).toInt());

    return CustomerState(
      customers: data,
      stats: {
        'vipCount': data.where((c) => c['groupId'] != null).length.toString(),
        'totalPoints': totalPoints.toString(),
        'walletBalance': AppCurrency.format(totalWallet),
      },
    );
  }
}

final customerProvider = AsyncNotifierProvider<CustomerNotifier, CustomerState>(() {
  return CustomerNotifier();
});
