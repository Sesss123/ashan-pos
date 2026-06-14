import 'package:flutter_riverpod/flutter_riverpod.dart';
import '../../data/repositories/cashier_repository.dart';
import '../../../../core/network/dio_client.dart';
import 'package:hive/hive.dart';

// Provider for Repository
final cashierRepositoryProvider = Provider<CashierRepository>((ref) {
  return CashierRepository(ref.watch(dioClientProvider));
});

// Provider for Tables
final tablesProvider = FutureProvider<List<dynamic>>((ref) async {
  final repository = ref.watch(cashierRepositoryProvider);
  return await repository.getTables();
});

// Notifier for Customer Search
class CustomerSearchNotifier extends AsyncNotifier<List<dynamic>> {
  @override
  Future<List<dynamic>> build() async {
    return [];
  }

  Future<void> search(String query) async {
    if (query.isEmpty) {
      state = const AsyncValue.data([]);
      return;
    }
    state = const AsyncValue.loading();
    try {
      final repository = ref.read(cashierRepositoryProvider);
      final results = await repository.searchCustomers(query);
      state = AsyncValue.data(results);
    } catch (e, st) {
      state = AsyncValue.error(e, st);
    }
  }
}

final customerSearchProvider = AsyncNotifierProvider<CustomerSearchNotifier, List<dynamic>>(() {
  return CustomerSearchNotifier();
});

// Provider for Receipts
final receiptsProvider = FutureProvider.family<List<dynamic>, Map<String, dynamic>>((ref, filters) async {
  final repository = ref.watch(cashierRepositoryProvider);
  return await repository.getReceipts(filters);
});

// Provider for Current Shift
final currentShiftProvider = FutureProvider<Map<String, dynamic>?>((ref) async {
  final repository = ref.watch(cashierRepositoryProvider);
  return await repository.getCurrentShift();
});

// Provider for Menu Items
final menuItemsProvider = FutureProvider<List<dynamic>>((ref) async {
  final dio = ref.watch(dioClientProvider).dio;
  try {
    final response = await dio.get('/menu/products');
    final data = response.data as List<dynamic>;
    final box = Hive.box('menu_cache');
    await box.put('menu', data);
    return data;
  } catch (e) {
    final box = Hive.box('menu_cache');
    if (box.containsKey('menu')) {
      return box.get('menu') as List<dynamic>;
    }
    rethrow;
  }
});
