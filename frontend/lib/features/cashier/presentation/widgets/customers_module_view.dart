import '../../../../core/utils/app_currency.dart';
import 'package:flutter/material.dart';
import 'package:flutter_riverpod/flutter_riverpod.dart';
import 'package:google_fonts/google_fonts.dart';

import '../providers/cashier_providers.dart';

class CustomersModuleView extends ConsumerStatefulWidget {
  const CustomersModuleView({super.key});

  @override
  ConsumerState<CustomersModuleView> createState() => _CustomersModuleViewState();
}

// Dummy data removed per user request

class _CustomersModuleViewState extends ConsumerState<CustomersModuleView> {
  final TextEditingController _searchController = TextEditingController();

  @override
  void dispose() {
    _searchController.dispose();
    super.dispose();
  }

  void _onSearch(String query) {
    ref.read(customerSearchProvider.notifier).search(query);
  }

  void _showAddCreditDialog(Map<String, dynamic> customer) {
    final amountController = TextEditingController();
    final notesController = TextEditingController();

    showDialog(
      context: context,
      builder: (ctx) => AlertDialog(
        title: Text('Add Credit to ${customer['name']}'),
        content: Column(
          mainAxisSize: MainAxisSize.min,
          children: [
            TextField(
              controller: amountController,
              decoration: const InputDecoration(labelText: 'Amount (\$)'),
              keyboardType: TextInputType.number,
            ),
            const SizedBox(height: 16),
            TextField(
              controller: notesController,
              decoration: const InputDecoration(labelText: 'Notes'),
            ),
          ],
        ),
        actions: [
          TextButton(
            onPressed: () => Navigator.pop(ctx),
            child: const Text('Cancel'),
          ),
          ElevatedButton(
            onPressed: () async {
              final amount = double.tryParse(amountController.text) ?? 0;
              if (amount > 0) {
                // Call API via repository
                final repo = ref.read(cashierRepositoryProvider);
                await repo.addCustomerCredit(
                  customer['id'], 
                  amount, 
                  'ADD', 
                  notesController.text
                );
                // Refresh search
                _onSearch(_searchController.text);
                if (!ctx.mounted) return;
                Navigator.pop(ctx);
              }
            },
            child: const Text('Add Credit'),
          ),
        ],
      ),
    );
  }

