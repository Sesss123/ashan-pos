import '../../../core/utils/app_currency.dart';
import 'package:flutter/material.dart';

class AuditLogsScreen extends StatelessWidget {
  const AuditLogsScreen({super.key});

  @override
  Widget build(BuildContext context) {
    return Scaffold(
      appBar: AppBar(
        title: const Text('System Audit Logs'),
        actions: [
          IconButton(icon: const Icon(Icons.filter_list), onPressed: () {}),
          IconButton(icon: const Icon(Icons.download), onPressed: () {}),
          const SizedBox(width: 16),
        ],
      ),
      body: ListView.builder(
        padding: const EdgeInsets.all(16),
        itemCount: 15,
        itemBuilder: (context, index) {
          final isCritical = index % 5 == 0;
          return Card(
            margin: const EdgeInsets.only(bottom: 8),
            child: ListTile(
              leading: CircleAvatar(
                backgroundColor: isCritical ? Colors.red.shade100 : Colors.blue.shade100,
                child: Icon(
                  isCritical ? Icons.security : Icons.info_outline,
                  color: isCritical ? Colors.red : Colors.blue,
                ),
              ),
              title: Text(
                isCritical ? 'Failed Login Attempt' : 'Order Processed Successfully',
                style: const TextStyle(fontWeight: FontWeight.bold),
              ),
              subtitle: Text(
                isCritical 
                    ? 'User: unknown | IP: 185.12.34.5 | Reason: Invalid Credentials'
                    : 'User: Cashier 01 | Order ID: #ORD-99${index}2 | Amount: ${AppCurrency.format(45.00)}',
              ),
              trailing: Column(
                mainAxisAlignment: MainAxisAlignment.center,
                crossAxisAlignment: CrossAxisAlignment.end,
                children: [
                  Text('2026-06-06', style: TextStyle(color: Colors.grey.shade600, fontSize: 12)),
                  Text('14:3$index', style: TextStyle(color: Colors.grey.shade600, fontSize: 12)),
                ],
              ),
              isThreeLine: true,
            ),
          );
        },
      ),
    );
  }
}
