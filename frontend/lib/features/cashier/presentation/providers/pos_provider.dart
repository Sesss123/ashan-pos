import 'package:flutter_riverpod/flutter_riverpod.dart';
import '../../domain/models/product.dart';
import '../../domain/repositories/menu_repository.dart';
import 'cart_provider.dart';

class POSDashboardState {
  final List<Product> allProducts;
  final List<Product> filteredProducts;
  final List<Category> categories;
  final String? selectedCategoryId;
  final String searchQuery;
  final bool isLoading;
  final String? errorMessage;

  POSDashboardState({
    required this.allProducts,
    required this.filteredProducts,
    this.categories = const [],
    this.selectedCategoryId,
    this.searchQuery = '',
    this.isLoading = false,
    this.errorMessage,
  });

  POSDashboardState copyWith({
    List<Product>? allProducts,
    List<Product>? filteredProducts,
    List<Category>? categories,
    String? selectedCategoryId,
    bool clearCategory = false,
    String? searchQuery,
    bool? isLoading,
    String? errorMessage,
  }) {
    return POSDashboardState(
      allProducts: allProducts ?? this.allProducts,
      filteredProducts: filteredProducts ?? this.filteredProducts,
      categories: categories ?? this.categories,
      selectedCategoryId: clearCategory ? null : (selectedCategoryId ?? this.selectedCategoryId),
      searchQuery: searchQuery ?? this.searchQuery,
      isLoading: isLoading ?? this.isLoading,
      errorMessage: errorMessage,
    );
  }
}

class POSDashboardNotifier extends Notifier<POSDashboardState> {
  @override
  POSDashboardState build() {
    Future.microtask(() => loadProducts());
    
    // Real-time updates handled by socketServiceProvider

    return POSDashboardState(
      allProducts: [],
      filteredProducts: [],
      isLoading: true,
    );
  }

  Future<void> loadProducts() async {
    state = state.copyWith(isLoading: true);
    try {
      final menuRepo = ref.read(menuRepositoryProvider);
      final data = await menuRepo.fetchMenu();
      
      final categories = data['categories'] as List<Category>;
      final products = data['products'] as List<Product>;

      state = state.copyWith(
        allProducts: products,
        filteredProducts: products,
        categories: categories,
        isLoading: false,
      );
      _applyFilters();
    } catch (e) {
      state = state.copyWith(
        isLoading: false,
        errorMessage: e.toString(),
      );
    }
  }

  void selectCategory(String? categoryId) {
    if (categoryId == null) {
      state = state.copyWith(clearCategory: true);
    } else {
      state = state.copyWith(selectedCategoryId: categoryId);
    }
    _applyFilters();
  }

  void updateSearchQuery(String query) {
    state = state.copyWith(searchQuery: query);
    _applyFilters();
  }

  void _applyFilters() {
    var list = state.allProducts;
    
    if (state.selectedCategoryId != null) {
      list = list.where((p) => p.categoryId == state.selectedCategoryId).toList();
    }
    
    if (state.searchQuery.isNotEmpty) {
      final q = state.searchQuery.toLowerCase();
      list = list.where((p) => 
        p.name.toLowerCase().contains(q) || 
        p.barcode.contains(q)
      ).toList();
    }
    
    state = state.copyWith(filteredProducts: list);
  }

  // Triggered when barcode scanner reads a code
  Future<bool> handleBarcodeScan(String barcode) async {
    final product = state.allProducts.where((p) => p.barcode == barcode).firstOrNull;
    if (product != null) {
      // Add product to cart immediately
      ref.read(cartProvider.notifier).addToCart(product);
      return true;
    }
    return false;
  }
}

final posDashboardProvider = NotifierProvider<POSDashboardNotifier, POSDashboardState>(POSDashboardNotifier.new);
