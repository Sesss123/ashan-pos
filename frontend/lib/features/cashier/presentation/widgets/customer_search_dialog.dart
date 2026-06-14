import '../../../../core/utils/app_currency.dart';
import 'package:flutter/material.dart';
import 'package:flutter_riverpod/flutter_riverpod.dart';
import 'package:google_fonts/google_fonts.dart';
// lucide_icons removed - using built-in Icons.*

import '../providers/cart_provider.dart';
import '../providers/cashier_providers.dart';

// --- Theme Colors ---

class CustomerSearchDialog extends ConsumerStatefulWidget {
  const CustomerSearchDialog({super.key});

  @override
  ConsumerState<CustomerSearchDialog> createState() => _CustomerSearchDialogState();
}

class _CustomerSearchDialogState extends ConsumerState<CustomerSearchDialog> {
  final TextEditingController _searchController = TextEditingController();

  @override
  void dispose() {
    _searchController.dispose();
    super.dispose();
  }

  void _onSearch(String query) {
    ref.read(customerSearchProvider.notifier).search(query);
  }

  void _showCreditLedger(BuildContext context, dynamic customer) {
    showDialog(
      context: context,
      builder: (ctx) => _CustomerCreditLedgerDialog(customer: customer),
    ).then((_) {
      // Refresh customer search to get updated credit balance
      if (_searchController.text.isNotEmpty) {
        _onSearch(_searchController.text);
      }
    });
  }

