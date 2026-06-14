import '../../../core/utils/app_currency.dart';
import 'package:flutter/material.dart';
import 'package:flutter_riverpod/flutter_riverpod.dart';
import 'providers/pos_provider.dart';
import 'providers/cart_provider.dart';


class PosDashboardScreen extends ConsumerStatefulWidget {
  const PosDashboardScreen({super.key});

  @override
  ConsumerState<PosDashboardScreen> createState() => _PosDashboardScreenState();
}

class _PosDashboardScreenState extends ConsumerState<PosDashboardScreen> {
  String _orderType = 'Dining';

  @override
  void initState() {
    super.initState();
    WidgetsBinding.instance.addPostFrameCallback((_) {
      ref.read(posProvider.notifier).fetchProducts();
    });
  }

  @override
  Widget build(BuildContext context) {
    final posState = ref.watch(posProvider);

    return Scaffold(
      appBar: AppBar(
        title: const Text('Enterprise POS Dashboard'),
        actions: [
          IconButton(
            icon: const Icon(Icons.refresh),
            onPressed: () => ref.read(posProvider.notifier).fetchProducts(),
          ),
          const SizedBox(width: 16),
        ],
      ),
      body: Row(
        crossAxisAlignment: CrossAxisAlignment.start,
        children: [
          // Left Area: Grid of Products
          Expanded(
            flex: 7,
            child: Padding(
              padding: const EdgeInsets.all(16.0),
              child: Column(
                crossAxisAlignment: CrossAxisAlignment.start,
                children: [
                  const Text('Menu Items', style: TextStyle(fontSize: 20, fontWeight: FontWeight.bold)),
                  const SizedBox(height: 16),
                  Expanded(
                    child: posState.isLoading && posState.products.isEmpty
                        ? const Center(child: CircularProgressIndicator())
                        : posState.products.isEmpty
                            ? const Center(child: Text('No menu items available.'))
                            : GridView.builder(
                                gridDelegate: const SliverGridDelegateWithFixedCrossAxisCount(
                                  crossAxisCount: 4,
                                  childAspectRatio: 0.85,
                                  crossAxisSpacing: 16,
                                  mainAxisSpacing: 16,
                                ),
                                itemCount: posState.products.length,
                                itemBuilder: (context, index) {
                                  final product = posState.products[index];
                                  final price = (product['basePrice'] ?? product['price'] ?? 0.0) as double;
                                  return Card(
                                    child: InkWell(
                                      onTap: () {
                                        ref.read(cartProvider.notifier).addItem(
                                          CartItem(
                                            productId: product['id'],
                                            name: product['name'] ?? 'Unknown Item',
                                            unitPrice: price,
                                          ),
                                        );
                                      },
                                      borderRadius: BorderRadius.circular(12),
                                      child: Column(
                                        mainAxisAlignment: MainAxisAlignment.center,
                                        children: [
                                          const Icon(Icons.fastfood, size: 48, color: Colors.blue),
                                          const SizedBox(height: 16),
                                          Text(product['name'] ?? 'Item', 
                                            style: const TextStyle(fontWeight: FontWeight.bold),
                                            textAlign: TextAlign.center,
                                            maxLines: 2,
                                            overflow: TextOverflow.ellipsis,
                                          ),
                                          const SizedBox(height: 4),
                                          Text(AppCurrency.format(price), 
                                            style: const TextStyle(color: Colors.green, fontWeight: FontWeight.bold)),
                                        ],
                                      ),
                                    ),
                                  );
                                },
                              ),
                  ),
                ],
              ),
            ),
          ),
          
          // Right Area: Cart & Recent Orders using Riverpod State
          Container(
            width: 350,
            decoration: BoxDecoration(
              color: Theme.of(context).cardColor,
              border: Border(left: BorderSide(color: Colors.grey.shade300)),
            ),
            child: Column(
              children: [
                Container(
                  padding: const EdgeInsets.all(16),
                  color: Theme.of(context).primaryColor.withValues(alpha: 0.1),
                  child: Row(
                    mainAxisAlignment: MainAxisAlignment.spaceBetween,
                    children: [
                      const Text('Current Order', style: TextStyle(fontSize: 18, fontWeight: FontWeight.bold)),
                      IconButton(
                        icon: const Icon(Icons.delete_outline, color: Colors.red),
                        onPressed: () => ref.read(cartProvider.notifier).clearCart(),
                      )
                    ],
                  ),
                ),
                Padding(
                  padding: const EdgeInsets.all(8.0),
                  child: SegmentedButton<String>(
                    segments: const [
                      ButtonSegment(value: 'Dining', label: Text('Dine-In'), icon: Icon(Icons.restaurant)),
                      ButtonSegment(value: 'Takeaway', label: Text('Takeaway'), icon: Icon(Icons.shopping_bag)),
                    ],
                    selected: {_orderType},
                    onSelectionChanged: (Set<String> newSelection) {
                      setState(() {
                        _orderType = newSelection.first;
                      });
                    },
                  ),
                ),
                Expanded(
                  child: _buildCartList(ref),
                ),
                _buildTotalsArea(ref),
                Padding(
                  padding: const EdgeInsets.all(16.0),
                  child: ElevatedButton(
                    onPressed: posState.isLoading ? null : () => _showPaymentDialog(ref),
                    style: ElevatedButton.styleFrom(
                      minimumSize: const Size.fromHeight(50),
                      backgroundColor: Colors.blue,
                      foregroundColor: Colors.white,
                    ),
                    child: posState.isLoading 
                        ? const SizedBox(width: 20, height: 20, child: CircularProgressIndicator(color: Colors.white, strokeWidth: 2))
                        : const Text('Checkout', style: TextStyle(fontSize: 18, fontWeight: FontWeight.bold)),
                  ),
                )
              ],
            ),
          ),
        ],
      ),
    );
  }

