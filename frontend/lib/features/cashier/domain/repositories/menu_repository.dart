import 'package:dio/dio.dart';
import 'package:hive/hive.dart';
import 'package:flutter_riverpod/flutter_riverpod.dart';
import '../../../../core/network/dio_client.dart';
import '../models/product.dart';

final menuRepositoryProvider = Provider<MenuRepository>((ref) {
  final dioClient = ref.read(dioClientProvider);
  return MenuRepository(dioClient.dio);
});

class MenuRepository {
  final Dio _dio;

  MenuRepository(this._dio);

  Future<Map<String, dynamic>> fetchMenu() async {
    final box = Hive.box('menu_cache');
    try {
      final catRes = await _dio.get('/menu/categories');
      final prodRes = await _dio.get('/menu/products');

      // Cache for offline
      await box.put('categories', catRes.data);
      await box.put('products', prodRes.data);

      final categories = (catRes.data as List).map((c) => Category.fromJson(c)).toList();
      final products = (prodRes.data as List).map((p) => Product.fromJson(p)).toList();

      return {
        'categories': categories,
        'products': products,
      };
    } catch (e) {
      // Fallback to cache
      final cachedCats = box.get('categories');
      final cachedProds = box.get('products');

      if (cachedCats != null && cachedProds != null) {
        final categories = (cachedCats as List).map((c) => Category.fromJson(Map<String, dynamic>.from(c))).toList();
        final products = (cachedProds as List).map((p) => Product.fromJson(Map<String, dynamic>.from(p))).toList();
        
        return {
          'categories': categories,
          'products': products,
        };
      }
      
      throw Exception('Failed to load menu and no offline cache available: $e');
    }
  }
}
