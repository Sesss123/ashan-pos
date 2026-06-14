import 'package:dio/dio.dart';
import 'package:flutter_riverpod/flutter_riverpod.dart';
import 'package:shared_preferences/shared_preferences.dart';
import 'package:flutter_secure_storage/flutter_secure_storage.dart';
import 'dart:convert';
import 'package:flutter/material.dart';
import '../../main.dart';
import 'offline_sync_service.dart';
import '../../features/auth/presentation/providers/auth_provider.dart';
import 'package:flutter_dotenv/flutter_dotenv.dart';

class DioClient {
  static final Dio _dio = Dio(
    BaseOptions(
      baseUrl: dotenv.env['API_URL'] ?? 'http://127.0.0.1:5000/api/v1',
      connectTimeout: const Duration(seconds: 10),
      receiveTimeout: const Duration(seconds: 10),
      headers: {
        'Content-Type': 'application/json',
        'Accept': 'application/json',
        'ngrok-skip-browser-warning': 'true',
      },
    ),
  )..interceptors.add(
      InterceptorsWrapper(
        onRequest: (options, handler) async {
          const storage = FlutterSecureStorage();
          final token = await storage.read(key: 'auth_token');
          if (token != null) {
            options.headers['Authorization'] = 'Bearer $token';
          }
          return handler.next(options);
        },
        onResponse: (response, handler) async {
          // Cache successful GET requests for Offline Mode
          if (response.requestOptions.method == 'GET' && response.statusCode == 200) {
            final prefs = await SharedPreferences.getInstance();
            await prefs.setString('cache_${response.requestOptions.uri}', jsonEncode(response.data));
          }
          return handler.next(response);
        },
        onError: (DioException e, handler) async {
          // Offline Sync Intercept for Orders
          if (e.requestOptions.method == 'POST' && e.requestOptions.uri.path.contains('/orders') && _isNetworkError(e)) {
            final dynamic orderData = e.requestOptions.data is String ? jsonDecode(e.requestOptions.data) : e.requestOptions.data;
            await OfflineSyncService.instance.queueFailedOrder(Map<String, dynamic>.from(orderData as Map));
            
            return handler.resolve(
              Response(
                requestOptions: e.requestOptions,
                data: {'success': true, 'message': 'Order saved offline', 'isOffline': true, 'data': { 'id': 'OFFLINE-${DateTime.now().millisecondsSinceEpoch}' }},
                statusCode: 200,
              ),
            );
          }

          // Offline Cache Fallback for GET requests
          if (e.requestOptions.method == 'GET' && _isNetworkError(e)) {
            final prefs = await SharedPreferences.getInstance();
            final cachedData = prefs.getString('cache_${e.requestOptions.uri}');
            if (cachedData != null) {
              debugPrint('[DioClient] Serving from Offline Cache: ${e.requestOptions.uri}');
              return handler.resolve(
                Response(
                  requestOptions: e.requestOptions,
                  data: jsonDecode(cachedData),
                  statusCode: 200,
                ),
              );
            }
          }

          // Simple Retry Logic for 5xx or Network Errors (Max 3 retries)
          if (_shouldRetry(e)) {
            int retries = e.requestOptions.extra['retries'] ?? 0;
            if (retries < 3) {
              e.requestOptions.extra['retries'] = retries + 1;
              debugPrint('[DioClient] Retrying request (${retries + 1}/3): ${e.requestOptions.uri}');
              await Future.delayed(Duration(seconds: (retries + 1) * 2)); // Exponential backoff
              try {
                final response = await _dio.fetch(e.requestOptions);
                return handler.resolve(response);
              } catch (retryError) {
                return handler.next(retryError as DioException);
              }
            }
          }

          if (e.response?.statusCode == 401) {
            const storage = FlutterSecureStorage();
            final refreshToken = await storage.read(key: 'refresh_token');

            if (refreshToken != null) {
              try {
                // Attempt to get a new access token using the refresh token
                final refreshResponse = await Dio().post(
                  '${dotenv.env['API_URL'] ?? 'http://127.0.0.1:5000/api/v1'}/auth/refresh',
                  data: {'token': refreshToken},
                );
                
                if (refreshResponse.statusCode == 200) {
                  final newAccessToken = refreshResponse.data['accessToken'];
                  final newRefreshToken = refreshResponse.data['refreshToken'];
                  
                  if (newAccessToken != null) {
                    await storage.write(key: 'auth_token', value: newAccessToken);
                    if (newRefreshToken != null) {
                      await storage.write(key: 'refresh_token', value: newRefreshToken);
                    }
                    
                    // Retry the original request with the new token
                    e.requestOptions.headers['Authorization'] = 'Bearer $newAccessToken';
                    final retryResponse = await _dio.fetch(e.requestOptions);
                    return handler.resolve(retryResponse);
                  }
                }
              } catch (refreshError) {
                debugPrint('[DioClient] Token refresh failed: $refreshError');
              }
            }

            // Auto-logout on token expiry and refresh failure
            await storage.delete(key: 'auth_token');
            await storage.delete(key: 'refresh_token');
            final prefs = await SharedPreferences.getInstance();
            await prefs.remove('user_data');
            
            if (navigatorKey.currentContext != null) {
              // Instead of manually pushing a MaterialPageRoute, we read the AuthNotifier to log out,
              // which clears state and triggers GoRouter redirect.
              Future.microtask(() {
                ProviderScope.containerOf(navigatorKey.currentContext!)
                    .read(authProvider.notifier)
                    .logout();
              });
            }
          } else {
            // Show global error for other failures
            _showGlobalError(e);
          }
          return handler.next(e);
        },
      ),
    );

