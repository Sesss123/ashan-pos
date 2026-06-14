import 'cart_item.dart';

enum OrderType {
  dineIn(name: 'Dine In'),
  takeAway(name: 'Take Away'),
  delivery(name: 'Delivery');

  final String name;
  const OrderType({required this.name});
}

enum PaymentMethod {
  cash(name: 'Cash'),
  card(name: 'Card'),
  online(name: 'Online'),
  credit(name: 'Store Credit'),
  split(name: 'Split Payment');

  final String name;
  const PaymentMethod({required this.name});
}

enum OrderStatus {
  completed(name: 'Completed'),
  voided(name: 'Voided'),
  refunded(name: 'Refunded');

  final String name;
  const OrderStatus({required this.name});
}

class Order {
  final String id;
  final String orderNumber;
  final List<CartItem> items;
  final OrderType type;
  final PaymentMethod? paymentMethod;
  final DateTime dateTime;
  final double vatRate; // e.g. 0.15 (15%)
  final double serviceChargeRate; // e.g. 0.10 (10%)
  final double discountAmount;
  final String? customerName;
  final String? tableNumber;
  final String? deliveryAddress;
  final List<double>? splitPayments;
  final bool isPaid;
  final OrderStatus status;

  const Order({
    required this.id,
    required this.orderNumber,
    required this.items,
    required this.type,
    this.paymentMethod,
    required this.dateTime,
    this.vatRate = 0.15,
    this.serviceChargeRate = 0.10,
    this.discountAmount = 0.0,
    this.customerName,
    this.tableNumber,
    this.deliveryAddress,
    this.splitPayments,
    this.isPaid = false,
    this.status = OrderStatus.completed,
  });

  // Calculate Subtotal (Sum of all items total prices before tax and discounts)
  double get subtotal => items.fold(0.0, (sum, item) => sum + item.totalPrice);

  // Service charge calculation (Subtotal - discount) * serviceChargeRate
  double get serviceCharge {
    final amountAfterDiscount = subtotal - discountAmount;
    final base = amountAfterDiscount > 0 ? amountAfterDiscount : 0.0;
    return base * serviceChargeRate;
  }

  // VAT/Tax calculation (Subtotal - discount + serviceCharge) * vatRate
  double get vat {
    final amountAfterDiscount = subtotal - discountAmount;
    final base = amountAfterDiscount > 0 ? amountAfterDiscount : 0.0;
    return (base + serviceCharge) * vatRate;
  }

  // Grand Total calculation
  double get grandTotal {
    final amountAfterDiscount = subtotal - discountAmount;
    final base = amountAfterDiscount > 0 ? amountAfterDiscount : 0.0;
    return base + serviceCharge + vat;
  }

  Order copyWith({
    String? id,
    String? orderNumber,
    List<CartItem>? items,
    OrderType? type,
    PaymentMethod? paymentMethod,
    DateTime? dateTime,
    double? vatRate,
    double? serviceChargeRate,
    double? discountAmount,
    String? customerName,
    String? tableNumber,
    String? deliveryAddress,
    List<double>? splitPayments,
    bool? isPaid,
    OrderStatus? status,
  }) {
    return Order(
      id: id ?? this.id,
      orderNumber: orderNumber ?? this.orderNumber,
      items: items ?? this.items,
      type: type ?? this.type,
      paymentMethod: paymentMethod ?? this.paymentMethod,
      dateTime: dateTime ?? this.dateTime,
      vatRate: vatRate ?? this.vatRate,
      serviceChargeRate: serviceChargeRate ?? this.serviceChargeRate,
      discountAmount: discountAmount ?? this.discountAmount,
      customerName: customerName ?? this.customerName,
      tableNumber: tableNumber ?? this.tableNumber,
      deliveryAddress: deliveryAddress ?? this.deliveryAddress,
      splitPayments: splitPayments ?? this.splitPayments,
      isPaid: isPaid ?? this.isPaid,
      status: status ?? this.status,
    );
  }

  factory Order.fromJson(Map<String, dynamic> json) {
    return Order(
      id: json['id'] as String,
      orderNumber: json['orderNumber'] as String,
      items: (json['items'] as List)
          .map((i) => CartItem.fromJson(i as Map<String, dynamic>))
          .toList(),
      type: OrderType.values.firstWhere(
        (e) => e.name == json['type'],
        orElse: () => OrderType.dineIn,
      ),
      paymentMethod: json['paymentMethod'] != null
          ? PaymentMethod.values.firstWhere(
              (e) => e.name == json['paymentMethod'],
              orElse: () => PaymentMethod.cash,
            )
          : null,
      dateTime: DateTime.parse(json['dateTime'] as String),
      vatRate: (json['vatRate'] as num? ?? 0.15).toDouble(),
      serviceChargeRate: (json['serviceChargeRate'] as num? ?? 0.10).toDouble(),
      discountAmount: (json['discountAmount'] as num? ?? 0.0).toDouble(),
      customerName: json['customerName'] as String?,
      tableNumber: json['tableNumber'] as String?,
      deliveryAddress: json['deliveryAddress'] as String?,
      splitPayments: json['splitPayments'] != null
          ? (json['splitPayments'] as List).map((e) => (e as num).toDouble()).toList()
          : null,
      isPaid: json['isPaid'] as bool? ?? false,
      status: OrderStatus.values.firstWhere(
        (e) => e.name == json['status'],
        orElse: () => OrderStatus.completed,
      ),
    );
  }

  Map<String, dynamic> toJson() {
    return {
      'id': id,
      'orderNumber': orderNumber,
      'items': items.map((i) => i.toJson()).toList(),
      'type': type.name,
      'paymentMethod': paymentMethod?.name,
      'dateTime': dateTime.toIso8601String(),
      'vatRate': vatRate,
      'serviceChargeRate': serviceChargeRate,
      'discountAmount': discountAmount,
      'customerName': customerName,
      'tableNumber': tableNumber,
      'deliveryAddress': deliveryAddress,
      'splitPayments': splitPayments,
      'isPaid': isPaid,
      'status': status.name,
    };
  }
}
