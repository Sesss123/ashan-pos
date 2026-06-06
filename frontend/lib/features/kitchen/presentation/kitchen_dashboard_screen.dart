import 'package:flutter/material.dart';
import 'package:flutter_riverpod/flutter_riverpod.dart';

class KitchenDashboardScreen extends ConsumerWidget {
  const KitchenDashboardScreen({super.key});

  @override
  Widget build(BuildContext context, WidgetRef ref) {
    return Scaffold(
      appBar: AppBar(
        title: const Text('Kitchen Display System (KDS)'),
        backgroundColor: Colors.black87,
        foregroundColor: Colors.white,
        actions: [
          IconButton(icon: const Icon(Icons.sync), onPressed: () {}),
          const SizedBox(width: 16),
        ],
      ),
      body: Container(
        color: const Color(0xFF1E1E1E), // Dark theme forced for Kitchen
        padding: const EdgeInsets.all(16),
        child: Row(
          crossAxisAlignment: CrossAxisAlignment.start,
          children: [
            _buildLane(context, 'PENDING', Colors.redAccent, _mockPending()),
            const SizedBox(width: 16),
            _buildLane(context, 'PREPARING', Colors.orangeAccent, _mockPreparing()),
            const SizedBox(width: 16),
            _buildLane(context, 'READY', Colors.greenAccent, []),
          ],
        ),
      ),
    );
  }

  Widget _buildLane(BuildContext context, String title, Color color, List<Map<String, dynamic>> tickets) {
    return Expanded(
      child: Column(
        children: [
          Container(
            padding: const EdgeInsets.symmetric(vertical: 12),
            decoration: BoxDecoration(
              color: color.withOpacity(0.2),
              border: Border(top: BorderSide(color: color, width: 4)),
              borderRadius: const BorderRadius.vertical(top: Radius.circular(8)),
            ),
            child: Center(
              child: Text(
                '$title (${tickets.length})', 
                style: TextStyle(color: color, fontWeight: FontWeight.bold, fontSize: 18, letterSpacing: 1.5)
              ),
            ),
          ),
          const SizedBox(height: 8),
          Expanded(
            child: ListView.builder(
              itemCount: tickets.length,
              itemBuilder: (context, index) {
                final ticket = tickets[index];
                return _buildTicketCard(ticket);
              },
            ),
          )
        ],
      ),
    );
  }

  Widget _buildTicketCard(Map<String, dynamic> ticket) {
    return Card(
      color: const Color(0xFF2C2C2C),
      margin: const EdgeInsets.only(bottom: 12),
      child: Padding(
        padding: const EdgeInsets.all(16.0),
        child: Column(
          crossAxisAlignment: CrossAxisAlignment.start,
          children: [
            Row(
              mainAxisAlignment: MainAxisAlignment.spaceBetween,
              children: [
                Text('Table ${ticket['table']}', style: const TextStyle(color: Colors.white, fontSize: 20, fontWeight: FontWeight.bold)),
                Text(ticket['time'], style: const TextStyle(color: Colors.redAccent, fontWeight: FontWeight.bold)),
              ],
            ),
            const Divider(color: Colors.white24, height: 24),
            ...List.generate(ticket['items'].length, (i) {
              return Padding(
                padding: const EdgeInsets.only(bottom: 8.0),
                child: Row(
                  crossAxisAlignment: CrossAxisAlignment.start,
                  children: [
                    Text('${ticket['items'][i]['qty']}x ', style: const TextStyle(color: Colors.orangeAccent, fontWeight: FontWeight.bold, fontSize: 16)),
                    Expanded(
                      child: Text(ticket['items'][i]['name'], style: const TextStyle(color: Colors.white, fontSize: 16)),
                    )
                  ],
                ),
              );
            }),
            const SizedBox(height: 16),
            SizedBox(
              width: double.infinity,
              child: ElevatedButton(
                onPressed: () {},
                style: ElevatedButton.styleFrom(backgroundColor: Colors.white10, foregroundColor: Colors.white),
                child: const Text('MOVE NEXT'),
              ),
            )
          ],
        ),
      ),
    );
  }

  List<Map<String, dynamic>> _mockPending() {
    return [
      {'table': '12', 'time': '05:20', 'items': [{'qty': 2, 'name': 'Spicy Chicken Burger'}, {'qty': 1, 'name': 'French Fries'}]},
      {'table': '04', 'time': '01:15', 'items': [{'qty': 1, 'name': 'Margherita Pizza'}]},
    ];
  }
  
  List<Map<String, dynamic>> _mockPreparing() {
    return [
      {'table': '08', 'time': '12:40', 'items': [{'qty': 3, 'name': 'Beef Steak (Medium Rare)'}]},
    ];
  }
}