  static bool _isNetworkError(DioException e) {
    return e.type == DioExceptionType.connectionTimeout ||
           e.type == DioExceptionType.sendTimeout ||
           e.type == DioExceptionType.receiveTimeout ||
           e.type == DioExceptionType.connectionError;
  }

  static bool _shouldRetry(DioException e) {
    if (_isNetworkError(e)) return true;
    if (e.response != null && e.response!.statusCode != null) {
      return e.response!.statusCode! >= 500;
    }
    return false;
  }

  static void _showGlobalError(DioException e) {
    if (navigatorKey.currentContext == null) return;
    
    String message = 'A network error occurred. Please check your connection.';
    if (e.type == DioExceptionType.connectionTimeout || e.type == DioExceptionType.receiveTimeout) {
      message = 'Connection timed out. Please try again.';
    } else if (e.response != null && e.response?.data != null) {
      final data = e.response!.data;
      if (data is Map && data['message'] != null) {
        message = data['message'];
      } else {
        message = 'Server Error (${e.response?.statusCode})';
      }
    }

    // Use Future.microtask to avoid state conflicts during build phase
    Future.microtask(() {
      final context = navigatorKey.currentContext;
      if (context != null && context.mounted) {
        ScaffoldMessenger.of(context).showSnackBar(
          SnackBar(
            content: Row(
              children: [
                const Icon(Icons.error_outline, color: Colors.white),
                const SizedBox(width: 12),
                Expanded(child: Text(message, style: const TextStyle(color: Colors.white, fontWeight: FontWeight.bold, fontFamily: 'Inter'))),
              ],
            ),
            backgroundColor: Colors.redAccent.shade700,
            behavior: SnackBarBehavior.floating,
            shape: RoundedRectangleBorder(borderRadius: BorderRadius.circular(12)),
            margin: const EdgeInsets.all(20),
            duration: const Duration(seconds: 4),
          ),
        );
      }
    });
  }

  static Dio get instance => _dio;
  Dio get dio => _dio;
}

final dioClientProvider = Provider<DioClient>((ref) {
  final client = DioClient();
  return client;
});
