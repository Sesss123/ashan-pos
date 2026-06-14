import 'package:flutter/material.dart';
import 'package:flutter_riverpod/flutter_riverpod.dart';
import 'providers/table_provider.dart';
import 'providers/running_orders_provider.dart';

class TableLayoutScreen extends ConsumerStatefulWidget {
  const TableLayoutScreen({super.key});

  @override
  ConsumerState<TableLayoutScreen> createState() => _TableLayoutScreenState();
}

class _TableLayoutScreenState extends ConsumerState<TableLayoutScreen> {
  // Normally initialize Socket.IO client here and listen to 'tableUpdated' event

  @override
  Widget build(BuildContext context) {
    final tables = ref.watch(tableProvider);

    return Scaffold(
      appBar: AppBar(
        title: const Text('Waiter Dashboard - Tables'),
        actions: [
          IconButton(
            icon: const Icon(Icons.refresh), 
            onPressed: () {
              ref.invalidate(tableProvider);
              ref.invalidate(runningOrdersProvider);
            },
          ),
        ],
      ),
      body: Padding(
        padding: const EdgeInsets.all(16.0),
        child: tables.when(
          loading: () => const Center(child: CircularProgressIndicator()),
          error: (err, stack) => Center(
            child: Column(
              mainAxisAlignment: MainAxisAlignment.center,
              children: [
                Text('Error loading tables', style: const TextStyle(color: Colors.red)),
                ElevatedButton(
                  onPressed: () => ref.invalidate(tableProvider),
                  child: const Text('Retry'),
                )
              ],
            ),
          ),
          data: (tableList) => GridView.builder(
            gridDelegate: const SliverGridDelegateWithFixedCrossAxisCount(
              crossAxisCount: 3,
              crossAxisSpacing: 16,
              mainAxisSpacing: 16,
              childAspectRatio: 1.2,
            ),
            itemCount: tableList.length,
            itemBuilder: (context, index) {
              final table = tableList[index];
              final runningOrdersState = ref.watch(runningOrdersProvider);
              final runningOrders = runningOrdersState.value ?? [];
              
              bool hasReadyFood = runningOrders.any((o) => 
                 o['status'] == 'Ready' && 
                 o['order'] != null && 
                 o['order']['tableId'] == table.id
              );

              Color statusColor;
              if (hasReadyFood) {
                statusColor = Colors.amber.shade500;
              } else {
                switch (table.status) {
                  case 'Occupied':
                    statusColor = Colors.red.shade400;
                    break;
                  case 'Reserved':
                    statusColor = Colors.orange.shade400;
                    break;
                  default:
                    statusColor = Colors.green.shade400;
                }
              }

              return Card(
                color: statusColor,
                child: InkWell(
                  onTap: () {
                    // Navigate to Table Details or Create Order
                    showModalBottomSheet(
                      context: context,
                      builder: (_) => Container(
                        padding: const EdgeInsets.all(20),
                        height: 250,
                        child: Column(
                          crossAxisAlignment: CrossAxisAlignment.start,
                          children: [
                            Text('Table ${table.number}', style: const TextStyle(fontSize: 24, fontWeight: FontWeight.bold)),
                            Text('Capacity: ${table.capacity}', style: const TextStyle(fontSize: 18)),
                            const SizedBox(height: 20),
                            ElevatedButton(
                              onPressed: () {},
                              child: const Text('Place Order'),
                            ),
                            if (table.status == 'Occupied')
                              ElevatedButton(
                                onPressed: () {},
                                child: const Text('Transfer Table'),
                              ),
                          ],
                        ),
                      ),
                    );
                  },
                  child: Stack(
                    children: [
                      Center(
                        child: Column(
                          mainAxisAlignment: MainAxisAlignment.center,
                          children: [
                            const Icon(Icons.table_restaurant, size: 40, color: Colors.white),
                            const SizedBox(height: 8),
                            Text('Table ${table.number}', style: const TextStyle(color: Colors.white, fontWeight: FontWeight.bold)),
                            Text(hasReadyFood ? 'FOOD READY' : table.status, style: const TextStyle(color: Colors.white70, fontWeight: FontWeight.bold)),
                          ],
                        ),
                      ),
                      if (hasReadyFood)
                        Positioned(
                          top: 8,
                          right: 8,
                          child: Icon(Icons.notifications_active, color: Colors.white, size: 24),
                        ),
                    ],
                  ),
                ),
              );
            },
          ),
        ),
      ),
    );
  }
}
