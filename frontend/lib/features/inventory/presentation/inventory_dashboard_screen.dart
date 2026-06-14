import 'package:flutter/material.dart';
import 'package:flutter_riverpod/flutter_riverpod.dart';

class InventoryDashboardScreen extends ConsumerWidget {
  const InventoryDashboardScreen({super.key});

  @override
  Widget build(BuildContext context, WidgetRef ref) {
    return Scaffold(
      appBar: AppBar(
        title: const Text('Inventory Management'),
        actions: [
          IconButton(icon: const Icon(Icons.qr_code_scanner), onPressed: () {}),
        ],
      ),
      body: Padding(
        padding: const EdgeInsets.all(16.0),
        child: Column(
          children: [
            Row(
              children: [
                _buildSummaryCard(context, 'Total Items', '1,245', Colors.blue),
                const SizedBox(width: 16),
                _buildSummaryCard(context, 'Low Stock Alerts', '5', Colors.redAccent),
                const SizedBox(width: 16),
                _buildSummaryCard(context, 'Recent Movements', '12', Colors.orange),
              ],
            ),
            const SizedBox(height: 24),
            Expanded(
              child: GridView.count(
                crossAxisCount: 3,
                crossAxisSpacing: 16,
                mainAxisSpacing: 16,
                childAspectRatio: 2.5,
                children: [
                  _buildActionBtn(Icons.inventory, 'Stock List'),
                  _buildActionBtn(Icons.add_box, 'Add Stock (GRN)'),
                  _buildActionBtn(Icons.swap_horiz, 'Stock Transfer'),
                  _buildActionBtn(Icons.warning, 'Adjust / Damage'),
                  _buildActionBtn(Icons.analytics, 'Consumption Report'),
                  _buildActionBtn(Icons.notifications_active, 'Alerts & Expiry'),
                ],
              ),
            )
          ],
        ),
      ),
    );
  }

  Widget _buildSummaryCard(BuildContext context, String title, String value, Color color) {
    return Expanded(
      child: Card(
        color: color.withValues(alpha: 0.1),
        elevation: 0,
        shape: RoundedRectangleBorder(
          side: BorderSide(color: color.withValues(alpha: 0.5), width: 2),
          borderRadius: BorderRadius.circular(12),
        ),
        child: Padding(
          padding: const EdgeInsets.all(20.0),
          child: Column(
            crossAxisAlignment: CrossAxisAlignment.start,
            children: [
              Text(title, style: TextStyle(color: color, fontWeight: FontWeight.bold, fontSize: 16)),
              const SizedBox(height: 8),
              Text(value, style: TextStyle(color: color, fontWeight: FontWeight.w900, fontSize: 32)),
            ],
          ),
        ),
      ),
    );
  }

  Widget _buildActionBtn(IconData icon, String label) {
    return ElevatedButton.icon(
      style: ElevatedButton.styleFrom(
        padding: const EdgeInsets.all(16),
        shape: RoundedRectangleBorder(borderRadius: BorderRadius.circular(12)),
      ),
      onPressed: () {},
      icon: Icon(icon, size: 28),
      label: Text(label, style: const TextStyle(fontSize: 16)),
    );
  }
}
