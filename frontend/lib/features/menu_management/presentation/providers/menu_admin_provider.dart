import 'package:flutter_riverpod/flutter_riverpod.dart';
import '../../../../core/network/dio_client.dart';

// Admin Category Model (since Product uses enum for now, we define Category separately for Admin)
class AdminCategory {
  final String id;
  final String name;
  final bool isActive;

  AdminCategory({required this.id, required this.name, this.isActive = true});

  factory AdminCategory.fromJson(Map<String, dynamic> json) => AdminCategory(
    id: json['id'],
    name: json['name'],
    isActive: json['isActive'] ?? true,
  );

  Map<String, dynamic> toJson() => {
    'id': id,
    'name': name,
    'isActive': isActive,
  };
}

class AdminProduct {
  final String id;
  final String name;
  final double price;
  final String? barcode;
  final String categoryId;
  final bool isActive;

  AdminProduct({
    required this.id,
    required this.name,
    required this.price,
    this.barcode,
    required this.categoryId,
    this.isActive = true,
  });

  factory AdminProduct.fromJson(Map<String, dynamic> json) => AdminProduct(
    id: json['id'],
    name: json['name'],
    price: (json['price'] as num).toDouble(),
    barcode: json['barcode'],
    categoryId: json['categoryId'],
    isActive: json['isActive'] ?? true,
  );
}

class MenuAdminState {
  final List<AdminProduct> products;
  final List<AdminCategory> categories;
  final bool isLoading;
  final String? errorMessage;

  MenuAdminState({
    this.products = const [],
    this.categories = const [],
    this.isLoading = false,
    this.errorMessage,
  });

  MenuAdminState copyWith({
    List<AdminProduct>? products,
    List<AdminCategory>? categories,
    bool? isLoading,
    String? errorMessage,
  }) {
    return MenuAdminState(
      products: products ?? this.products,
      categories: categories ?? this.categories,
      isLoading: isLoading ?? this.isLoading,
      errorMessage: errorMessage,
    );
  }
}

class MenuAdminNotifier extends AsyncNotifier<MenuAdminState> {
  @override
  Future<MenuAdminState> build() async {
    await loadData();
    return state.value ?? MenuAdminState();
  }

  Future<void> loadData() async {
    state = const AsyncLoading();
    try {
      final dio = ref.read(dioClientProvider).dio;
      
      final categoriesRes = await dio.get('/menu/categories');
      final categories = (categoriesRes.data as List)
          .map((c) => AdminCategory.fromJson(c))
          .toList();

      final productsRes = await dio.get('/menu/products');
      final products = (productsRes.data as List)
          .map((p) => AdminProduct.fromJson(p))
          .toList();

      state = AsyncData(MenuAdminState(
        categories: categories,
        products: products,
      ));
    } catch (e, st) {
      state = AsyncError(e, st);
    }
  }

  Future<void> createProduct(Map<String, dynamic> data) async {
    try {
      final dio = ref.read(dioClientProvider).dio;
      await dio.post('/menu/products', data: data);
      await loadData();
    } catch (e) {
      rethrow;
    }
  }

  Future<void> updateProduct(String id, Map<String, dynamic> data) async {
    try {
      final dio = ref.read(dioClientProvider).dio;
      await dio.put('/menu/products/$id', data: data);
      await loadData();
    } catch (e) {
      rethrow;
    }
  }

  Future<void> deleteProduct(String id) async {
    try {
      final dio = ref.read(dioClientProvider).dio;
      await dio.delete('/menu/products/$id');
      await loadData();
    } catch (e) {
      rethrow;
    }
  }

  Future<void> createCategory(Map<String, dynamic> data) async {
    try {
      final dio = ref.read(dioClientProvider).dio;
      await dio.post('/menu/categories', data: data);
      await loadData();
    } catch (e) {
      rethrow;
    }
  }

  Future<void> updateCategory(String id, Map<String, dynamic> data) async {
    try {
      final dio = ref.read(dioClientProvider).dio;
      await dio.put('/menu/categories/$id', data: data);
      await loadData();
    } catch (e) {
      rethrow;
    }
  }

  Future<void> deleteCategory(String id) async {
    try {
      final dio = ref.read(dioClientProvider).dio;
      await dio.delete('/menu/categories/$id');
      await loadData();
    } catch (e) {
      rethrow;
    }
  }
}

final menuAdminProvider = AsyncNotifierProvider<MenuAdminNotifier, MenuAdminState>(() {
  return MenuAdminNotifier();
});
