import 'package:flutter_riverpod/flutter_riverpod.dart';

class CartItem {
  final String productId;
  final String name;
  final double unitPrice;
  int quantity;

  CartItem({
    required this.productId,
    required this.name,
    required this.unitPrice,
    this.quantity = 1,
  });

  double get subtotal => unitPrice * quantity;
}

class CartNotifier extends Notifier<List<CartItem>> {
  double discount = 0.0;
  double taxRate = 0.0;

  @override
  List<CartItem> build() => [];

  void addItem(CartItem item) {
    final existingItemIndex = state.indexWhere((i) => i.productId == item.productId);
    if (existingItemIndex >= 0) {
      final newState = [...state];
      newState[existingItemIndex].quantity += item.quantity;
      state = newState;
    } else {
      state = [...state, item];
    }
  }

  void removeItem(String productId) {
    state = state.where((item) => item.productId != productId).toList();
  }

  void clearCart() {
    state = [];
    discount = 0.0;
    taxRate = 0.0;
  }

  void setDiscount(double amount) {
    discount = amount;
    ref.notifyListeners();
  }

  void setTaxRate(double rate) {
    taxRate = rate;
    ref.notifyListeners();
  }

  double get subtotal => state.fold(0, (sum, item) => sum + item.subtotal);
  double get taxAmount => subtotal * taxRate;
  double get total => (subtotal - discount) + taxAmount;
}

final cartProvider = NotifierProvider<CartNotifier, List<CartItem>>(() {
  return CartNotifier();
});
