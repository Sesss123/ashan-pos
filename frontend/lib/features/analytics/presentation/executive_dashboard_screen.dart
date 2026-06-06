import 'package:flutter/material.dart';

class ExecutiveDashboardScreen extends StatelessWidget {
  const ExecutiveDashboardScreen({super.key});

  @override
  Widget build(BuildContext context) {
    return Scaffold(
      appBar: AppBar(
        title: const Text('Enterprise Analytics & Reporting'),
        actions: [
          ElevatedButton.icon(
            onPressed: () {},
            icon: const Icon(Icons.picture_as_pdf),
            label: const Text('Export PDF'),
          ),
          const SizedBox(width: 8),
          ElevatedButton.icon(
            onPressed: () {},
            icon: const Icon(Icons.table_chart),
            label: const Text('Export Excel'),
          ),
          const SizedBox(width: 16),
        ],
      ),
      body: SingleChildScrollView(
        padding: const EdgeInsets.all(16.0),
        child: Column(
          crossAxisAlignment: CrossAxisAlignment.start,
          children: [
            const Text('Executive Overview', style: TextStyle(fontSize: 24, fontWeight: FontWeight.bold)),
            const SizedBox(height: 16),
            Row(
              children: [
                _buildKPICard('Gross Revenue', '\$124,500.00', Colors.blue, '+15% from last month'),
                const SizedBox(width: 16),
                _buildKPICard('Net Profit', '\$42,800.00', Colors.green, '+8% from last month'),
                const SizedBox(width: 16),
                _buildKPICard('Outstanding Payables', '\$12,450.00', Colors.red, '-2% from last month'),
                const SizedBox(width: 16),
                _buildKPICard('Total Orders', '3,450', Colors.purple, '+20% from last month'),
              ],
            ),
            const SizedBox(height: 32),
            const Text('Sales Trend (Last 7 Days)', style: TextStyle(fontSize: 20, fontWeight: FontWeight.bold)),
            const SizedBox(height: 16),
            Container(
              height: 300,
              width: double.infinity,
              decoration: BoxDecoration(
                color: Colors.white,
                borderRadius: BorderRadius.circular(12),
                border: Border.all(color: Colors.grey.shade300),
                boxShadow: const [BoxShadow(color: Colors.black12, blurRadius: 4)],
              ),
              child: Center(
                child: Column(
                  mainAxisAlignment: MainAxisAlignment.center,
                  children: [
                    Icon(Icons.bar_chart, size: 100, color: Colors.blue.shade200),
                    const Text('Interactive Chart Placeholder (Use fl_chart here)', style: TextStyle(color: Colors.grey)),
                  ],
                ),
              ),
            ),
            const SizedBox(height: 32),
            Row(
              crossAxisAlignment: CrossAxisAlignment.start,
              children: [
                Expanded(child: _buildReportList('Financial Reports', ['Profit & Loss Statement', 'Expense Breakdown', 'Tax Summary'])),
                const SizedBox(width: 16),
                Expanded(child: _buildReportList('Inventory Reports', ['Stock Valuation', 'Low Stock Alerts', 'Consumption Rate'])),
                const SizedBox(width: 16),
                Expanded(child: _buildReportList('Staff Reports', ['Cashier Shift Summary', 'Waiter Performance', 'Attendance Logs'])),
              ],
            )
          ],
        ),
      ),
    );
  }

  Widget _buildKPICard(String title, String value, Color color, String subtitle) {
    return Expanded(
      child: Container(
        padding: const EdgeInsets.all(20),
        decoration: BoxDecoration(
          color: color.withOpacity(0.05),
          border: Border.all(color: color.withOpacity(0.2)),
          borderRadius: BorderRadius.circular(12),
        ),
        child: Column(
          crossAxisAlignment: CrossAxisAlignment.start,
          children: [
            Text(title, style: TextStyle(color: color.withOpacity(0.8), fontWeight: FontWeight.bold)),
            const SizedBox(height: 8),
            Text(value, style: TextStyle(color: color, fontSize: 28, fontWeight: FontWeight.w900)),
            const SizedBox(height: 8),
            Text(subtitle, style: const TextStyle(fontSize: 12, color: Colors.grey)),
          ],
        ),
      ),
    );
  }

  Widget _buildReportList(String title, List<String> reports) {
    return Container(
      decoration: BoxDecoration(
        color: Colors.white,
        borderRadius: BorderRadius.circular(12),
        border: Border.all(color: Colors.grey.shade300),
      ),
      child: Column(
        crossAxisAlignment: CrossAxisAlignment.start,
        children: [
          Container(
            width: double.infinity,
            padding: const EdgeInsets.all(16),
            decoration: BoxDecoration(color: Colors.grey.shade100, borderRadius: const BorderRadius.vertical(top: Radius.circular(12))),
            child: Text(title, style: const TextStyle(fontWeight: FontWeight.bold, fontSize: 16)),
          ),
          ...reports.map((report) => ListTile(
            title: Text(report),
            trailing: const Icon(Icons.download, size: 20, color: Colors.blue),
            onTap: () {},
          )).toList(),
        ],
      ),
    );
  }
}
