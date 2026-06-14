import 'package:dio/dio.dart';
import 'package:flutter_secure_storage/flutter_secure_storage.dart';
import 'package:flutter_riverpod/flutter_riverpod.dart';

import 'package:flutter_dotenv/flutter_dotenv.dart';

final authRepositoryProvider = Provider<AuthRepository>((ref) {
  // We can't use dioClientProvider here because it will cause a circular dependency
  // since DioClient needs AuthRepository to get the token!
  // Instead, AuthRepository will just handle the storage and a raw Dio instance for login.
  final dio = Dio(BaseOptions(baseUrl: dotenv.env['API_URL'] ?? 'http://127.0.0.1:5000/api/v1'));
  return AuthRepository(dio, const FlutterSecureStorage());
});

class AuthRepository {
  final Dio _dio;
  final FlutterSecureStorage _storage;

  AuthRepository(this._dio, this._storage);

  Future<Map<String, dynamic>> login(String email, String password) async {
    final response = await _dio.post('/auth/login', data: {
      'email': email,
      'password': password,
    });
    
    if (response.data['success'] == true || response.data['accessToken'] != null) {
      return response.data;
    } else {
      throw Exception(response.data['message'] ?? 'Login failed');
    }
  }

  Future<void> saveTokens(String token, String? refreshToken) async {
    await _storage.write(key: 'auth_token', value: token);
    if (refreshToken != null) {
      await _storage.write(key: 'refresh_token', value: refreshToken);
    }
  }

  Future<void> saveRole(String role) async {
    await _storage.write(key: 'user_role', value: role);
  }

  Future<String?> getToken() async {
    return await _storage.read(key: 'auth_token');
  }

  Future<String?> getRole() async {
    return await _storage.read(key: 'user_role');
  }

  Future<void> clearAll() async {
    await _storage.deleteAll();
  }
}