  Widget _buildCartList(WidgetRef ref) {
    final cartItems = ref.watch(cartProvider);
    if (cartItems.isEmpty) {
      return Center(child: Text('Cart is empty', style: TextStyle(color: Colors.grey.shade600)));
    }
    return ListView.builder(
      itemCount: cartItems.length,
      itemBuilder: (context, index) {
        final item = cartItems[index];
        return ListTile(
          title: Text(item.name),
          subtitle: Text('${item.quantity} x ${AppCurrency.format(item.unitPrice)}'),
          trailing: Text(AppCurrency.format(item.subtotal), style: const TextStyle(fontWeight: FontWeight.bold)),
        );
      },
    );
  }

  Widget _buildTotalsArea(WidgetRef ref) {
    ref.watch(cartProvider); // Rebuild when cart changes
    final cartNotifier = ref.read(cartProvider.notifier);
    
    return Container(
      padding: const EdgeInsets.all(16),
      color: Colors.grey.shade50,
      child: Column(
        children: [
          Row(
            mainAxisAlignment: MainAxisAlignment.spaceBetween,
            children: [const Text('Subtotal:'), Text(AppCurrency.format(cartNotifier.subtotal))],
          ),
          const SizedBox(height: 4),
          Row(
            mainAxisAlignment: MainAxisAlignment.spaceBetween,
            children: [const Text('Discount:'), Text('-${AppCurrency.format(cartNotifier.discount)}', style: const TextStyle(color: Colors.red))],
          ),
          const SizedBox(height: 4),
          Row(
            mainAxisAlignment: MainAxisAlignment.spaceBetween,
            children: [const Text('Tax:'), Text(AppCurrency.format(cartNotifier.taxAmount))],
          ),
          const Padding(padding: EdgeInsets.symmetric(vertical: 8), child: Divider(height: 1)),
          Row(
            mainAxisAlignment: MainAxisAlignment.spaceBetween,
            children: [
              const Text('Total:', style: TextStyle(fontSize: 18, fontWeight: FontWeight.bold)), 
              Text(AppCurrency.format(cartNotifier.total), style: const TextStyle(fontSize: 18, fontWeight: FontWeight.bold, color: Colors.green))
            ],
          ),
        ],
      ),
    );
  }

  void _showPaymentDialog(WidgetRef ref) {
    final cartItems = ref.read(cartProvider);
    if (cartItems.isEmpty) return;
    
    showDialog(
      context: context,
      builder: (context) => AlertDialog(
        title: const Text('Complete Payment'),
        content: const Text('Select payment method for this order:'),
        actions: [
          TextButton(
            onPressed: () {
               Navigator.pop(context);
               _submitOrder(ref, 'Cash');
            },
            child: const Text('Cash'),
          ),
          TextButton(
            onPressed: () {
               Navigator.pop(context);
               _submitOrder(ref, 'Card');
            },
            child: const Text('Card'),
          ),
        ]
      )
    );
  }

  void _submitOrder(WidgetRef ref, String method) {
      final cartItems = ref.read(cartProvider);
      final cartNotifier = ref.read(cartProvider.notifier);
      ref.read(posProvider.notifier).submitOrder({
        'branchId': 'branch-01-id',
        'userId': 'user-01-id',
        'type': _orderType,
        'items': cartItems.map((item) => {
          'productId': item.productId,
          'quantity': item.quantity,
          'price': item.unitPrice, 
        }).toList(),
        'subtotal': cartNotifier.subtotal,
        'tax': cartNotifier.taxAmount,
        'serviceCharge': 0,
        'discount': cartNotifier.discount,
        'total': cartNotifier.total,
        'paymentMethod': method,
        'payments': [{'method': method, 'amount': cartNotifier.total}]
      });
      ref.read(cartProvider.notifier).clearCart();
  }
}
