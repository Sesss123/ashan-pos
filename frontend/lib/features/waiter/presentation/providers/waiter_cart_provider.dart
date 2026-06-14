import 'package:flutter_riverpod/flutter_riverpod.dart';
import '../../../../core/network/dio_client.dart';
import '../../../cashier/domain/models/product.dart';
import '../../../cashier/domain/models/cart_item.dart';

class WaiterCartState {
  final List<CartItem> items;
  final List<CartItem> sentItems;
  final String? tableId;
  final String? customerNotes;
  final String? selectedCategoryId;

  WaiterCartState({
    this.items = const [],
    this.sentItems = const [],
    this.tableId,
    this.customerNotes,
    this.selectedCategoryId,
  });

  WaiterCartState copyWith({
    List<CartItem>? items,
    List<CartItem>? sentItems,
    String? tableId,
    String? customerNotes,
    String? selectedCategoryId,
    bool clearCategory = false,
  }) {
    return WaiterCartState(
      items: items ?? this.items,
      sentItems: sentItems ?? this.sentItems,
      tableId: tableId ?? this.tableId,
      customerNotes: customerNotes ?? this.customerNotes,
      selectedCategoryId: clearCategory ? null : (selectedCategoryId ?? this.selectedCategoryId),
    );
  }

  double get subtotal => items.fold(0, (sum, item) => sum + item.totalPrice);
  double get sentSubtotal => sentItems.fold(0, (sum, item) => sum + item.totalPrice);
  double get combinedTotal => subtotal + sentSubtotal;
}

class WaiterCartNotifier extends Notifier<WaiterCartState> {
  @override
  WaiterCartState build() => WaiterCartState();

  void selectCategory(String? categoryId) {
    if (categoryId == null) {
      state = state.copyWith(clearCategory: true);
    } else {
      state = state.copyWith(selectedCategoryId: categoryId);
    }
  }

  void setTable(String tableId) {
    if (state.tableId != tableId) {
      // Switched to a different table, start with a fresh cart!
      state = WaiterCartState(tableId: tableId);
    }
  }

  void addNotes(String notes) {
    state = state.copyWith(customerNotes: notes);
  }

  void addItem(Product product, {int quantity = 1, String notes = ''}) {
    final items = List<CartItem>.from(state.items);
    final index = items.indexWhere((i) => i.product.id == product.id && i.notes == notes);
    
    if (index >= 0) {
      items[index] = CartItem(
        product: product,
        quantity: items[index].quantity + quantity,
        notes: notes,
      );
    } else {
      items.add(CartItem(product: product, quantity: quantity, notes: notes));
    }
    
    state = state.copyWith(items: items);
  }

  void updateQuantity(Product product, int quantity, String notes) {
    if (quantity <= 0) {
      removeItem(product, notes);
      return;
    }
    
    final items = List<CartItem>.from(state.items);
    final index = items.indexWhere((i) => i.product.id == product.id && i.notes == notes);
    
    if (index >= 0) {
      items[index] = CartItem(product: product, quantity: quantity, notes: notes);
      state = state.copyWith(items: items);
    }
  }

  void removeItem(Product product, String notes) {
    final items = List<CartItem>.from(state.items);
    items.removeWhere((i) => i.product.id == product.id && i.notes == notes);
    state = state.copyWith(items: items);
  }

  void clear() {
    state = WaiterCartState(tableId: state.tableId);
  }

  void loadExistingItems(List<CartItem> items) {
    state = state.copyWith(sentItems: items, items: []);
  }

  Future<void> sendToKitchen(String branchId) async {
    if (state.items.isEmpty || state.tableId == null) return;

    final dio = ref.read(dioClientProvider).dio;
    final payload = {
      'tableId': state.tableId,
      'branchId': branchId,
      'items': state.items.map((i) => {
        'productId': i.product.id,
        'quantity': i.quantity,
        'unitPrice': i.product.price,
        'notes': i.notes
      }).toList(),
      'subtotal': state.subtotal,
      'taxAmount': state.subtotal * 0.1, // Currently fixed to 10%, can be fetched from settingsProvider
      'total': state.subtotal * 1.1,
    };

    try {
      await dio.post('/waiter/tables/order', data: payload);
      state = state.copyWith(sentItems: [...state.sentItems, ...state.items], items: []);
    } catch (e) {
      throw Exception('Failed to send order to kitchen: $e');
    }
  }

  Future<void> voidItem(String orderId, String itemId) async {
    final dio = ref.read(dioClientProvider).dio;
    try {
      await dio.put('/waiter/orders/$orderId/items/$itemId/void');
      final updatedSent = state.sentItems.where((i) => i.id != itemId).toList();
      state = state.copyWith(sentItems: updatedSent);
    } catch (e) {
      throw Exception('Failed to void item: $e');
    }
  }
}

final waiterCartProvider = NotifierProvider<WaiterCartNotifier, WaiterCartState>(() {
  return WaiterCartNotifier();
});

// Fetch categories from backend
final categoriesProvider = FutureProvider<List<Category>>((ref) async {
  final dio = ref.read(dioClientProvider).dio;
  final res = await dio.get('/menu/categories');
  return (res.data as List).map((json) => Category.fromJson(json)).toList();
});

// Fetch products from backend
final productsProvider = FutureProvider<List<Product>>((ref) async {
  final dio = ref.read(dioClientProvider).dio;
  final res = await dio.get('/menu/products');
  return (res.data as List).map((json) => Product.fromJson(json)).toList();
});
