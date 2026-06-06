import 'package:flutter/material.dart';

class CustomerDashboardScreen extends StatelessWidget {
  const CustomerDashboardScreen({super.key});

  @override
  Widget build(BuildContext context) {
    return Scaffold(
      appBar: AppBar(
        title: const Text('Customer Directory'),
        actions: [
          ElevatedButton.icon(
            onPressed: () {},
            icon: const Icon(Icons.person_add),
            label: const Text('New Customer'),
          ),
          const SizedBox(width: 16),
        ],
      ),
      body: Row(
        children: [
          // Sidebar metrics
          Container(
            width: 250,
            color: Colors.blue.shade50,
            padding: const EdgeInsets.all(16),
            child: Column(
              crossAxisAlignment: CrossAxisAlignment.start,
              children: [
                const Text('Loyalty Program', style: TextStyle(fontWeight: FontWeight.bold, fontSize: 18)),
                const SizedBox(height: 16),
                _buildMiniCard('VIP Members', '45', Colors.purple),
                _buildMiniCard('Total Points Issued', '120.5K', Colors.orange),
                _buildMiniCard('Wallet Balance (Total)', '\$5,230', Colors.green),
              ],
            ),
          ),
          // Customer List
          Expanded(
            child: ListView.builder(
              padding: const EdgeInsets.all(16),
              itemCount: 8,
              itemBuilder: (context, index) {
                return Card(
                  margin: const EdgeInsets.only(bottom: 12),
                  child: ListTile(
                    contentPadding: const EdgeInsets.all(16),
                    leading: CircleAvatar(
                      backgroundColor: index % 2 == 0 ? Colors.purple.shade100 : Colors.blue.shade100,
                      child: Text('C$index', style: TextStyle(color: index % 2 == 0 ? Colors.purple : Colors.blue)),
                    ),
                    title: Text('Customer Name $index', style: const TextStyle(fontWeight: FontWeight.bold)),
                    subtitle: const Text('Phone: +1 987 654 321\nWallet: \$45.00 | Points: 350'),
                    trailing: Row(
                      mainAxisSize: MainAxisSize.min,
                      children: [
                        if (index % 2 == 0)
                          Container(
                            padding: const EdgeInsets.symmetric(horizontal: 8, vertical: 4),
                            decoration: BoxDecoration(color: Colors.amber, borderRadius: BorderRadius.circular(12)),
                            child: const Text('VIP', style: TextStyle(fontWeight: FontWeight.bold, fontSize: 12)),
                          ),
                        const SizedBox(width: 16),
                        ElevatedButton(onPressed: () {}, child: const Text('View Profile')),
                      ],
                    ),
                  ),
                );
              },
            ),
          ),
        ],
      ),
    );
  }

  Widget _buildMiniCard(String title, String value, Color color) {
    return Container(
      margin: const EdgeInsets.only(bottom: 12),
      padding: const EdgeInsets.all(16),
      decoration: BoxDecoration(
        color: Colors.white,
        borderRadius: BorderRadius.circular(8),
        border: Border.all(color: color.withOpacity(0.3)),
      ),
      child: Column(
        crossAxisAlignment: CrossAxisAlignment.start,
        children: [
          Text(title, style: TextStyle(color: color)),
          const SizedBox(height: 4),
          Text(value, style: const TextStyle(fontSize: 20, fontWeight: FontWeight.bold)),
        ],
      ),
    );
  }
}