  @override
  Widget build(BuildContext context) {
    final searchState = ref.watch(customerSearchProvider);

    return Dialog(
      backgroundColor: Colors.transparent,
      insetPadding: const EdgeInsets.symmetric(horizontal: 24, vertical: 32),
      child: Container(
        width: 600,
        decoration: BoxDecoration(
          color: Theme.of(context).cardTheme.color ?? Theme.of(context).colorScheme.surface,
          borderRadius: BorderRadius.circular(32),
          boxShadow: [BoxShadow(color: Colors.black.withValues(alpha: 0.1), blurRadius: 40, offset: const Offset(0, 20))],
        ),
        child: Column(
          mainAxisSize: MainAxisSize.min,
          crossAxisAlignment: CrossAxisAlignment.stretch,
          children: [
            Padding(
              padding: const EdgeInsets.fromLTRB(32, 32, 32, 24),
              child: Row(
                mainAxisAlignment: MainAxisAlignment.spaceBetween,
                children: [
                  Expanded(child: Text('Select Customer', style: GoogleFonts.inter(fontSize: 24, fontWeight: FontWeight.w800, color: (Theme.of(context).textTheme.bodyMedium?.color ?? Colors.black)), overflow: TextOverflow.ellipsis)),
                  IconButton(
                    icon: Icon(Icons.close, color: (Theme.of(context).textTheme.bodyMedium?.color?.withValues(alpha: 0.6) ?? Colors.grey)),
                    onPressed: () => Navigator.pop(context),
                  ),
                ],
              ),
            ),
            
            // Search Box
            Padding(
              padding: const EdgeInsets.symmetric(horizontal: 32),
              child: TextField(
                controller: _searchController,
                style: GoogleFonts.inter(fontSize: 16, fontWeight: FontWeight.w600, color: (Theme.of(context).textTheme.bodyMedium?.color ?? Colors.black)),
                decoration: InputDecoration(
                  hintText: 'Search by Name, Phone, or ID...',
                  hintStyle: GoogleFonts.inter(color: (Theme.of(context).textTheme.bodyMedium?.color?.withValues(alpha: 0.6) ?? Colors.grey)),
                  prefixIcon: Icon(Icons.search, color: (Theme.of(context).textTheme.bodyMedium?.color?.withValues(alpha: 0.6) ?? Colors.grey), size: 20),
                  suffixIcon: IconButton(
                    icon: Icon(Icons.person_add_outlined, color: Theme.of(context).colorScheme.primary, size: 20),
                    onPressed: () {
                      // Create New Customer Logic
                    },
                  ),
                  filled: true,
                  fillColor: Theme.of(context).scaffoldBackgroundColor,
                  border: OutlineInputBorder(borderRadius: BorderRadius.circular(16), borderSide: BorderSide.none),
                  contentPadding: const EdgeInsets.symmetric(vertical: 20),
                ),
                onChanged: _onSearch,
              ),
            ),
            const SizedBox(height: 24),
            
            // Results
            Flexible(
              child: searchState.when(
                data: (customers) {
                  if (customers.isEmpty) {
                    if (_searchController.text.isEmpty) {
                      return Padding(
                        padding: const EdgeInsets.all(40),
                        child: Column(
                          mainAxisSize: MainAxisSize.min,
                          children: [
                            Container(
                              padding: const EdgeInsets.all(24),
                              decoration: BoxDecoration(color: Theme.of(context).scaffoldBackgroundColor, shape: BoxShape.circle),
                              child: Icon(Icons.people_outline, size: 48, color: (Theme.of(context).textTheme.bodyMedium?.color?.withValues(alpha: 0.6) ?? Colors.grey)),
                            ),
                            const SizedBox(height: 24),
                            Text('Type to search customers...', style: GoogleFonts.inter(color: (Theme.of(context).textTheme.bodyMedium?.color?.withValues(alpha: 0.6) ?? Colors.grey), fontSize: 16, fontWeight: FontWeight.w600)),
                          ],
                        ),
                      );
                    }
                    return Padding(
                      padding: const EdgeInsets.all(40),
                      child: Column(
                        mainAxisSize: MainAxisSize.min,
                        children: [
                          Icon(Icons.search_off, size: 48, color: (Theme.of(context).textTheme.bodyMedium?.color?.withValues(alpha: 0.6) ?? Colors.grey)),
                          const SizedBox(height: 24),
                          Text('No customers found.', style: GoogleFonts.inter(color: (Theme.of(context).textTheme.bodyMedium?.color?.withValues(alpha: 0.6) ?? Colors.grey), fontSize: 16, fontWeight: FontWeight.w600)),
                        ],
                      ),
                    );
                  }
                  return ListView.separated(
                    shrinkWrap: true,
                    padding: const EdgeInsets.symmetric(horizontal: 32),
                    itemCount: customers.length,
                    separatorBuilder: (_, _) => const SizedBox(height: 12),
                    itemBuilder: (context, index) {
                      final customer = customers[index];
                      return _buildCustomerCard(context, customer);
                    },
                  );
                },
                loading: () => const Center(child: Padding(padding: EdgeInsets.all(40), child: CircularProgressIndicator())),
                error: (err, _) => Center(child: Padding(padding: const EdgeInsets.all(40), child: Text('Error: $err', style: GoogleFonts.inter(color: Theme.of(context).colorScheme.error)))),
              ),
            ),
            
            const SizedBox(height: 24),
            Padding(
              padding: const EdgeInsets.fromLTRB(32, 0, 32, 32),
              child: ElevatedButton.icon(
                onPressed: () {
                  ref.read(cartProvider.notifier).setOrderDetails(customerName: null);
                  Navigator.pop(context);
                },
                icon: Icon(Icons.person_remove_outlined, size: 18),
                label: Text('Remove Customer (Walk-in)', style: GoogleFonts.inter(fontWeight: FontWeight.w700)),
                style: ElevatedButton.styleFrom(
                  backgroundColor: Theme.of(context).colorScheme.error.withValues(alpha: 0.1),
                  foregroundColor: Theme.of(context).colorScheme.error,
                  padding: const EdgeInsets.symmetric(vertical: 20),
                  shape: RoundedRectangleBorder(borderRadius: BorderRadius.circular(16)),
                  elevation: 0,
                ),
              ),
            ),
          ],
        ),
      ),
    );
  }

