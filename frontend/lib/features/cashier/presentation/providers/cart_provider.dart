import 'package:flutter_riverpod/flutter_riverpod.dart';
import 'package:uuid/uuid.dart';
import '../../domain/models/cart_item.dart';
import '../../domain/models/order.dart';
import '../../domain/models/product.dart';
import 'package:flutter/foundation.dart';
import '../../../../core/network/dio_client.dart';
import '../../../../core/network/offline_sync_service.dart';
import '../../../../core/realtime/socket_service.dart';
import '../../data/repositories/cashier_repository.dart';

class CartState {
  final List<CartItem> items;
  final OrderType orderType;
  final double vatRate;
  final double serviceChargeRate;
  final double discountAmount;
  final String? customerName;
  final String? customerId;           // For Credit billing
  final double? customerCreditBalance; // For Credit billing display
  final String? tableNumber;
  final String? tableId;
  final String? deliveryAddress;
  final String orderNumber;

  CartState({
    required this.items,
    required this.orderType,
    this.vatRate = 0.15,
    this.serviceChargeRate = 0.10,
    this.discountAmount = 0.0,
    this.customerName,
    this.customerId,
    this.customerCreditBalance,
    this.tableNumber,
    this.tableId,
    this.deliveryAddress,
    required this.orderNumber,
  });

  CartState copyWith({
    List<CartItem>? items,
    OrderType? orderType,
    double? vatRate,
    double? serviceChargeRate,
    double? discountAmount,
    String? customerName,
    String? customerId,
    double? customerCreditBalance,
    bool clearCustomer = false,
    String? tableNumber,
    String? tableId,
    String? deliveryAddress,
    String? orderNumber,
  }) {
    return CartState(
      items: items ?? this.items,
      orderType: orderType ?? this.orderType,
      vatRate: vatRate ?? this.vatRate,
      serviceChargeRate: serviceChargeRate ?? this.serviceChargeRate,
      discountAmount: discountAmount ?? this.discountAmount,
      customerName: clearCustomer ? null : (customerName ?? this.customerName),
      customerId: clearCustomer ? null : (customerId ?? this.customerId),
      customerCreditBalance: clearCustomer ? null : (customerCreditBalance ?? this.customerCreditBalance),
      tableNumber: tableNumber ?? this.tableNumber,
      tableId: tableId ?? this.tableId,
      deliveryAddress: deliveryAddress ?? this.deliveryAddress,
      orderNumber: orderNumber ?? this.orderNumber,
    );
  }

  // Calculations mapped from BillingEngine
  Map<String, double> get _calculations {
    final sub = items.fold(0.0, (sum, item) => sum + item.totalPrice);
    final disc = discountAmount;
    final sc = (orderType == OrderType.dineIn) ? (sub - disc) * serviceChargeRate : 0.0;
    final v = (sub - disc + sc) * vatRate;
    return {
      'subtotal': sub,
      'serviceCharge': sc,
      'vat': v,
      'grandTotal': sub - disc + sc + v,
    };
  }

  double get subtotal => _calculations['subtotal']!;
  double get serviceCharge => _calculations['serviceCharge']!;
  double get vat => _calculations['vat']!;
  double get grandTotal => _calculations['grandTotal']!;
}

class CartNotifier extends Notifier<CartState> {
  @override
  CartState build() {
    _fetchSettings();
    return CartState(
      items: [],
      orderType: OrderType.dineIn,
      orderNumber: _generateOrderNumber(),
    );
  }

  Future<void> _fetchSettings() async {
    try {
      final dio = ref.read(dioClientProvider).dio;
      final res = await dio.get('/settings');
      if (res.data['success']) {
        final settings = res.data['data'];
        final taxRate = double.tryParse(settings['TAX_RATE'] ?? '0') ?? 0.0;
        final serviceChargeRate = double.tryParse(settings['SERVICE_CHARGE_RATE'] ?? '0') ?? 0.0;
        
        state = state.copyWith(
          vatRate: taxRate / 100, // Assuming admin panel saves 15 for 15%
          serviceChargeRate: serviceChargeRate / 100,
        );
      }
    } catch (e) {
      debugPrint('Failed to fetch settings: $e');
    }
  }

  static String _generateOrderNumber() {
    // Elegant receipt number generation based on current time
    final now = DateTime.now();
    return '${now.year.toString().substring(2)}${now.month.toString().padLeft(2, '0')}${now.day.toString().padLeft(2, '0')}-${now.hour.toString().padLeft(2, '0')}${now.minute.toString().padLeft(2, '0')}${now.second.toString().padLeft(2, '0')}';
  }

  void addToCart(Product product, {int qty = 1, String notes = ''}) {
    final existingIndex = state.items.indexWhere((item) => item.product.id == product.id && item.notes == notes);
    
    if (existingIndex >= 0) {
      final existingItem = state.items[existingIndex];
      final updatedItems = List<CartItem>.from(state.items);
      updatedItems[existingIndex] = existingItem.copyWith(
        quantity: existingItem.quantity + qty,
      );
      state = state.copyWith(items: updatedItems);
    } else {
      state = state.copyWith(
        items: [...state.items, CartItem(product: product, quantity: qty, notes: notes)],
      );
    }
  }

  void updateQuantity(Product product, int newQty, String notes) {
    if (newQty <= 0) {
      removeFromCart(product, notes);
      return;
    }
    
    final updatedItems = state.items.map((item) {
      if (item.product.id == product.id && item.notes == notes) {
        return item.copyWith(quantity: newQty);
      }
      return item;
    }).toList();
    
    state = state.copyWith(items: updatedItems);
  }

