import 'package:flutter/material.dart';
import 'package:flutter_riverpod/flutter_riverpod.dart';

class WaiterDashboardScreen extends ConsumerWidget {
  const WaiterDashboardScreen({super.key});

  @override
  Widget build(BuildContext context, WidgetRef ref) {
    return Scaffold(
      appBar: AppBar(
        title: const Text('Waiter Floor Plan'),
        actions: [
          TextButton.icon(
            icon: const Icon(Icons.list_alt),
            label: const Text('Running Orders'),
            onPressed: () {},
          ),
          const SizedBox(width: 16),
        ],
      ),
      body: Padding(
        padding: const EdgeInsets.all(16.0),
        child: GridView.builder(
          gridDelegate: const SliverGridDelegateWithFixedCrossAxisCount(
            crossAxisCount: 5,
            childAspectRatio: 1,
            crossAxisSpacing: 16,
            mainAxisSpacing: 16,
          ),
          itemCount: 20, // 20 Tables
          itemBuilder: (context, index) {
            final isOccupied = index % 3 == 0;
            return Card(
              color: isOccupied ? Colors.orange.shade100 : Colors.green.shade100,
              child: InkWell(
                onTap: () {
                  // Open Order Builder for this table
                },
                child: Column(
                  mainAxisAlignment: MainAxisAlignment.center,
                  children: [
                    Text('Table ${index + 1}', style: const TextStyle(fontWeight: FontWeight.bold, fontSize: 18, color: Colors.black87)),
                    const SizedBox(height: 8),
                    Text(isOccupied ? 'Occupied (45m)' : 'Available', style: TextStyle(color: isOccupied ? Colors.orange.shade900 : Colors.green.shade900)),
                    if (isOccupied)
                      const Padding(
                        padding: EdgeInsets.only(top: 8.0),
                        child: Text('\$45.50', style: TextStyle(fontWeight: FontWeight.bold, color: Colors.black54)),
                      )
                  ],
                ),
              ),
            );
          },
        ),
      ),
      floatingActionButton: FloatingActionButton.extended(
        onPressed: () {},
        icon: const Icon(Icons.add),
        label: const Text('Takeaway Order'),
      ),
    );
  }
}
