import 'package:flutter/material.dart';

class SecurityCenterScreen extends StatelessWidget {
  const SecurityCenterScreen({super.key});

  @override
  Widget build(BuildContext context) {
    return Scaffold(
      appBar: AppBar(
        title: const Text('Security & Access Center'),
        actions: [
          ElevatedButton.icon(
            onPressed: () {},
            icon: const Icon(Icons.shield),
            label: const Text('Run Security Scan'),
            style: ElevatedButton.styleFrom(backgroundColor: Colors.green, foregroundColor: Colors.white),
          ),
          const SizedBox(width: 16),
        ],
      ),
      body: SingleChildScrollView(
        padding: const EdgeInsets.all(24.0),
        child: Column(
          crossAxisAlignment: CrossAxisAlignment.start,
          children: [
            const Text('System Health & Threat Monitoring', style: TextStyle(fontSize: 24, fontWeight: FontWeight.bold)),
            const SizedBox(height: 24),
            Row(
              children: [
                _buildSecurityCard('Active Sessions', '245', Icons.devices, Colors.blue, 'Across 12 Branches'),
                const SizedBox(width: 16),
                _buildSecurityCard('Failed Logins (24h)', '12', Icons.warning_amber_rounded, Colors.orange, '3 IPs Blocked'),
                const SizedBox(width: 16),
                _buildSecurityCard('System Status', 'Secured', Icons.check_circle, Colors.green, 'All Firewall rules active'),
              ],
            ),
            const SizedBox(height: 32),
            const Text('Active Devices & Sessions', style: TextStyle(fontSize: 20, fontWeight: FontWeight.bold)),
            const SizedBox(height: 16),
            Container(
              decoration: BoxDecoration(
                border: Border.all(color: Colors.grey.shade300),
                borderRadius: BorderRadius.circular(12),
              ),
              child: DataTable(
                headingRowColor: MaterialStateProperty.all(Colors.grey.shade100),
                columns: const [
                  DataColumn(label: Text('User')),
                  DataColumn(label: Text('Device/Browser')),
                  DataColumn(label: Text('IP Address')),
                  DataColumn(label: Text('Last Active')),
                  DataColumn(label: Text('Action')),
                ],
                rows: [
                  _buildDeviceRow('Admin (sehas@ashn.pos)', 'MacBook Pro / Chrome', '192.168.1.45', 'Just now'),
                  _buildDeviceRow('Cashier 01', 'iPad Pro / Safari', '192.168.1.102', '5 mins ago'),
                  _buildDeviceRow('Branch Manager', 'Windows PC / Edge', '10.0.0.5', '1 hour ago'),
                ],
              ),
            )
          ],
        ),
      ),
    );
  }

  Widget _buildSecurityCard(String title, String value, IconData icon, Color color, String subtitle) {
    return Expanded(
      child: Container(
        padding: const EdgeInsets.all(20),
        decoration: BoxDecoration(
          color: Colors.white,
          borderRadius: BorderRadius.circular(12),
          border: Border.all(color: color.withOpacity(0.3)),
          boxShadow: const [BoxShadow(color: Colors.black12, blurRadius: 4)],
        ),
        child: Row(
          children: [
            CircleAvatar(backgroundColor: color.withOpacity(0.1), radius: 30, child: Icon(icon, color: color, size: 30)),
            const SizedBox(width: 16),
            Column(
              crossAxisAlignment: CrossAxisAlignment.start,
              children: [
                Text(title, style: const TextStyle(color: Colors.grey)),
                Text(value, style: TextStyle(fontSize: 24, fontWeight: FontWeight.bold, color: color)),
                Text(subtitle, style: const TextStyle(fontSize: 12, color: Colors.grey)),
              ],
            )
          ],
        ),
      ),
    );
  }

  DataRow _buildDeviceRow(String user, String device, String ip, String time) {
    return DataRow(
      cells: [
        DataCell(Text(user, style: const TextStyle(fontWeight: FontWeight.bold))),
        DataCell(Row(
          children: [
            Icon(device.contains('iPad') || device.contains('Mobile') ? Icons.tablet_mac : Icons.computer, size: 16),
            const SizedBox(width: 8),
            Text(device),
          ],
        )),
        DataCell(Text(ip)),
        DataCell(Text(time)),
        DataCell(TextButton.icon(
          onPressed: () {},
          icon: const Icon(Icons.block, color: Colors.red),
          label: const Text('Revoke', style: TextStyle(color: Colors.red)),
        )),
      ],
    );
  }
}
