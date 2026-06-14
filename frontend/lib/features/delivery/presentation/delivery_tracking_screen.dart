import 'package:flutter/material.dart';
import 'package:flutter_riverpod/flutter_riverpod.dart';
import 'providers/delivery_provider.dart';

class DeliveryTrackingScreen extends ConsumerWidget {
  const DeliveryTrackingScreen({super.key});

  @override
  Widget build(BuildContext context, WidgetRef ref) {
    final deliveryStateAsync = ref.watch(deliveryProvider);

    return Scaffold(
      appBar: AppBar(
        title: const Text('Delivery Management (Kanban)'),
        actions: [
          IconButton(
            icon: const Icon(Icons.refresh),
            onPressed: () => ref.invalidate(deliveryProvider),
          ),
          const SizedBox(width: 16),
        ],
      ),
      body: deliveryStateAsync.when(
        loading: () => const Center(child: CircularProgressIndicator()),
        error: (err, stack) => Center(child: Text('Error loading deliveries: $err')),
        data: (state) => Padding(
          padding: const EdgeInsets.all(16.0),
          child: Row(
            crossAxisAlignment: CrossAxisAlignment.start,
            children: [
              _buildColumn('Pending Assignment', Colors.orange, state.pending, ref, context, []),
              const SizedBox(width: 16),
              _buildColumn('Dispatched (In Transit)', Colors.blue, state.outForDelivery, ref, context, []),
              const SizedBox(width: 16),
              _buildColumn('Delivered', Colors.green, state.delivered, ref, context, []),
            ],
          ),
        ),
      ),
    );
  }

  Widget _buildColumn(String title, Color color, List<dynamic> items, WidgetRef ref, BuildContext context, List<dynamic> drivers) {
    return Expanded(
      child: Container(
        decoration: BoxDecoration(
          color: Colors.grey.shade100,
          borderRadius: BorderRadius.circular(12),
          border: Border.all(color: Colors.grey.shade300),
        ),
        child: Column(
          children: [
            Container(
              padding: const EdgeInsets.all(12),
              decoration: BoxDecoration(
                color: color.withValues(alpha: 0.1),
                borderRadius: const BorderRadius.vertical(top: Radius.circular(12)),
              ),
              child: Row(
                mainAxisAlignment: MainAxisAlignment.spaceBetween,
                children: [
                  Text(title, style: TextStyle(fontWeight: FontWeight.bold, color: color)),
                  CircleAvatar(radius: 12, backgroundColor: color, child: Text('${items.length}', style: const TextStyle(fontSize: 12, color: Colors.white))),
                ],
              ),
            ),
            Expanded(
              child: ListView.builder(
                padding: const EdgeInsets.all(8),
                itemCount: items.length,
                itemBuilder: (context, index) {
                  final item = items[index];
                  return Card(
                    elevation: 2,
                    margin: const EdgeInsets.only(bottom: 8),
                    child: Padding(
                      padding: const EdgeInsets.all(12.0),
                      child: Column(
                        crossAxisAlignment: CrossAxisAlignment.start,
                        children: [
                          Text('Order #${item['orderId'] ?? 'Unknown'}', style: const TextStyle(fontWeight: FontWeight.bold)),
                          const SizedBox(height: 4),
                          Text(item['address'] ?? 'No Address', style: const TextStyle(fontSize: 12, color: Colors.grey)),
                          const Divider(),
                          if (title == 'Pending Assignment')
                            ElevatedButton(
                              onPressed: () {
                                _showAssignDriverDialog(context, ref, item['id'], drivers);
                              },
                              style: ElevatedButton.styleFrom(minimumSize: const Size.fromHeight(36)),
                              child: const Text('Assign Rider'),
                            )
                          else
                            Row(
                              children: [
                                const Icon(Icons.two_wheeler, size: 16, color: Colors.blue),
                                const SizedBox(width: 4),
                                Text('Rider: ${item['rider']?['name'] ?? 'Unknown'}', style: const TextStyle(fontSize: 12, fontWeight: FontWeight.bold)),
                              ],
                            )
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
    );
  }

  void _showAssignDriverDialog(BuildContext context, WidgetRef ref, String deliveryId, List<dynamic> drivers) {
    showDialog(
      context: context,
      builder: (context) {
        return AlertDialog(
          title: const Text('Assign Driver'),
          content: SizedBox(
            width: double.maxFinite,
            child: ListView.builder(
              shrinkWrap: true,
              itemCount: drivers.length,
              itemBuilder: (context, index) {
                final driver = drivers[index];
                return ListTile(
                  title: Text(driver['name']),
                  subtitle: Text(driver['status'] ?? 'Available'),
                  onTap: () {
                    ref.read(deliveryProvider.notifier).updateStatus(deliveryId, 'Out for Delivery');
                    Navigator.pop(context);
                  },
                );
              },
            ),
          ),
        );
      },
    );
  }
}