  Widget _buildCustomerCard(BuildContext context, dynamic customer) {
    return InkWell(
      onTap: () {
        ref.read(cartProvider.notifier).setOrderDetails(customerName: customer['name']);
        Navigator.pop(context);
      },
      borderRadius: BorderRadius.circular(16),
      child: Container(
        padding: const EdgeInsets.all(20),
        decoration: BoxDecoration(
          color: Theme.of(context).cardTheme.color ?? Theme.of(context).colorScheme.surface,
          borderRadius: BorderRadius.circular(16),
          border: Border.all(color: Theme.of(context).dividerColor),
          boxShadow: [BoxShadow(color: Colors.black.withValues(alpha: 0.02), blurRadius: 8, offset: const Offset(0, 4))],
        ),
        child: Row(
          children: [
            Container(
              width: 48,
              height: 48,
              decoration: BoxDecoration(
                color: Theme.of(context).colorScheme.primary.withValues(alpha: 0.1),
                shape: BoxShape.circle,
              ),
              alignment: Alignment.center,
              child: Text(customer['name'][0], style: GoogleFonts.inter(color: Theme.of(context).colorScheme.primary, fontSize: 20, fontWeight: FontWeight.w800)),
            ),
            const SizedBox(width: 16),
            Expanded(
              child: Column(
                crossAxisAlignment: CrossAxisAlignment.start,
                children: [
                  Text(customer['name'], style: GoogleFonts.inter(fontSize: 16, fontWeight: FontWeight.w800, color: (Theme.of(context).textTheme.bodyMedium?.color ?? Colors.black))),
                  const SizedBox(height: 4),
                  Row(
                    children: [
                      Icon(Icons.phone_outlined, size: 12, color: (Theme.of(context).textTheme.bodyMedium?.color?.withValues(alpha: 0.6) ?? Colors.grey)),
                      const SizedBox(width: 4),
                      Text('${customer['phone']} • ID: ${customer['id'].toString().substring(0, 8)}', style: GoogleFonts.inter(fontSize: 13, color: (Theme.of(context).textTheme.bodyMedium?.color?.withValues(alpha: 0.6) ?? Colors.grey), fontWeight: FontWeight.w600)),
                    ],
                  )
                ],
              ),
            ),
            Column(
              crossAxisAlignment: CrossAxisAlignment.end,
              children: [
                Row(
                  children: [
                    Text(AppCurrency.format(customer['credit']), style: GoogleFonts.inter(color: Theme.of(context).colorScheme.secondary, fontWeight: FontWeight.w800, fontSize: 15)),
                    const SizedBox(width: 8),
                    IconButton(
                      icon: Icon(Icons.account_balance_wallet_outlined, size: 20, color: Theme.of(context).colorScheme.primary),
                      onPressed: () => _showCreditLedger(context, customer),
                      tooltip: 'View Credit Ledger',
                      padding: EdgeInsets.zero,
                      constraints: const BoxConstraints(),
                    ),
                  ],
                ),
                const SizedBox(height: 4),
                Text('${customer['loyaltyPoints']} Points', style: GoogleFonts.inter(fontSize: 12, color: const Color(0xFFF59E0B), fontWeight: FontWeight.w700)),
              ],
            ),
          ],
        ),
      ),
    );
  }
}

class _CustomerCreditLedgerDialog extends ConsumerStatefulWidget {
  final dynamic customer;

  const _CustomerCreditLedgerDialog({required this.customer});

  @override
  ConsumerState<_CustomerCreditLedgerDialog> createState() => _CustomerCreditLedgerDialogState();
}

class _CustomerCreditLedgerDialogState extends ConsumerState<_CustomerCreditLedgerDialog> {
  List<dynamic>? _history;
  bool _isLoading = true;
  String? _error;

  @override
  void initState() {
    super.initState();
    _loadHistory();
  }
  Future<void> _loadHistory() async {
    setState(() { _isLoading = true; _error = null; });
    try {
      final repo = ref.read(cashierRepositoryProvider);
      final data = await repo.getCustomerCreditHistory(widget.customer['id']);
      setState(() { _history = data; _isLoading = false; });
    } catch (e) {
      setState(() { _error = e.toString(); _isLoading = false; });
    }
  }

