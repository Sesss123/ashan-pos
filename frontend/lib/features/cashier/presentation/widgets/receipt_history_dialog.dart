import '../../../../core/utils/app_currency.dart';
import 'package:flutter/material.dart';
import 'package:flutter_riverpod/flutter_riverpod.dart';
import 'package:google_fonts/google_fonts.dart';
// lucide_icons removed - using built-in Icons.*

import '../providers/cashier_providers.dart';

// --- Theme Colors ---

class ReceiptHistoryDialog extends ConsumerStatefulWidget {
  const ReceiptHistoryDialog({super.key});

  @override
  ConsumerState<ReceiptHistoryDialog> createState() => _ReceiptHistoryDialogState();
}

class _ReceiptHistoryDialogState extends ConsumerState<ReceiptHistoryDialog> {
  String _selectedFilter = 'today';
  final TextEditingController _searchController = TextEditingController();

  @override
  void dispose() {
    _searchController.dispose();
    super.dispose();
  }

  @override
  Widget build(BuildContext context) {
    final receiptsState = ref.watch(receiptsProvider({'dateRange': _selectedFilter, 'q': _searchController.text}));

    return Dialog(
      backgroundColor: Colors.transparent,
      insetPadding: const EdgeInsets.all(24),
      child: Container(
        width: 1100,
        height: 800,
        decoration: BoxDecoration(
          color: Theme.of(context).cardTheme.color ?? Theme.of(context).colorScheme.surface,
          borderRadius: BorderRadius.circular(32),
          boxShadow: [BoxShadow(color: Colors.black.withValues(alpha: 0.1), blurRadius: 40, offset: const Offset(0, 20))],
        ),
        child: Column(
          crossAxisAlignment: CrossAxisAlignment.stretch,
          children: [
            // Header
            Padding(
              padding: const EdgeInsets.all(32),
              child: Row(
                mainAxisAlignment: MainAxisAlignment.spaceBetween,
                children: [
                  Row(
                    children: [
                      Container(
                        padding: const EdgeInsets.all(16),
                        decoration: BoxDecoration(color: Theme.of(context).colorScheme.primary.withValues(alpha: 0.1), shape: BoxShape.circle),
                        child: Icon(Icons.receipt_long_outlined, color: Theme.of(context).colorScheme.primary, size: 28),
                      ),
                      const SizedBox(width: 20),
                      Text('Receipt History', style: GoogleFonts.inter(fontSize: 28, fontWeight: FontWeight.w800, color: (Theme.of(context).textTheme.bodyMedium?.color ?? Colors.black))),
                    ],
                  ),
                  IconButton(
                    icon: Icon(Icons.close, color: (Theme.of(context).textTheme.bodyMedium?.color?.withValues(alpha: 0.6) ?? Colors.grey)),
                    onPressed: () => Navigator.pop(context),
                  ),
                ],
              ),
            ),
            
            // Toolbar (Filters & Search)
            Padding(
              padding: const EdgeInsets.symmetric(horizontal: 32),
              child: Row(
                children: [
                  _buildFilterChip('Today', 'today'),
                  const SizedBox(width: 12),
                  _buildFilterChip('Yesterday', 'yesterday'),
                  const SizedBox(width: 12),
                  _buildFilterChip('Last 7 Days', '7days'),
                  const SizedBox(width: 12),
                  _buildFilterChip('Custom Range', 'custom'),
                  const Spacer(),
                  SizedBox(
                    width: 320,
                    child: TextField(
                      controller: _searchController,
                      style: GoogleFonts.inter(fontSize: 15, fontWeight: FontWeight.w600, color: (Theme.of(context).textTheme.bodyMedium?.color ?? Colors.black)),
                      decoration: InputDecoration(
                        hintText: 'Search Invoice, Phone...',
                        hintStyle: GoogleFonts.inter(color: (Theme.of(context).textTheme.bodyMedium?.color?.withValues(alpha: 0.6) ?? Colors.grey)),
                        prefixIcon: Icon(Icons.search, size: 18, color: (Theme.of(context).textTheme.bodyMedium?.color?.withValues(alpha: 0.6) ?? Colors.grey)),
                        filled: true,
                        fillColor: Theme.of(context).scaffoldBackgroundColor,
                        contentPadding: const EdgeInsets.symmetric(vertical: 0, horizontal: 16),
                        border: OutlineInputBorder(borderRadius: BorderRadius.circular(16), borderSide: BorderSide.none),
                      ),
                      onSubmitted: (_) => setState(() {}),
                    ),
                  ),
                ],
              ),
            ),
            const SizedBox(height: 32),
            
            // Table Header
            Padding(
              padding: const EdgeInsets.symmetric(horizontal: 32),
              child: Container(
                padding: const EdgeInsets.symmetric(horizontal: 24, vertical: 16),
                decoration: BoxDecoration(
                  color: Theme.of(context).scaffoldBackgroundColor,
                  borderRadius: const BorderRadius.vertical(top: Radius.circular(16)),
                  border: Border.all(color: Theme.of(context).dividerColor),
                ),
                child: Row(
                  children: [
                    Expanded(flex: 2, child: Text('Invoice No', style: GoogleFonts.inter(fontWeight: FontWeight.w700, color: (Theme.of(context).textTheme.bodyMedium?.color?.withValues(alpha: 0.6) ?? Colors.grey), fontSize: 13))),
                    Expanded(flex: 2, child: Text('Date & Time', style: GoogleFonts.inter(fontWeight: FontWeight.w700, color: (Theme.of(context).textTheme.bodyMedium?.color?.withValues(alpha: 0.6) ?? Colors.grey), fontSize: 13))),
                    Expanded(flex: 3, child: Text('Customer', style: GoogleFonts.inter(fontWeight: FontWeight.w700, color: (Theme.of(context).textTheme.bodyMedium?.color?.withValues(alpha: 0.6) ?? Colors.grey), fontSize: 13))),
                    Expanded(flex: 2, child: Text('Payment', style: GoogleFonts.inter(fontWeight: FontWeight.w700, color: (Theme.of(context).textTheme.bodyMedium?.color?.withValues(alpha: 0.6) ?? Colors.grey), fontSize: 13))),
                    Expanded(flex: 2, child: Text('Amount', style: GoogleFonts.inter(fontWeight: FontWeight.w700, color: (Theme.of(context).textTheme.bodyMedium?.color?.withValues(alpha: 0.6) ?? Colors.grey), fontSize: 13))),
                    Expanded(flex: 2, child: Text('Status', style: GoogleFonts.inter(fontWeight: FontWeight.w700, color: (Theme.of(context).textTheme.bodyMedium?.color?.withValues(alpha: 0.6) ?? Colors.grey), fontSize: 13))),
                    Expanded(flex: 3, child: Text('Actions', style: GoogleFonts.inter(fontWeight: FontWeight.w700, color: (Theme.of(context).textTheme.bodyMedium?.color?.withValues(alpha: 0.6) ?? Colors.grey), fontSize: 13), textAlign: TextAlign.right)),
                  ],
                ),
              ),
            ),
            
            // Table Body
            Expanded(
              child: Padding(
                padding: const EdgeInsets.symmetric(horizontal: 32),
                child: Container(
                  decoration: BoxDecoration(
                    color: Theme.of(context).cardTheme.color ?? Theme.of(context).colorScheme.surface,
                    borderRadius: BorderRadius.vertical(bottom: Radius.circular(16)),
                    border: Border(left: BorderSide(color: Theme.of(context).dividerColor), right: BorderSide(color: Theme.of(context).dividerColor), bottom: BorderSide(color: Theme.of(context).dividerColor)),
                  ),
                  child: receiptsState.when(
                    data: (receipts) {
                      if (receipts.isEmpty) {
                        return Center(
                          child: Column(
                            mainAxisSize: MainAxisSize.min,
                            children: [
                              Icon(Icons.manage_search_outlined, size: 64, color: Theme.of(context).dividerColor),
                              const SizedBox(height: 24),
                              Text('No receipts found for this period.', style: GoogleFonts.inter(color: (Theme.of(context).textTheme.bodyMedium?.color?.withValues(alpha: 0.6) ?? Colors.grey), fontSize: 16, fontWeight: FontWeight.w600)),
                            ],
                          ),
                        );
                      }
                      return ListView.separated(
                        itemCount: receipts.length,
                        separatorBuilder: (_, _) => Divider(height: 1, color: Theme.of(context).dividerColor),
                        itemBuilder: (context, index) {
                          final receipt = receipts[index];
                          final order = receipt['order'] ?? {};
                          final payments = order['payments'] as List? ?? [];
                          final paymentMethod = payments.isNotEmpty ? payments.first['method'] : 'Unknown';
                          
                          return Padding(
                            padding: const EdgeInsets.symmetric(horizontal: 24, vertical: 20),
                            child: Row(
                              children: [
                                Expanded(flex: 2, child: Text(receipt['receiptNo'] ?? 'N/A', style: GoogleFonts.inter(fontWeight: FontWeight.w800, color: (Theme.of(context).textTheme.bodyMedium?.color ?? Colors.black)))),
                                Expanded(flex: 2, child: Text(_formatDate(receipt['createdAt']), style: GoogleFonts.inter(color: (Theme.of(context).textTheme.bodyMedium?.color?.withValues(alpha: 0.6) ?? Colors.grey), fontWeight: FontWeight.w600, fontSize: 13))),
                                Expanded(flex: 3, child: Text(order['user']?['name'] ?? 'Walk-in', style: GoogleFonts.inter(color: (Theme.of(context).textTheme.bodyMedium?.color ?? Colors.black), fontWeight: FontWeight.w600))),
                                Expanded(flex: 2, child: Text(paymentMethod, style: GoogleFonts.inter(color: (Theme.of(context).textTheme.bodyMedium?.color?.withValues(alpha: 0.6) ?? Colors.grey), fontWeight: FontWeight.w600))),
                                Expanded(flex: 2, child: Text(AppCurrency.format(order['total']?.toStringAsFixed(2) ?? '0.00'), style: GoogleFonts.inter(fontWeight: FontWeight.w800, color: Theme.of(context).colorScheme.primary, fontSize: 15))),
                                Expanded(
                                  flex: 2, 
                                  child: Align(
                                    alignment: Alignment.centerLeft,
                                    child: Container(
                                      padding: const EdgeInsets.symmetric(horizontal: 12, vertical: 6),
                                      decoration: BoxDecoration(
                                        color: order['status'] == 'Completed' ? Theme.of(context).colorScheme.secondary.withValues(alpha: 0.1) : Colors.orange.withValues(alpha: 0.1),
                                        borderRadius: BorderRadius.circular(20),
                                      ),
                                      child: Text(
                                        order['status'] ?? 'Unknown',
                                        style: GoogleFonts.inter(color: order['status'] == 'Completed' ? Theme.of(context).colorScheme.secondary : Colors.orange, fontSize: 12, fontWeight: FontWeight.w800),
                                      ),
                                    ),
                                  ),
                                ),
                                Expanded(
                                  flex: 3,
                                  child: Row(
                                    mainAxisAlignment: MainAxisAlignment.end,
                                    children: [
                                      IconButton(
                                        icon: Icon(Icons.visibility_outlined, size: 20, color: Theme.of(context).colorScheme.primary),
                                        tooltip: 'View',
                                        onPressed: () {},
                                      ),
                                      IconButton(
                                        icon: Icon(Icons.print_outlined, size: 20, color: (Theme.of(context).textTheme.bodyMedium?.color?.withValues(alpha: 0.6) ?? Colors.grey)),
                                        tooltip: 'Reprint',
                                        onPressed: () {},
                                      ),
                                      if (order['status'] == 'Completed')
                                        IconButton(
                                          icon: const Icon(Icons.undo, size: 20, color: Colors.orange),
                                          tooltip: 'Refund',
                                          onPressed: () => _handleRefund(context, order['id']),
                                        ),
                                      if (order['status'] != 'Refunded')
                                        IconButton(
                                          icon: Icon(Icons.block, size: 20, color: Colors.redAccent),
                                          tooltip: 'Void',
                                          onPressed: () {},
                                        ),
                                    ],
                                  ),
                                ),
                              ],
                            ),
                          );
                        },
                      );
                    },
                    loading: () => const Center(child: CircularProgressIndicator()),
                    error: (err, _) => Center(child: Text('Error: $err', style: GoogleFonts.inter(color: Colors.red))),
                  ),
                ),
              ),
            ),
            const SizedBox(height: 32),
          ],
        ),
      ),
    );
  }

