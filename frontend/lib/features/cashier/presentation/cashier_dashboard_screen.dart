import 'package:flutter/material.dart';
import 'package:flutter_riverpod/flutter_riverpod.dart';
import '../../../../core/realtime/socket_provider.dart';
import '../../../../core/realtime/socket_events.dart';

class CashierDashboardScreen extends ConsumerStatefulWidget {
  const CashierDashboardScreen({super.key});

  @override
  ConsumerState<CashierDashboardScreen> createState() => _CashierDashboardScreenState();
}

class _CashierDashboardScreenState extends ConsumerState<CashierDashboardScreen> {
  @override
  void initState() {
    super.initState();
    // Connect to Enterprise Real-Time Sync on mount
    WidgetsBinding.instance.addPostFrameCallback((_) {
      final socket = ref.read(socketServiceProvider);
      socket.connect('placeholder-jwt-token');
      
      socket.on(SocketEvents.orderCreated, (data) {
        debugPrint('[POS] New Order Synced via WebSockets!');
      });
    });
  }

  @override
  Widget build(BuildContext context) {
    return Scaffold(
      appBar: AppBar(
        title: const Text('Cashier POS (Real-Time Synced)'),
        actions: [
          IconButton(icon: const Icon(Icons.receipt_long), onPressed: () {}), // Receipt History
          IconButton(icon: const Icon(Icons.point_of_sale), onPressed: () {}), // Daily Closing
          const SizedBox(width: 16),
        ],
      ),
      body: Row(
        children: [
          // Left: Menu Grid & Search
          Expanded(
            flex: 6,
            child: Container(
              padding: const EdgeInsets.all(16),
              child: Column(
                children: [
                  TextField(
                    decoration: InputDecoration(
                      hintText: 'Search products by name or barcode...',
                      prefixIcon: const Icon(Icons.search),
                      border: OutlineInputBorder(borderRadius: BorderRadius.circular(8)),
                    ),
                  ),
                  const SizedBox(height: 16),
                  Expanded(
                    child: GridView.builder(
                      gridDelegate: const SliverGridDelegateWithFixedCrossAxisCount(
                        crossAxisCount: 3,
                        childAspectRatio: 1,
                        crossAxisSpacing: 16,
                        mainAxisSpacing: 16,
                      ),
                      itemCount: 12,
                      itemBuilder: (context, index) {
                        return Card(
                          color: Theme.of(context).cardTheme.color,
                          child: InkWell(
                            onTap: () {
                              // Add to cart
                            },
                            child: Column(
                              mainAxisAlignment: MainAxisAlignment.center,
                              children: [
                                const Icon(Icons.fastfood, size: 40, color: Colors.blue),
                                const SizedBox(height: 8),
                                Text('Item ${index+1}', style: const TextStyle(fontWeight: FontWeight.bold)),
                                const Text('\$12.50', style: TextStyle(color: Colors.green)),
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
          
          // Right: Cart & Payment
          Container(
            width: 350,
            color: Theme.of(context).scaffoldBackgroundColor,
            child: Column(
              children: [
                const ListTile(
                  title: Text('Current Order', style: TextStyle(fontWeight: FontWeight.bold, fontSize: 18)),
                  trailing: Text('#1024', style: TextStyle(color: Colors.grey)),
                ),
                const Divider(),
                Expanded(
                  child: ListView.builder(
                    itemCount: 3,
                    itemBuilder: (context, index) => ListTile(
                      title: Text('Item ${index+1}'),
                      subtitle: const Text('Qty: 1'),
                      trailing: const Text('\$12.50'),
                    ),
                  ),
                ),
                const Divider(),
                Padding(
                  padding: const EdgeInsets.all(16.0),
                  child: Column(
                    children: [
                      const Row(
                        mainAxisAlignment: MainAxisAlignment.spaceBetween,
                        children: [Text('Subtotal'), Text('\$37.50')],
                      ),
                      const SizedBox(height: 8),
                      const Row(
                        mainAxisAlignment: MainAxisAlignment.spaceBetween,
                        children: [Text('Tax (10%)'), Text('\$3.75')],
                      ),
                      const SizedBox(height: 16),
                      const Row(
                        mainAxisAlignment: MainAxisAlignment.spaceBetween,
                        children: [
                          Text('Total', style: TextStyle(fontWeight: FontWeight.bold, fontSize: 20)), 
                          Text('\$41.25', style: TextStyle(fontWeight: FontWeight.bold, fontSize: 20, color: Colors.green))
                        ],
                      ),
                      const SizedBox(height: 24),
                      Row(
                        children: [
                          Expanded(
                            child: OutlinedButton(
                              onPressed: () {}, // Hold Bill
                              style: OutlinedButton.styleFrom(padding: const EdgeInsets.symmetric(vertical: 16)),
                              child: const Text('HOLD'),
                            ),
                          ),
                          const SizedBox(width: 16),
                          Expanded(
                            flex: 2,
                            child: ElevatedButton(
                              onPressed: () {}, // Pay
                              style: ElevatedButton.styleFrom(padding: const EdgeInsets.symmetric(vertical: 16), backgroundColor: Colors.green),
                              child: const Text('PAY NOW'),
                            ),
                          ),
                        ],
                      )
                    ],
                  ),
                )
              ],
            ),
          )
        ],
      ),
    );
  }
}