  Future<void> _addCredit(String type) async {
    final amountController = TextEditingController();
    final notesController = TextEditingController();

    await showDialog(
      context: context,
      builder: (ctx) => AlertDialog(
        title: Text(type == 'ADD' ? 'Add Credit' : 'Deduct Credit', style: GoogleFonts.inter(fontWeight: FontWeight.w800)),
        content: Column(
          mainAxisSize: MainAxisSize.min,
          children: [
            TextField(
              controller: amountController,
              decoration: const InputDecoration(labelText: 'Amount (Rs.)'),
              keyboardType: const TextInputType.numberWithOptions(decimal: true),
            ),
            const SizedBox(height: 16),
            TextField(
              controller: notesController,
              decoration: const InputDecoration(labelText: 'Notes'),
            ),
          ],
        ),
        actions: [
          TextButton(onPressed: () => Navigator.pop(ctx), child: const Text('Cancel')),
          ElevatedButton(
            onPressed: () async {
              final amount = double.tryParse(amountController.text);
              if (amount != null && amount > 0) {
                try {
                  final repo = ref.read(cashierRepositoryProvider);
                  await repo.addCustomerCredit(widget.customer['id'], amount, type, notesController.text);
                  if (!ctx.mounted) return;
                  Navigator.pop(ctx);
                  _loadHistory();
                } catch (e) {
                  if (!mounted) return;
                  ScaffoldMessenger.of(context).showSnackBar(SnackBar(content: Text('Error: $e')));
                }
              }
            },
            child: const Text('Confirm'),
          ),
        ],
      ),
    );
  }

  @override
  Widget build(BuildContext context) {
    return Dialog(
      child: Container(
        width: 500,
        padding: const EdgeInsets.all(24),
        child: Column(
          mainAxisSize: MainAxisSize.min,
          crossAxisAlignment: CrossAxisAlignment.stretch,
          children: [
            Row(
              mainAxisAlignment: MainAxisAlignment.spaceBetween,
              children: [
                Text('${widget.customer['name']}\'s Ledger', style: GoogleFonts.inter(fontSize: 20, fontWeight: FontWeight.bold)),
                IconButton(icon: const Icon(Icons.close), onPressed: () => Navigator.pop(context)),
              ],
            ),
            const SizedBox(height: 16),
            Row(
              children: [
                Expanded(
                  child: ElevatedButton.icon(
                    icon: const Icon(Icons.add),
                    label: const Text('Add Credit'),
                    onPressed: () => _addCredit('ADD'),
                    style: ElevatedButton.styleFrom(backgroundColor: Theme.of(context).colorScheme.primary, foregroundColor: Colors.white),
                  ),
                ),
                const SizedBox(width: 16),
                Expanded(
                  child: ElevatedButton.icon(
                    icon: const Icon(Icons.remove),
                    label: const Text('Deduct Credit'),
                    onPressed: () => _addCredit('DEDUCT'),
                    style: ElevatedButton.styleFrom(backgroundColor: Theme.of(context).colorScheme.error, foregroundColor: Colors.white),
                  ),
                ),
              ],
            ),
            const SizedBox(height: 24),
            Text('Transaction History', style: GoogleFonts.inter(fontWeight: FontWeight.bold)),
            const SizedBox(height: 8),
            _isLoading 
              ? const Center(child: Padding(padding: EdgeInsets.all(24), child: CircularProgressIndicator()))
              : _error != null
                ? Text(_error!, style: const TextStyle(color: Colors.red))
                : _history!.isEmpty
                  ? const Padding(padding: EdgeInsets.all(24), child: Text('No credit history found.'))
                  : ConstrainedBox(
                      constraints: const BoxConstraints(maxHeight: 300),
                      child: ListView.separated(
                        shrinkWrap: true,
                        itemCount: _history!.length,
                        separatorBuilder: (_, _) => const Divider(),
                        itemBuilder: (context, index) {
                          final h = _history![index];
                          final isAdd = h['type'] == 'ADD';
                          return ListTile(
                            leading: Icon(isAdd ? Icons.arrow_upward : Icons.arrow_downward, color: isAdd ? Colors.green : Colors.red),
                            title: Text('${isAdd ? '+' : '-'} ${AppCurrency.format(h['amount'])}', style: GoogleFonts.inter(fontWeight: FontWeight.bold)),
                            subtitle: Text(h['notes'] ?? ''),
                            trailing: Text(DateTime.parse(h['createdAt']).toLocal().toString().substring(0, 16)),
                          );
                        },
                      ),
                    ),
          ],
        ),
      ),
    );
  }
}
