import '../../../core/utils/app_currency.dart';
import 'package:flutter/material.dart';
import 'package:flutter_riverpod/flutter_riverpod.dart';
import 'providers/customer_provider.dart';

class CustomerDashboardScreen extends ConsumerWidget {
  const CustomerDashboardScreen({super.key});

  @override
  Widget build(BuildContext context, WidgetRef ref) {
    final customerStateAsync = ref.watch(customerProvider);

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
          IconButton(
            icon: const Icon(Icons.refresh),
            onPressed: () => ref.invalidate(customerProvider),
          ),
          const SizedBox(width: 16),
        ],
      ),
      body: customerStateAsync.when(
        loading: () => const Center(child: CircularProgressIndicator()),
        error: (err, stack) => Center(child: Text('Error loading customers: $err')),
        data: (state) => Row(
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
                  _buildMiniCard('VIP Members', state.stats['vipCount']!, Colors.purple),
                  _buildMiniCard('Total Points Issued', state.stats['totalPoints']!, Colors.orange),
                  _buildMiniCard('Wallet Balance (Total)', state.stats['walletBalance']!, Colors.green),
                ],
              ),
            ),
            // Customer List
            Expanded(
              child: ListView.builder(
                padding: const EdgeInsets.all(16),
                itemCount: state.customers.length,
                itemBuilder: (context, index) {
                  final customer = state.customers[index];
                  final isVip = customer['groupId'] != null;
                  final walletBal = customer['wallet']?['balance'] ?? 0.0;
                  final points = customer['points']?['balance'] ?? 0;

                  return Card(
                    margin: const EdgeInsets.only(bottom: 12),
                    child: ListTile(
                      contentPadding: const EdgeInsets.all(16),
                      leading: CircleAvatar(
                        backgroundColor: isVip ? Colors.purple.shade100 : Colors.blue.shade100,
                        child: Text(customer['name']?.substring(0, 1) ?? 'C', style: TextStyle(color: isVip ? Colors.purple : Colors.blue)),
                      ),
                      title: Text(customer['name'] ?? 'Unknown', style: const TextStyle(fontWeight: FontWeight.bold)),
                      subtitle: Text('Phone: ${customer['phone'] ?? 'N/A'}\nWallet: ${AppCurrency.format(walletBal)} | Points: $points'),
                      trailing: Row(
                        mainAxisSize: MainAxisSize.min,
                        children: [
                          if (isVip)
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
        border: Border.all(color: color.withValues(alpha: 0.3)),
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
