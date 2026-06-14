import '../../../../core/utils/app_currency.dart';
import 'package:flutter/material.dart';
import 'package:flutter_riverpod/flutter_riverpod.dart';
import 'package:intl/intl.dart';
import 'package:google_fonts/google_fonts.dart';
import '../providers/cashier_providers.dart';
import '../../../../core/utils/pdf_generator.dart';

class ReceiptsModuleView extends ConsumerWidget {
  const ReceiptsModuleView({super.key});

  @override
  Widget build(BuildContext context, WidgetRef ref) {
    final receiptsState = ref.watch(receiptsProvider(const {}));

    return Container(
      color: Theme.of(context).scaffoldBackgroundColor,
      padding: const EdgeInsets.all(24),
      child: Column(
        crossAxisAlignment: CrossAxisAlignment.start,
        children: [
          Row(
            mainAxisAlignment: MainAxisAlignment.spaceBetween,
            children: [
              Text('Transaction History', style: GoogleFonts.inter(fontSize: 24, fontWeight: FontWeight.w800, color: Theme.of(context).textTheme.bodyMedium?.color)),
              OutlinedButton.icon(
                onPressed: () => ref.invalidate(receiptsProvider), 
                icon: const Icon(Icons.refresh), 
                label: const Text('Refresh')
              ),
            ],
          ),
          const SizedBox(height: 24),
          Expanded(
            child: receiptsState.when(
              data: (receipts) {
                if (receipts.isEmpty) {
                  return const Center(child: Text('No transactions found.'));
                }
                return ListView.separated(
                  itemCount: receipts.length,
                  separatorBuilder: (_, _) => Divider(color: Theme.of(context).dividerColor),
                  itemBuilder: (context, index) {
                    final order = receipts[index];
                    final orderId = order['id']?.toString() ?? 'N/A';
                    final total = (order['total'] ?? 0).toDouble();
                    final date = DateTime.parse(order['createdAt'] ?? DateTime.now().toIso8601String());
                    
                    return ListTile(
                      leading: CircleAvatar(
                        backgroundColor: Theme.of(context).colorScheme.primaryContainer, 
                        child: Icon(Icons.receipt_long, color: Theme.of(context).colorScheme.primary)
                      ),
                      title: Text('Receipt #${orderId.substring(0, 6)}', style: GoogleFonts.inter(fontWeight: FontWeight.w700)),
                      subtitle: Text('${order['paymentMethod'] ?? 'Cash'} • ${DateFormat('MM/dd/yy hh:mm a').format(date)}'),
                      trailing: Row(
                        mainAxisSize: MainAxisSize.min,
                        children: [
                          Text(AppCurrency.format(total), style: GoogleFonts.inter(fontWeight: FontWeight.w800, fontSize: 16)),
                          const SizedBox(width: 16),
                          IconButton(
                            icon: const Icon(Icons.print),
                            color: Theme.of(context).colorScheme.secondary,
                            onPressed: () {
                              PdfGenerator.printReceipt(order);
                            },
                          ),
                        ],
                      ),
                      onTap: () {
                        // show receipt dialog
                      },
                    );
                  },
                );
              },
              loading: () => const Center(child: CircularProgressIndicator()),
              error: (e, _) => Center(child: Text('Failed to load receipts: $e')),
            ),
          ),
        ],
      ),
    );
  }
}
