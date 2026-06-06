import 'package:flutter/material.dart';

class DeliveryTrackingScreen extends StatelessWidget {
  const DeliveryTrackingScreen({super.key});

  @override
  Widget build(BuildContext context) {
    return Scaffold(
      appBar: AppBar(
        title: const Text('Delivery Management (Kanban)'),
      ),
      body: Padding(
        padding: const EdgeInsets.all(16.0),
        child: Row(
          crossAxisAlignment: CrossAxisAlignment.start,
          children: [
            _buildColumn('Pending Assignment', Colors.orange, 3),
            const SizedBox(width: 16),
            _buildColumn('Dispatched (In Transit)', Colors.blue, 2),
            const SizedBox(width: 16),
            _buildColumn('Delivered', Colors.green, 5),
          ],
        ),
      ),
    );
  }

  Widget _buildColumn(String title, Color color, int itemCount) {
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
                color: color.withOpacity(0.1),
                borderRadius: const BorderRadius.vertical(top: Radius.circular(12)),
              ),
              child: Row(
                mainAxisAlignment: MainAxisAlignment.spaceBetween,
                children: [
                  Text(title, style: TextStyle(fontWeight: FontWeight.bold, color: color)),
                  CircleAvatar(radius: 12, backgroundColor: color, child: Text('$itemCount', style: const TextStyle(fontSize: 12, color: Colors.white))),
                ],
              ),
            ),
            Expanded(
              child: ListView.builder(
                padding: const EdgeInsets.all(8),
                itemCount: itemCount,
                itemBuilder: (context, index) {
                  return Card(
                    elevation: 2,
                    margin: const EdgeInsets.only(bottom: 8),
                    child: Padding(
                      padding: const EdgeInsets.all(12.0),
                      child: Column(
                        crossAxisAlignment: CrossAxisAlignment.start,
                        children: [
                          const Text('Order #10045', style: TextStyle(fontWeight: FontWeight.bold)),
                          const SizedBox(height: 4),
                          const Text('123 Main St, Springfield', style: TextStyle(fontSize: 12, color: Colors.grey)),
                          const Divider(),
                          if (title == 'Pending Assignment')
                            ElevatedButton(
                              onPressed: () {},
                              style: ElevatedButton.styleFrom(minimumSize: const Size.fromHeight(36)),
                              child: const Text('Assign Rider'),
                            )
                          else
                            const Row(
                              children: [
                                Icon(Icons.two_wheeler, size: 16, color: Colors.blue),
                                SizedBox(width: 4),
                                Text('Rider: Mike D.', style: TextStyle(fontSize: 12, fontWeight: FontWeight.bold)),
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
}
