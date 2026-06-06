import 'package:flutter/material.dart';

class MultiBranchDashboardScreen extends StatelessWidget {
  const MultiBranchDashboardScreen({super.key});

  @override
  Widget build(BuildContext context) {
    return Scaffold(
      appBar: AppBar(
        title: const Text('Enterprise Multi-Branch Administration'),
        actions: [
          ElevatedButton.icon(
            onPressed: () {},
            icon: const Icon(Icons.add_business),
            label: const Text('Add Branch'),
          ),
          const SizedBox(width: 16),
        ],
      ),
      body: Row(
        crossAxisAlignment: CrossAxisAlignment.start,
        children: [
          // Sidebar: Branches
          Container(
            width: 300,
            color: Colors.grey.shade50,
            child: ListView.builder(
              padding: const EdgeInsets.all(16),
              itemCount: 4, // Mock
              itemBuilder: (context, index) {
                return Card(
                  margin: const EdgeInsets.only(bottom: 12),
                  shape: RoundedRectangleBorder(
                    borderRadius: BorderRadius.circular(12),
                    side: BorderSide(color: index == 0 ? Colors.blue : Colors.transparent, width: 2),
                  ),
                  child: ListTile(
                    leading: Icon(Icons.store, color: index == 0 ? Colors.blue : Colors.grey),
                    title: Text('Branch 0${index + 1} - ${index == 0 ? "Main" : "City"}', style: const TextStyle(fontWeight: FontWeight.bold)),
                    subtitle: const Text('Active • UTC+5:30\nTax: 15% | USD'),
                    trailing: const Icon(Icons.chevron_right),
                    isThreeLine: true,
                  ),
                );
              },
            ),
          ),
          const VerticalDivider(width: 1),
          // Main Content: Performance & Transfers
          Expanded(
            child: SingleChildScrollView(
              padding: const EdgeInsets.all(24),
              child: Column(
                crossAxisAlignment: CrossAxisAlignment.start,
                children: [
                  const Text('Branch 01 Performance', style: TextStyle(fontSize: 24, fontWeight: FontWeight.bold)),
                  const SizedBox(height: 24),
                  Row(
                    children: [
                      _buildStatCard('Daily Sales', '\$4,520.00', Icons.trending_up, Colors.green),
                      const SizedBox(width: 16),
                      _buildStatCard('Active Tables', '12 / 20', Icons.table_restaurant, Colors.orange),
                      const SizedBox(width: 16),
                      _buildStatCard('Staff Online', '8', Icons.people, Colors.blue),
                    ],
                  ),
                  const SizedBox(height: 32),
                  Row(
                    mainAxisAlignment: MainAxisAlignment.spaceBetween,
                    children: [
                      const Text('Inter-Branch Stock Transfers', style: TextStyle(fontSize: 20, fontWeight: FontWeight.bold)),
                      ElevatedButton.icon(
                        onPressed: () {},
                        icon: const Icon(Icons.swap_horiz),
                        label: const Text('New Transfer'),
                      )
                    ],
                  ),
                  const SizedBox(height: 16),
                  Container(
                    decoration: BoxDecoration(
                      border: Border.all(color: Colors.grey.shade300),
                      borderRadius: BorderRadius.circular(12),
                    ),
                    child: DataTable(
                      headingRowColor: MaterialStateProperty.all(Colors.grey.shade100),
                      columns: const [
                        DataColumn(label: Text('Transfer ID')),
                        DataColumn(label: Text('From')),
                        DataColumn(label: Text('To')),
                        DataColumn(label: Text('Status')),
                        DataColumn(label: Text('Action')),
                      ],
                      rows: [
                        _buildTransferRow('TR-9001', 'Branch 01', 'Branch 02', 'In Transit', Colors.orange),
                        _buildTransferRow('TR-9002', 'Branch 03', 'Branch 01', 'Received', Colors.green),
                      ],
                    ),
                  )
                ],
              ),
            ),
          )
        ],
      ),
    );
  }

  Widget _buildStatCard(String title, String value, IconData icon, Color color) {
    return Expanded(
      child: Container(
        padding: const EdgeInsets.all(20),
        decoration: BoxDecoration(
          color: Colors.white,
          borderRadius: BorderRadius.circular(12),
          boxShadow: const [BoxShadow(color: Colors.black12, blurRadius: 4)],
        ),
        child: Row(
          children: [
            CircleAvatar(backgroundColor: color.withOpacity(0.1), child: Icon(icon, color: color)),
            const SizedBox(width: 16),
            Column(
              crossAxisAlignment: CrossAxisAlignment.start,
              children: [
                Text(title, style: const TextStyle(color: Colors.grey)),
                Text(value, style: const TextStyle(fontSize: 20, fontWeight: FontWeight.bold)),
              ],
            )
          ],
        ),
      ),
    );
  }

  DataRow _buildTransferRow(String id, String from, String to, String status, Color color) {
    return DataRow(
      cells: [
        DataCell(Text(id, style: const TextStyle(fontWeight: FontWeight.bold))),
        DataCell(Text(from)),
        DataCell(Text(to)),
        DataCell(Container(
          padding: const EdgeInsets.symmetric(horizontal: 8, vertical: 4),
          decoration: BoxDecoration(color: color.withOpacity(0.1), borderRadius: BorderRadius.circular(12)),
          child: Text(status, style: TextStyle(color: color, fontWeight: FontWeight.bold)),
        )),
        DataCell(TextButton(onPressed: () {}, child: const Text('View Details'))),
      ],
    );
  }
}
