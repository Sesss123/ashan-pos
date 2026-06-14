import 'package:dio/dio.dart';
import 'package:flutter/material.dart';
import 'package:flutter_animate/flutter_animate.dart';
import 'package:flutter_riverpod/flutter_riverpod.dart';
import 'package:google_fonts/google_fonts.dart';
import '../../../../core/network/dio_client.dart';
import '../providers/cart_provider.dart';

/// A reusable bottom sheet that lets a Cashier search a customer by phone or name,
/// then attach them to the cart for Credit billing.
class CustomerSearchSheet extends ConsumerStatefulWidget {
  const CustomerSearchSheet({super.key});

  @override
  ConsumerState<CustomerSearchSheet> createState() => _CustomerSearchSheetState();
}

class _CustomerSearchSheetState extends ConsumerState<CustomerSearchSheet> {
  final _controller = TextEditingController();
  List<dynamic> _results = [];
  bool _loading = false;
  String? _error;

  Future<void> _search(String query) async {
    if (query.length < 2) return;
    setState(() { _loading = true; _error = null; });

    try {
      final dio = ref.read(dioClientProvider).dio;
      final param = RegExp(r'^\d').hasMatch(query)
          ? {'phone': query}  // starts with digit → phone search
          : {'name': query};  // otherwise → name search
      final res = await dio.get('/customers/search', queryParameters: param);
      setState(() {
        _results = res.data['data'] as List<dynamic>;
        _loading = false;
      });
    } on DioException catch (e) {
      setState(() { _error = e.response?.data?['message'] ?? 'Search failed'; _loading = false; });
    }
  }

  void _selectCustomer(Map<String, dynamic> customer) {
    ref.read(cartProvider.notifier).selectCustomer(
      id: customer['id'],
      name: customer['name'],
      creditBalance: (customer['credit'] as num).toDouble(),
    );
    Navigator.pop(context, customer);
  }

  @override
  void dispose() {
    _controller.dispose();
    super.dispose();
  }

