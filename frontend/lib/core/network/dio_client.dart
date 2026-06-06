import 'package:dio/dio.dart';

class DioClient {
  static final Dio _dio = Dio(
    BaseOptions(
      baseUrl: 'http://localhost:5000/api', // Use environment variables in production
      connectTimeout: const Duration(seconds: 10),
      receiveTimeout: const Duration(seconds: 10),
      headers: {
        'Content-Type': 'application/json',
        'Accept': 'application/json',
      },
    ),
  )..interceptors.add(
      InterceptorsWrapper(
        onRequest: (options, handler) {
          // Add auth token if exists
          // const token = 'get_token_from_secure_storage';
          // options.headers['Authorization'] = 'Bearer $token';
          return handler.next(options);
        },
        onError: (DioException e, handler) async {
          // Implement Refresh Token Rotation Logic here
          if (e.response?.statusCode == 401) {
            // refreshToken();
          }
          return handler.next(e);
        },
      ),
    );

  static Dio get instance => _dio;
}
