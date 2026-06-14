import 'package:dio/dio.dart';
import 'package:flutter_riverpod/flutter_riverpod.dart';
import '../../../../core/network/dio_client.dart';

final kitchenRepositoryProvider = Provider<KitchenRepository>((ref) {
  final dioClient = ref.read(dioClientProvider);
  return KitchenRepository(dioClient.dio);
});

class KitchenRepository {
  final Dio _dio;

  KitchenRepository(this._dio);

  Future<List<dynamic>> fetchQueue() async {
    final response = await _dio.get('/kitchen/queue');
    return response.data['data'] as List<dynamic>;
  }

  Future<List<dynamic>> fetchHistory() async {
    final response = await _dio.get('/kitchen/history');
    return response.data['data'] as List<dynamic>;
  }

  Future<void> updateStatus(String orderId, String newStatus) async {
    await _dio.put('/kitchen/status', data: {
      'orderId': orderId,
      'status': newStatus
    });
  }

  Future<Map<String, dynamic>> fetchAnalytics() async {
    final response = await _dio.get('/kitchen/analytics');
    return response.data['data'] as Map<String, dynamic>;
  }
}