  @override
  Widget build(BuildContext context) {
    final isDark = Theme.of(context).brightness == Brightness.dark;
    return Container(
      decoration: BoxDecoration(
        color: Theme.of(context).scaffoldBackgroundColor,
        borderRadius: const BorderRadius.vertical(top: Radius.circular(24)),
      ),
      padding: EdgeInsets.only(
        left: 20, right: 20, top: 20,
        bottom: MediaQuery.of(context).viewInsets.bottom + 20,
      ),
      child: Column(
        mainAxisSize: MainAxisSize.min,
        crossAxisAlignment: CrossAxisAlignment.start,
        children: [
          // Handle
          Center(
            child: Container(
              width: 40, height: 4,
              margin: const EdgeInsets.only(bottom: 16),
              decoration: BoxDecoration(
                color: Colors.grey[400],
                borderRadius: BorderRadius.circular(2),
              ),
            ),
          ),
          Text('Find Customer',
              style: GoogleFonts.inter(fontSize: 20, fontWeight: FontWeight.w800,
                  color: Theme.of(context).textTheme.bodyMedium?.color)),
          const SizedBox(height: 4),
          Text('Search by phone number or name for credit billing',
              style: GoogleFonts.inter(fontSize: 13, color: Colors.grey[600])),
          const SizedBox(height: 16),

          // Search field
          TextField(
            controller: _controller,
            autofocus: true,
            keyboardType: TextInputType.text,
            style: GoogleFonts.inter(),
            decoration: InputDecoration(
              hintText: 'Phone (077...) or customer name',
              hintStyle: GoogleFonts.inter(color: Colors.grey[500]),
              prefixIcon: Icon(Icons.search, color: Theme.of(context).colorScheme.primary),
              suffixIcon: _loading
                  ? const Padding(
                      padding: EdgeInsets.all(12),
                      child: SizedBox(width: 20, height: 20,
                          child: CircularProgressIndicator(strokeWidth: 2)))
                  : null,
              filled: true,
              fillColor: isDark
                  ? Colors.white.withValues(alpha: 0.05)
                  : Colors.grey.shade100,
              border: OutlineInputBorder(
                borderRadius: BorderRadius.circular(14),
                borderSide: BorderSide.none,
              ),
              focusedBorder: OutlineInputBorder(
                borderRadius: BorderRadius.circular(14),
                borderSide: BorderSide(color: Theme.of(context).colorScheme.primary, width: 2),
              ),
            ),
            onChanged: (v) => _search(v.trim()),
          ),
          const SizedBox(height: 12),

          if (_error != null)
            Text(_error!, style: GoogleFonts.inter(color: Colors.red[400], fontSize: 13)),

          // Results
          if (_results.isNotEmpty)
            ListView.builder(
              shrinkWrap: true,
              physics: const NeverScrollableScrollPhysics(),
              itemCount: _results.length,
              itemBuilder: (ctx, i) {
                final c = _results[i] as Map<String, dynamic>;
                final credit = (c['credit'] as num?)?.toDouble() ?? 0.0;
                return GestureDetector(
                  onTap: () => _selectCustomer(c),
                  child: Container(
                    margin: const EdgeInsets.only(bottom: 10),
                    padding: const EdgeInsets.all(14),
                    decoration: BoxDecoration(
                      color: Theme.of(context).cardTheme.color ??
                          Theme.of(context).colorScheme.surface,
                      borderRadius: BorderRadius.circular(14),
                      border: Border.all(color: Theme.of(context).dividerColor),
                    ),
                    child: Row(
                      children: [
                        CircleAvatar(
                          backgroundColor: Theme.of(context).colorScheme.primary.withValues(alpha: 0.1),
                          child: Text(
                            c['name']?.toString().substring(0, 1).toUpperCase() ?? '?',
                            style: GoogleFonts.inter(
                                fontWeight: FontWeight.w800,
                                color: Theme.of(context).colorScheme.primary),
                          ),
                        ),
                        const SizedBox(width: 12),
                        Expanded(
                          child: Column(
                            crossAxisAlignment: CrossAxisAlignment.start,
                            children: [
                              Text(c['name'] ?? '',
                                  style: GoogleFonts.inter(fontWeight: FontWeight.w700)),
                              Text(c['phone'] ?? '',
                                  style: GoogleFonts.inter(color: Colors.grey[600], fontSize: 13)),
                            ],
                          ),
                        ),
                        Column(
                          crossAxisAlignment: CrossAxisAlignment.end,
                          children: [
                            Text('Credit', style: GoogleFonts.inter(fontSize: 11, color: Colors.grey[500])),
                            Text('LKR ${credit.toStringAsFixed(2)}',
                                style: GoogleFonts.inter(
                                    fontWeight: FontWeight.w800,
                                    color: credit > 0 ? Colors.green[700] : Colors.red[400],
                                    fontSize: 13)),
                          ],
                        ),
                      ],
                    ),
                  ).animate().fadeIn(delay: Duration(milliseconds: 50 * i)),
                );
              },
            ),
          if (_results.isEmpty && !_loading && _controller.text.length >= 2)
            Center(
              child: Padding(
                padding: const EdgeInsets.all(20),
                child: Text('No customers found for "${_controller.text}"',
                    style: GoogleFonts.inter(color: Colors.grey[600])),
              ),
            ),
        ],
      ),
    );
  }
}

/// Open the customer search bottom sheet.
/// Returns the selected customer map, or null if dismissed.
Future<Map<String, dynamic>?> showCustomerSearchSheet(BuildContext context) {
  return showModalBottomSheet<Map<String, dynamic>>(
    context: context,
    isScrollControlled: true,
    backgroundColor: Colors.transparent,
    builder: (_) => const CustomerSearchSheet(),
  );
}
