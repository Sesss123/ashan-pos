import '../../../../core/utils/app_currency.dart';
import 'package:flutter_riverpod/flutter_riverpod.dart';
import '../../../../core/network/dio_client.dart';

class SupplierState {
  final List<dynamic> suppliers;
  final Map<String, dynamic> stats;

  SupplierState({
    required this.suppliers,
    required this.stats,
  });
}

class SupplierNotifier extends AsyncNotifier<SupplierState> {
  @override
  Future<SupplierState> build() async {
    return _fetchData();
  }

  Future<SupplierState> _fetchData() async {
    final dio = ref.read(dioClientProvider).dio;
    final res = await dio.get('/supplier/suppliers');
    final data = res.data['data'] as List<dynamic>;

    // Calculate mock stats from real data for now, or fetch from a stats endpoint
    double totalPayable = data.fold(0.0, (sum, sup) => sum + (double.tryParse(sup['openingBalance']?.toString() ?? '0') ?? 0.0));
    
    return SupplierState(
      suppliers: data,
      stats: {
        'totalSuppliers': data.length.toString(),
        'activePOs': '0', // Requires a separate endpoint GET /supplier/purchases
        'outstandingPayable': AppCurrency.format(totalPayable),
      },
    );
  }
}

final supplierProvider = AsyncNotifierProvider<SupplierNotifier, SupplierState>(() {
  return SupplierNotifier();
});
