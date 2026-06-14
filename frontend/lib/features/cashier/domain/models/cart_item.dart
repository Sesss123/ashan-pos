import 'product.dart';

class OrderModifier {
  final String name;
  final double additionalPrice;
  OrderModifier({required this.name, required this.additionalPrice});
  Map<String, dynamic> toJson() => {'name': name, 'additionalPrice': additionalPrice};
  factory OrderModifier.fromJson(Map<String, dynamic> json) => OrderModifier(name: json['name'], additionalPrice: json['additionalPrice']);
}

class CartItem {
  final String? id;
  final String? orderId;
  final Product product;
  final int quantity;
  final String notes;
  final List<OrderModifier> modifiers;

  const CartItem({
    this.id,
    this.orderId,
    required this.product,
    this.quantity = 1,
    this.notes = '',
    this.modifiers = const [],
  });

  double get totalPrice => (product.price + modifiers.fold(0.0, (sum, m) => sum + m.additionalPrice)) * quantity;

  CartItem copyWith({
    String? id,
    String? orderId,
    Product? product,
    int? quantity,
    String? notes,
    List<OrderModifier>? modifiers,
  }) {
    return CartItem(
      id: id ?? this.id,
      orderId: orderId ?? this.orderId,
      product: product ?? this.product,
      quantity: quantity ?? this.quantity,
      notes: notes ?? this.notes,
      modifiers: modifiers ?? this.modifiers,
    );
  }

  factory CartItem.fromJson(Map<String, dynamic> json) {
    return CartItem(
      id: json['id'] as String?,
      orderId: json['orderId'] as String?,
      product: Product.fromJson(json['product'] as Map<String, dynamic>),
      quantity: json['quantity'] as int? ?? 1,
      notes: json['notes'] as String? ?? '',
      modifiers: (json['modifiers'] as List<dynamic>?)
              ?.map((e) => OrderModifier.fromJson(e as Map<String, dynamic>))
              .toList() ??
          [],
    );
  }

  Map<String, dynamic> toJson() {
    return {
      'id': id,
      'orderId': orderId,
      'product': product.toJson(),
      'quantity': quantity,
      'notes': notes,
      'modifiers': modifiers.map((m) => m.toJson()).toList(),
    };
  }
}
