import 'package:flutter_riverpod/flutter_riverpod.dart';
import '../../../../core/network/dio_client.dart';
import 'package:dio/dio.dart';

class PosState {
  final bool isLoading;
  final String? error;
  final List<dynamic> orders;
  final List<dynamic> products;

  PosState({
    this.isLoading = false,
    this.error,
    this.orders = const [],
    this.products = const [],
  });

  PosState copyWith({
    bool? isLoading,
    String? error,
    List<dynamic>? orders,
    List<dynamic>? products,
    bool clearError = false,
  }) {
    return PosState(
      isLoading: isLoading ?? this.isLoading,
      error: clearError ? null : (error ?? this.error),
      orders: orders ?? this.orders,
      products: products ?? this.products,
    );
  }
}

class PosNotifier extends Notifier<PosState> {
  @override
  PosState build() => PosState();

  Future<void> fetchProducts() async {
    state = state.copyWith(isLoading: true, clearError: true);
    try {
      final dio = ref.read(dioClientProvider).dio;
      final response = await dio.get('/menu/products');
      if (response.statusCode == 200) {
        state = state.copyWith(
          isLoading: false,
          products: response.data['data'] as List<dynamic>,
        );
      }
    } on DioException catch (e) {
      state = state.copyWith(
        isLoading: false,
        error: e.response?.data['message'] ?? e.message ?? 'Failed to fetch menu',
      );
    } catch (e) {
      state = state.copyWith(isLoading: false, error: e.toString());
    }
  }

  Future<void> fetchRecentOrders(String branchId) async {
    // Left as placeholder for future use if needed
  }

  Future<void> submitOrder(Map<String, dynamic> data) async {
    state = state.copyWith(isLoading: true, clearError: true);
    try {
      final dio = ref.read(dioClientProvider).dio;
      final response = await dio.post('/pos/orders', data: data);
      
      if (response.statusCode == 200 || response.statusCode == 201) {
        state = state.copyWith(isLoading: false);
      }
    } on DioException catch (e) {
      state = state.copyWith(
        isLoading: false,
        error: e.response?.data['message'] ?? e.message ?? 'Failed to submit order',
      );
    } catch (e) {
      state = state.copyWith(isLoading: false, error: e.toString());
    }
  }
}

final posProvider = NotifierProvider<PosNotifier, PosState>(() {
  return PosNotifier();
});