  @override
  Widget build(BuildContext context) {
    final searchState = ref.watch(customerSearchProvider);

    return Container(
      color: Theme.of(context).scaffoldBackgroundColor,
      padding: const EdgeInsets.all(24),
      child: Column(
        crossAxisAlignment: CrossAxisAlignment.start,
        children: [
          Text(
            'Customer Management',
            style: GoogleFonts.inter(
              fontSize: 24, 
              fontWeight: FontWeight.w800, 
              color: Theme.of(context).textTheme.bodyMedium?.color
            ),
          ),
          const SizedBox(height: 24),
          Container(
            decoration: BoxDecoration(
              boxShadow: [
                BoxShadow(
                  color: Colors.black.withValues(alpha: 0.1),
                  blurRadius: 10,
                  offset: const Offset(0, 4),
                )
              ],
            ),
            child: TextField(
              controller: _searchController,
              onChanged: _onSearch,
              style: GoogleFonts.inter(),
              decoration: InputDecoration(
                hintText: 'Search by Name or Phone...',
                prefixIcon: Icon(Icons.search, color: Theme.of(context).colorScheme.primary),
                border: OutlineInputBorder(
                  borderRadius: BorderRadius.circular(16),
                  borderSide: BorderSide.none,
                ),
                filled: true,
                fillColor: Theme.of(context).cardTheme.color ?? Theme.of(context).colorScheme.surface,
                contentPadding: const EdgeInsets.symmetric(vertical: 20),
              ),
            ),
          ),
          const SizedBox(height: 24),
          Expanded(
            child: searchState.when(
              data: (customers) {
                final displayCustomers = customers;

                if (displayCustomers.isEmpty) {
                  return Center(
                    child: Column(
                      mainAxisAlignment: MainAxisAlignment.center,
                      children: [
                        Icon(Icons.search_off, size: 64, color: Colors.grey.withValues(alpha: 0.5)),
                        const SizedBox(height: 16),
                        Text('No customers found.', style: GoogleFonts.inter(fontSize: 18, color: Colors.grey)),
                      ],
                    ),
                  );
                }
                
                return ListView.separated(
                  itemCount: displayCustomers.length,
                  separatorBuilder: (_, _) => const SizedBox(height: 16),
                  itemBuilder: (context, index) {
                    final customer = displayCustomers[index];
                    return Container(
                      decoration: BoxDecoration(
                        color: Theme.of(context).cardTheme.color ?? Theme.of(context).colorScheme.surface,
                        borderRadius: BorderRadius.circular(16),
                        border: Border.all(color: Theme.of(context).dividerColor.withValues(alpha: 0.5), width: 1.5),
                        boxShadow: [
                          BoxShadow(color: Colors.black.withValues(alpha: 0.02), blurRadius: 10, offset: const Offset(0, 4)),
                        ],
                      ),
                      child: ListTile(
                        contentPadding: const EdgeInsets.symmetric(horizontal: 24, vertical: 12),
                        leading: Container(
                          padding: const EdgeInsets.all(12),
                          decoration: BoxDecoration(
                            color: Theme.of(context).colorScheme.primaryContainer,
                            shape: BoxShape.circle,
                          ),
                          child: Icon(Icons.person, color: Theme.of(context).colorScheme.primary),
                        ),
                        title: Text(customer['name'] ?? '', style: GoogleFonts.inter(fontSize: 18, fontWeight: FontWeight.w700)),
                        subtitle: Padding(
                          padding: const EdgeInsets.only(top: 4.0),
                          child: Text(customer['phone'] ?? '', style: GoogleFonts.inter(color: Colors.grey)),
                        ),
                        trailing: Row(
                          mainAxisSize: MainAxisSize.min,
                          children: [
                            Column(
                              mainAxisAlignment: MainAxisAlignment.center,
                              crossAxisAlignment: CrossAxisAlignment.end,
                              children: [
                                Text(
                                  'Credit: ${AppCurrency.format((customer['credit'] ?? 0))}',
                                  style: GoogleFonts.inter(fontWeight: FontWeight.w800, color: Colors.green, fontSize: 16),
                                ),
                                const SizedBox(height: 4),
                                Container(
                                  padding: const EdgeInsets.symmetric(horizontal: 8, vertical: 2),
                                  decoration: BoxDecoration(
                                    color: Colors.orange.withValues(alpha: 0.1),
                                    borderRadius: BorderRadius.circular(8),
                                  ),
                                  child: Text(
                                    'Points: ${customer['loyaltyPoints'] ?? 0}',
                                    style: GoogleFonts.inter(fontSize: 12, fontWeight: FontWeight.w700, color: Colors.orange),
                                  ),
                                ),
                              ],
                            ),
                            const SizedBox(width: 24),
                            ElevatedButton.icon(
                              icon: const Icon(Icons.add_card, size: 18),
                              label: const Text('Add Credit'),
                              style: ElevatedButton.styleFrom(
                                backgroundColor: Theme.of(context).colorScheme.primary.withValues(alpha: 0.1),
                                foregroundColor: Theme.of(context).colorScheme.primary,
                                elevation: 0,
                                shape: RoundedRectangleBorder(borderRadius: BorderRadius.circular(12)),
                                padding: const EdgeInsets.symmetric(horizontal: 16, vertical: 12),
                              ),
                              onPressed: () => _showAddCreditDialog(customer),
                            ),
                          ],
                        ),
                      ),
                    );
                  },
                );
              },
              loading: () => const Center(child: CircularProgressIndicator()),
              error: (e, _) => Center(child: Text('Error: $e')),
            ),
          ),
        ],
      ),
    );
  }
}