  void updateNotes(Product product, String oldNotes, String newNotes) {
    final updatedItems = state.items.map((item) {
      if (item.product.id == product.id && item.notes == oldNotes) {
        return item.copyWith(notes: newNotes);
      }
      return item;
    }).toList();
    
    state = state.copyWith(items: updatedItems);
  }

  void removeFromCart(Product product, String notes) {
    final updatedItems = state.items.where((item) => !(item.product.id == product.id && item.notes == notes)).toList();
    state = state.copyWith(items: updatedItems);
  }

  void setOrderType(OrderType type) {
    state = state.copyWith(
      orderType: type,
      // Clear fields not applicable to new type
      tableNumber: type == OrderType.dineIn ? state.tableNumber : null,
      tableId: type == OrderType.dineIn ? state.tableId : null,
      deliveryAddress: type == OrderType.delivery ? state.deliveryAddress : null,
    );
  }

  void setDiscount(double discount) {
    state = state.copyWith(discountAmount: discount);
  }

  void setVatRate(double vat) {
    state = state.copyWith(vatRate: vat);
  }

  void setServiceChargeRate(double sc) {
    state = state.copyWith(serviceChargeRate: sc);
  }

  void setOrderDetails({String? customerName, String? tableNumber, String? tableId, String? deliveryAddress}) {
    bool isTableChanged = tableNumber != null && tableNumber != state.tableNumber;
    
    state = state.copyWith(
      customerName: customerName ?? state.customerName,
      tableNumber: tableNumber ?? state.tableNumber,
      tableId: tableId ?? state.tableId,
      deliveryAddress: deliveryAddress ?? state.deliveryAddress,
      items: isTableChanged ? [] : state.items,
    );
  }

  void clearCart() {
    state = CartState(
      items: [],
      orderType: OrderType.dineIn,
      orderNumber: _generateOrderNumber(),
    );
  }

  /// Set selected customer for credit billing.
  void selectCustomer({required String id, required String name, required double creditBalance}) {
    state = state.copyWith(
      customerId: id,
      customerName: name,
      customerCreditBalance: creditBalance,
    );
  }

  /// Remove selected customer (e.g. when switching payment method away from Credit).
  void clearSelectedCustomer() {
    state = state.copyWith(clearCustomer: true);
  }

  static final List<CartState> _heldOrders = [];

  void holdCurrentOrder() {
    if (state.items.isEmpty) return;
    _heldOrders.add(state);
    clearCart();
  }

  List<CartState> getHeldOrders() => List.unmodifiable(_heldOrders);

  void resumeOrder(CartState heldState) {
    if (state.items.isNotEmpty) {
      // If there's an active cart, we hold it first before resuming
      _heldOrders.add(state);
    }
    _heldOrders.remove(heldState);
    state = heldState;
  }

  Future<Order> processCheckout(PaymentMethod method, {List<double>? splitPayments, List<PaymentMethod>? splitMethods}) async {
    final finalOrder = Order(
      id: Uuid().v4(),
      orderNumber: state.orderNumber,
      items: state.items,
      type: state.orderType,
      paymentMethod: method,
      dateTime: DateTime.now(),
      vatRate: state.vatRate,
      serviceChargeRate: state.serviceChargeRate,
      discountAmount: state.discountAmount,
      customerName: state.customerName,
      tableNumber: state.tableNumber,
      deliveryAddress: state.deliveryAddress,
      splitPayments: splitPayments,
      isPaid: true,
    );

    try {
      final repo = ref.read(cashierRepositoryProvider);
      
      // Build order data payload
      final orderData = {
        'id': finalOrder.id,
        'orderNumber': finalOrder.orderNumber,
        'type': finalOrder.type.name,
        'paymentMethod': finalOrder.paymentMethod?.name,
        'tableNumber': finalOrder.tableNumber,
        'subtotal': state.subtotal,
        'discount': state.discountAmount,
        'tax': state.vat,
        'serviceCharge': state.serviceCharge,
        'total': state.grandTotal,
        'items': state.items.map((i) => {
          'productId': i.product.id,
          'quantity': i.quantity,
          'notes': i.notes,
          'price': i.product.price
        }).toList(),
        if (splitPayments != null && splitMethods != null)
          'payments': List.generate(splitPayments.length, (i) => {
            'amount': splitPayments[i],
            'method': splitMethods[i].name
          }),
        // Pass real customerId for credit billing
        if (state.customerId != null) 'customerId': state.customerId,
        if (state.deliveryAddress != null) 'deliveryAddress': state.deliveryAddress
      };

      try {
        if (state.tableId != null) {
          // Group Checkout
          await repo.checkoutTable(state.tableId!, orderData);
        } else {
          // 1. Save to DB via API
          await repo.createOrder(orderData);
        }
        
        // 2. Emit Socket Event for Real-Time Sync
        socketService.emit('order.completed', orderData);
      } catch (e) {
        debugPrint('[POS Checkout] Network error, queuing for offline sync: $e');
        await OfflineSyncService.instance.queueFailedOrder(orderData);
      }

      // Clear cart and generate a new order number for next customer
      clearCart();
      
      return finalOrder;
    } catch (e) {
      throw Exception('Checkout process failed: $e');
    }
  }
}

final cartProvider = NotifierProvider<CartNotifier, CartState>(CartNotifier.new);
