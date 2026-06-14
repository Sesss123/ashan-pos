import 'package:dio/dio.dart';
import 'package:flutter_riverpod/flutter_riverpod.dart';
import '../../network/dio_client.dart';

final settingsRepositoryProvider = Provider<SettingsRepository>((ref) {
  final dioClient = ref.read(dioClientProvider);
  return SettingsRepository(dioClient.dio);
});

class SettingsRepository {
  final Dio _dio;

  SettingsRepository(this._dio);

  Future<Map<String, dynamic>> fetchPublicSettings() async {
    final response = await _dio.get('/settings/public');
    if (response.data['success'] == true) {
      return response.data['data'] as Map<String, dynamic>;
    } else {
      throw Exception('Failed to fetch settings');
    }
  }
}
