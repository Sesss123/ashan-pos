import '../../../../core/utils/app_currency.dart';
import 'package:flutter/material.dart';
import 'package:flutter_riverpod/flutter_riverpod.dart';
import 'providers/inventory_dashboard_provider.dart';
import 'widgets/kpi_card.dart';
import 'widgets/stock_adjustment_modal.dart';

class InventoryDashboardScreen extends ConsumerStatefulWidget {
  const InventoryDashboardScreen({super.key});

  @override
  ConsumerState<InventoryDashboardScreen> createState() => _InventoryDashboardScreenState();
}

class _InventoryDashboardScreenState extends ConsumerState<InventoryDashboardScreen> {
  @override
  void initState() {
    super.initState();
    Future.microtask(() => ref.read(inventoryDashboardProvider.notifier).fetchDashboard());
  }

  @override
  Widget build(BuildContext context) {
    final state = ref.watch(inventoryDashboardProvider);

    return Scaffold(
      backgroundColor: const Color(0xFF0A0A0A),
      appBar: AppBar(
        backgroundColor: Colors.transparent,
        elevation: 0,
        title: const Text('Inventory Management', style: TextStyle(fontWeight: FontWeight.bold, color: Colors.white)),
        actions: [
          IconButton(
            icon: const Icon(Icons.refresh, color: Colors.white70),
            onPressed: () => ref.read(inventoryDashboardProvider.notifier).fetchDashboard(),
          ),
          const SizedBox(width: 16),
          ElevatedButton.icon(
            style: ElevatedButton.styleFrom(
              backgroundColor: const Color(0xFF6366F1), // Indigo/Stripe purple
              foregroundColor: Colors.white,
            ),
            icon: const Icon(Icons.add),
            label: const Text('Add Product'),
            onPressed: () {},
          ),
          const SizedBox(width: 24),
        ],
      ),
      body: state.isLoading
          ? const Center(child: CircularProgressIndicator(color: Color(0xFF6366F1)))
          : state.error != null
              ? Center(child: Text('Error: ${state.error}', style: const TextStyle(color: Colors.red)))
              : SingleChildScrollView(
                  padding: const EdgeInsets.all(24.0),
                  child: Column(
                    crossAxisAlignment: CrossAxisAlignment.start,
                    children: [
                      // 1. KPI CARDS
                      Row(
                        children: [
                          Expanded(
                            child: KpiCard(
                              title: 'Total Items',
                              value: state.kpis['totalItems']?.toString() ?? '0',
                              icon: Icons.inventory_2,
                              color: Colors.blue,
                              trend: '12%',
                              isPositiveTrend: true,
                            ),
                          ),
                          const SizedBox(width: 16),
                          Expanded(
                            child: KpiCard(
                              title: 'Low Stock',
                              value: state.kpis['lowStockCount']?.toString() ?? '0',
                              icon: Icons.warning_amber_rounded,
                              color: Colors.orange,
                              trend: '5%',
                              isPositiveTrend: false,
                            ),
                          ),
                          const SizedBox(width: 16),
                          Expanded(
                            child: KpiCard(
                              title: 'Out of Stock',
                              value: state.kpis['outOfStockCount']?.toString() ?? '0',
                              icon: Icons.error_outline,
                              color: Colors.red,
                              trend: '2%',
                              isPositiveTrend: true,
                            ),
                          ),
                          const SizedBox(width: 16),
                          Expanded(
                            child: KpiCard(
                              title: 'Total Value',
                              value: AppCurrency.format((state.kpis['totalValue'] ?? 0)),
                              icon: Icons.attach_money,
                              color: Colors.green,
                              trend: '8.4%',
                              isPositiveTrend: true,
                            ),
                          ),
                        ],
                      ),
                      const SizedBox(height: 32),

                      // 2. MAIN CONTENT (Table & Timeline)
                      Row(
                        crossAxisAlignment: CrossAxisAlignment.start,
                        children: [
                          // Left: Data Table
                          Expanded(
                            flex: 3,
                            child: Container(
                              decoration: BoxDecoration(
                                color: const Color(0xFF1E1E1E),
                                borderRadius: BorderRadius.circular(16),
                                border: Border.all(color: const Color(0xFF2A2A2A)),
                              ),
                              child: Column(
                                crossAxisAlignment: CrossAxisAlignment.start,
                                children: [
                                  Padding(
                                    padding: const EdgeInsets.all(20.0),
                                    child: Row(
                                      mainAxisAlignment: MainAxisAlignment.spaceBetween,
                                      children: [
                                        const Text('Inventory Items', style: TextStyle(color: Colors.white, fontSize: 18, fontWeight: FontWeight.bold)),
                                        SizedBox(
                                          width: 250,
                                          height: 40,
                                          child: TextField(
                                            style: const TextStyle(color: Colors.white, fontSize: 14),
                                            decoration: InputDecoration(
                                              hintText: 'Search items...',
                                              hintStyle: const TextStyle(color: Colors.white38),
                                              prefixIcon: const Icon(Icons.search, color: Colors.white38, size: 20),
                                              filled: true,
                                              fillColor: const Color(0xFF0A0A0A),
                                              contentPadding: const EdgeInsets.symmetric(vertical: 0),
                                              border: OutlineInputBorder(
                                                borderRadius: BorderRadius.circular(8),
                                                borderSide: BorderSide.none,
                                              ),
                                            ),
                                          ),
                                        ),
                                      ],
                                    ),
                                  ),
                                  const Divider(color: Color(0xFF2A2A2A), height: 1),
                                  SingleChildScrollView(
                                    scrollDirection: Axis.horizontal,
                                    child: DataTable(
                                      headingTextStyle: const TextStyle(color: Colors.white54, fontWeight: FontWeight.bold),
                                      dataTextStyle: const TextStyle(color: Colors.white),
                                      dividerThickness: 1,
                                      horizontalMargin: 20,
                                      columns: const [
                                        DataColumn(label: Text('Item Name')),
                                        DataColumn(label: Text('Quantity')),
                                        DataColumn(label: Text('Unit')),
                                        DataColumn(label: Text('Unit Cost')),
                                        DataColumn(label: Text('Status')),
                                        DataColumn(label: Text('Actions')),
                                      ],
                                      rows: state.items.map((item) {
                                        final isOut = item['quantity'] == 0;
                                        final isLow = item['quantity'] <= item['minStock'] && !isOut;
                                        
                                        Color statusColor = Colors.green;
                                        String statusText = 'In Stock';
                                        if (isOut) { statusColor = Colors.red; statusText = 'Out of Stock'; }
                                        else if (isLow) { statusColor = Colors.orange; statusText = 'Low Stock'; }

                                        return DataRow(
                                          cells: [
                                            DataCell(Text(item['name'], style: const TextStyle(fontWeight: FontWeight.w600))),
                                            DataCell(Text(item['quantity'].toString())),
                                            DataCell(Text(item['unit'].toString())),
                                            DataCell(Text(AppCurrency.format((item['unitCost'] ?? 0)))),
                                            DataCell(
                                              Container(
                                                padding: const EdgeInsets.symmetric(horizontal: 8, vertical: 4),
                                                decoration: BoxDecoration(
                                                  color: statusColor.withValues(alpha: 0.1),
                                                  borderRadius: BorderRadius.circular(12),
                                                  border: Border.all(color: statusColor.withValues(alpha: 0.5)),
                                                ),
                                                child: Text(statusText, style: TextStyle(color: statusColor, fontSize: 12, fontWeight: FontWeight.bold)),
                                              )
                                            ),
                                            DataCell(
                                              TextButton(
                                                style: TextButton.styleFrom(foregroundColor: const Color(0xFF6366F1)),
                                                onPressed: () {
                                                  showDialog(context: context, builder: (_) => StockAdjustmentModal(item: item));
                                                },
                                                child: const Text('Adjust'),
                                              )
                                            ),
                                          ],
                                        );
                                      }).toList(),
                                    ),
                                  ),
                                  if (state.items.isEmpty)
                                    const Padding(
                                      padding: EdgeInsets.all(40.0),
                                      child: Center(child: Text('No inventory items found.', style: TextStyle(color: Colors.white38))),
                                    )
                                ],
                              ),
                            ),
                          ),
                          const SizedBox(width: 32),
                          
                          // Right: Activity Timeline
                          Expanded(
                            flex: 1,
                            child: Container(
                              decoration: BoxDecoration(
                                color: const Color(0xFF1E1E1E),
                                borderRadius: BorderRadius.circular(16),
                                border: Border.all(color: const Color(0xFF2A2A2A)),
                              ),
                              child: Column(
                                crossAxisAlignment: CrossAxisAlignment.start,
                                children: [
                                  const Padding(
                                    padding: EdgeInsets.all(20.0),
                                    child: Text('Recent Activity', style: TextStyle(color: Colors.white, fontSize: 18, fontWeight: FontWeight.bold)),
                                  ),
                                  const Divider(color: Color(0xFF2A2A2A), height: 1),
                                  ListView.separated(
                                    shrinkWrap: true,
                                    physics: const NeverScrollableScrollPhysics(),
                                    itemCount: state.timeline.length > 10 ? 10 : state.timeline.length,
                                    separatorBuilder: (_, _) => const Divider(color: Color(0xFF2A2A2A), height: 1),
                                    itemBuilder: (context, index) {
                                      final movement = state.timeline[index];
                                      final isOut = movement['type'] == 'OUT';
                                      return ListTile(
                                        contentPadding: const EdgeInsets.symmetric(horizontal: 20, vertical: 8),
                                        leading: CircleAvatar(
                                          backgroundColor: isOut ? Colors.red.withValues(alpha: 0.1) : Colors.green.withValues(alpha: 0.1),
                                          child: Icon(isOut ? Icons.arrow_downward : Icons.arrow_upward, color: isOut ? Colors.red : Colors.green, size: 16),
                                        ),
                                        title: Text(movement['item']['name'], style: const TextStyle(color: Colors.white, fontSize: 14)),
                                        subtitle: Text(
                                          '${isOut ? '-' : '+'}${movement['quantity']} ${movement['item']['unit']}', 
                                          style: TextStyle(color: isOut ? Colors.redAccent : Colors.greenAccent, fontWeight: FontWeight.bold)
                                        ),
                                      );
                                    },
                                  ),
                                  if (state.timeline.isEmpty)
                                    const Padding(
                                      padding: EdgeInsets.all(40.0),
                                      child: Center(child: Text('No recent activity.', style: TextStyle(color: Colors.white38))),
                                    )
                                ],
                              ),
                            ),
                          )
                        ],
                      )
                    ],
                  ),
                ),
    );
  }
}