  Widget _buildFilterChip(String label, String value) {
    final isSelected = _selectedFilter == value;
    
    return InkWell(
      onTap: () => setState(() => _selectedFilter = value),
      borderRadius: BorderRadius.circular(20),
      child: AnimatedContainer(
        duration: const Duration(milliseconds: 200),
        padding: const EdgeInsets.symmetric(horizontal: 20, vertical: 10),
        decoration: BoxDecoration(
          color: isSelected ? Theme.of(context).colorScheme.primary : Theme.of(context).scaffoldBackgroundColor,
          borderRadius: BorderRadius.circular(20),
          border: Border.all(color: isSelected ? Theme.of(context).colorScheme.primary : Theme.of(context).dividerColor),
        ),
        child: Text(
          label,
          style: GoogleFonts.inter(
            fontWeight: isSelected ? FontWeight.w700 : FontWeight.w600,
            color: isSelected ? Colors.white : (Theme.of(context).textTheme.bodyMedium?.color?.withValues(alpha: 0.6) ?? Colors.grey),
            fontSize: 14,
          ),
        ),
      ),
    );
  }

  Future<void> _handleRefund(BuildContext context, String orderId) async {
    final confirm = await showDialog<bool>(
      context: context,
      builder: (ctx) => AlertDialog(
        title: Text('Confirm Refund', style: GoogleFonts.inter(fontWeight: FontWeight.bold)),
        content: const Text('Are you sure you want to refund this order? This action cannot be undone.'),
        actions: [
          TextButton(onPressed: () => Navigator.pop(ctx, false), child: const Text('Cancel')),
          ElevatedButton(
            style: ElevatedButton.styleFrom(backgroundColor: Colors.red),
            onPressed: () => Navigator.pop(ctx, true),
            child: const Text('Refund', style: TextStyle(color: Colors.white)),
          ),
        ],
      ),
    );

    if (confirm != true) return;

    if (!context.mounted) return;

    try {
      showDialog(context: context, barrierDismissible: false, builder: (_) => const Center(child: CircularProgressIndicator()));
      
      final repo = ref.read(cashierRepositoryProvider);
      await repo.refundOrder(orderId);
      
      if (!context.mounted) return;
      Navigator.pop(context); // close loading
      
      ref.invalidate(receiptsProvider);
      
      ScaffoldMessenger.of(context).showSnackBar(const SnackBar(content: Text('Order refunded successfully'), backgroundColor: Colors.green));
    } catch (e) {
      if (!context.mounted) return;
      Navigator.pop(context); // close loading
      ScaffoldMessenger.of(context).showSnackBar(SnackBar(content: Text('Refund failed: $e'), backgroundColor: Colors.red));
    }
  }

  String _formatDate(String? isoString) {
    if (isoString == null) return 'N/A';
    final date = DateTime.parse(isoString).toLocal();
    return '${date.year}-${date.month.toString().padLeft(2, '0')}-${date.day.toString().padLeft(2, '0')} ${date.hour.toString().padLeft(2, '0')}:${date.minute.toString().padLeft(2, '0')}';
  }
}
