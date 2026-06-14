import '../../../../core/utils/app_currency.dart';
import 'package:flutter/material.dart';
import 'package:flutter_riverpod/flutter_riverpod.dart';
import 'package:google_fonts/google_fonts.dart';
// lucide_icons removed - using built-in Icons.*

import '../providers/cashier_providers.dart';

// --- Theme Colors ---

class DailyClosingDialog extends ConsumerStatefulWidget {
  const DailyClosingDialog({super.key});

  @override
  ConsumerState<DailyClosingDialog> createState() => _DailyClosingDialogState();
}

class _DailyClosingDialogState extends ConsumerState<DailyClosingDialog> {
  final TextEditingController _actualCashController = TextEditingController();
  final TextEditingController _openingFloatController = TextEditingController(text: '0.00');
  bool _isProcessing = false;

  @override
  void dispose() {
    _actualCashController.dispose();
    _openingFloatController.dispose();
    super.dispose();
  }

  Future<void> _closeShift(String shiftId) async {
    final actualCash = double.tryParse(_actualCashController.text);
    if (actualCash == null) {
      ScaffoldMessenger.of(context).showSnackBar(const SnackBar(content: Text('Please enter valid actual cash')));
      return;
    }

    setState(() => _isProcessing = true);
    try {
      final repo = ref.read(cashierRepositoryProvider);
      await repo.closeShift(shiftId, actualCash);
      
      // Invalidate the provider so it fetches the (now missing/null) current shift
      ref.invalidate(currentShiftProvider);
      
      if (mounted) {
        Navigator.pop(context);
        ScaffoldMessenger.of(context).showSnackBar(const SnackBar(content: Text('Shift closed successfully!')));
      }
    } catch (e) {
      if (mounted) {
        ScaffoldMessenger.of(context).showSnackBar(SnackBar(content: Text('Failed to close shift: $e')));
      }
    } finally {
      if (mounted) setState(() => _isProcessing = false);
    }
  }

  @override
  Widget build(BuildContext context) {
    final shiftState = ref.watch(currentShiftProvider);

    return Dialog(
      backgroundColor: Colors.transparent,
      insetPadding: const EdgeInsets.all(16),
      child: SingleChildScrollView(
        child: Container(
          constraints: const BoxConstraints(maxWidth: 850),
          decoration: BoxDecoration(
            color: Theme.of(context).cardTheme.color ?? Theme.of(context).colorScheme.surface,
            borderRadius: BorderRadius.circular(32),
            boxShadow: [BoxShadow(color: Colors.black.withValues(alpha: 0.1), blurRadius: 40, offset: const Offset(0, 20))],
          ),
        child: shiftState.when(
          data: (shift) {
            if (shift == null) {
              return _buildNoOpenShift();
            }
            return _buildShiftDashboard(context, shift);
          },
          loading: () => const SizedBox(height: 400, child: Center(child: CircularProgressIndicator())),
          error: (err, _) => SizedBox(height: 400, child: Center(child: Text('Error: $err', style: GoogleFonts.inter(color: Theme.of(context).colorScheme.error)))),
        ),
      ),
      ),
    );
  }

  Widget _buildNoOpenShift() {
    return Padding(
      padding: const EdgeInsets.all(48),
      child: Column(
        mainAxisSize: MainAxisSize.min,
        children: [
          Container(
            padding: const EdgeInsets.all(32),
            decoration: BoxDecoration(color: Theme.of(context).colorScheme.primary.withValues(alpha: 0.1), shape: BoxShape.circle),
            child: Icon(Icons.store_outlined, size: 64, color: Theme.of(context).colorScheme.primary),
          ),
          const SizedBox(height: 32),
          Text('No Open Shift', style: GoogleFonts.inter(fontSize: 28, fontWeight: FontWeight.w800, color: (Theme.of(context).textTheme.bodyMedium?.color ?? Colors.black))),
          const SizedBox(height: 12),
          Text('You need to open a shift to process sales.', style: GoogleFonts.inter(color: (Theme.of(context).textTheme.bodyMedium?.color?.withValues(alpha: 0.6) ?? Colors.grey), fontSize: 16, fontWeight: FontWeight.w600)),
          const SizedBox(height: 40),
          SizedBox(
            width: 300,
            child: Column(
              crossAxisAlignment: CrossAxisAlignment.start,
              children: [
                Text('Opening Float Amount:', style: GoogleFonts.inter(fontSize: 14, fontWeight: FontWeight.w700, color: (Theme.of(context).textTheme.bodyMedium?.color ?? Colors.black))),
                const SizedBox(height: 8),
                TextField(
                  controller: _openingFloatController,
                  keyboardType: const TextInputType.numberWithOptions(decimal: true),
                  textAlign: TextAlign.left,
                  style: GoogleFonts.inter(fontSize: 24, fontWeight: FontWeight.w800, color: Theme.of(context).colorScheme.primary),
                  decoration: InputDecoration(
                    prefixText: '\$ ',
                    prefixStyle: GoogleFonts.inter(fontSize: 24, fontWeight: FontWeight.w800, color: Theme.of(context).colorScheme.primary),
                    filled: true,
                    fillColor: Theme.of(context).cardTheme.color ?? Theme.of(context).colorScheme.surface,
                    border: OutlineInputBorder(borderRadius: BorderRadius.circular(16), borderSide: BorderSide(color: Theme.of(context).dividerColor)),
                    enabledBorder: OutlineInputBorder(borderRadius: BorderRadius.circular(16), borderSide: BorderSide(color: Theme.of(context).dividerColor)),
                    contentPadding: const EdgeInsets.symmetric(horizontal: 16, vertical: 16),
                  ),
                ),
              ],
            ),
          ),
          const SizedBox(height: 24),
          SizedBox(
            height: 60,
            width: 300,
            child: ElevatedButton(
              onPressed: _isProcessing ? null : () async {
                final openingFloat = double.tryParse(_openingFloatController.text);
                if (openingFloat == null || openingFloat < 0) {
                  ScaffoldMessenger.of(context).showSnackBar(const SnackBar(content: Text('Please enter a valid positive amount')));
                  return;
                }

                setState(() => _isProcessing = true);
                try {
                  final repo = ref.read(cashierRepositoryProvider);
                  await repo.createShift('mock-cashier-id', openingFloat);
                  ref.invalidate(currentShiftProvider);
                  if (!mounted) return;
                  ScaffoldMessenger.of(context).showSnackBar(const SnackBar(content: Text('Shift started successfully!')));
                } catch (e) {
                  if (!mounted) return;
                  ScaffoldMessenger.of(context).showSnackBar(SnackBar(content: Text('Failed to start shift: $e')));
                } finally {
                  if (mounted) setState(() => _isProcessing = false);
                }
              },
              style: ElevatedButton.styleFrom(
                backgroundColor: Theme.of(context).colorScheme.primary,
                foregroundColor: Colors.white,
                shape: RoundedRectangleBorder(borderRadius: BorderRadius.circular(16)),
                elevation: 0,
              ),
              child: _isProcessing 
                ? const SizedBox(width: 24, height: 24, child: CircularProgressIndicator(color: Colors.white, strokeWidth: 2))
                : Text('Start Shift', style: GoogleFonts.inter(fontSize: 16, fontWeight: FontWeight.w800)),
            ),
          ),
        ],
      ),
    );
  }

  Widget _buildShiftDashboard(BuildContext context, Map<String, dynamic> shift) {
    final expectedCash = (shift['openingCash'] as num) + (shift['expectedCash'] as num? ?? 0);
    final isMobile = MediaQuery.of(context).size.width < 600;
    
    return Padding(
      padding: EdgeInsets.all(isMobile ? 24 : 40),
      child: Column(
        mainAxisSize: MainAxisSize.min,
        crossAxisAlignment: CrossAxisAlignment.stretch,
        children: [
          // Header
          Row(
            mainAxisAlignment: MainAxisAlignment.spaceBetween,
            children: [
              Expanded(
                child: Row(
                  children: [
                    Container(
                      padding: const EdgeInsets.all(12),
                      decoration: BoxDecoration(color: Theme.of(context).colorScheme.primary.withValues(alpha: 0.1), borderRadius: BorderRadius.circular(12)),
                      child: Icon(Icons.bar_chart_outlined, color: Theme.of(context).colorScheme.primary),
                    ),
                    const SizedBox(width: 16),
                    Expanded(child: Text('Daily Closing Dashboard', style: GoogleFonts.inter(fontSize: isMobile ? 20 : 24, fontWeight: FontWeight.w800, color: (Theme.of(context).textTheme.bodyMedium?.color ?? Colors.black)))),
                  ],
                ),
              ),
              IconButton(
                icon: Icon(Icons.close, color: (Theme.of(context).textTheme.bodyMedium?.color?.withValues(alpha: 0.6) ?? Colors.grey)),
                onPressed: () => Navigator.pop(context),
              ),
            ],
          ),
          const SizedBox(height: 32),

          // Stats Grid
          if (isMobile)
            Column(
              children: [
                Row(
                  children: [
                    Expanded(child: _buildStatCard('Today\'s Sales', AppCurrency.format(shift['totalSales'] as num? ?? 0), Icons.payments_outlined, Theme.of(context).colorScheme.secondary)),
                    const SizedBox(width: 16),
                    Expanded(child: _buildStatCard('Total Orders', '${shift['totalOrders'] ?? 0}', Icons.receipt_long_outlined, Theme.of(context).colorScheme.primary)),
                  ],
                ),
                const SizedBox(height: 16),
                Row(
                  children: [
                    Expanded(child: _buildStatCard('Card Payments', AppCurrency.format(shift['cardPayments'] as num? ?? 0), Icons.credit_card, const Color(0xFF8B5CF6))),
                    const SizedBox(width: 16),
                    Expanded(child: _buildStatCard('Credit Sales', AppCurrency.format(shift['creditSales'] as num? ?? 0), Icons.account_balance_wallet_outlined, Colors.orange)),
                  ],
                ),
              ],
            )
          else
            Row(
              children: [
                Expanded(child: _buildStatCard('Today\'s Sales', AppCurrency.format(shift['totalSales'] as num? ?? 0), Icons.payments_outlined, Theme.of(context).colorScheme.secondary)),
                const SizedBox(width: 16),
                Expanded(child: _buildStatCard('Total Orders', '${shift['totalOrders'] ?? 0}', Icons.receipt_long_outlined, Theme.of(context).colorScheme.primary)),
                const SizedBox(width: 16),
                Expanded(child: _buildStatCard('Card Payments', AppCurrency.format(shift['cardPayments'] as num? ?? 0), Icons.credit_card, const Color(0xFF8B5CF6))),
                const SizedBox(width: 16),
                Expanded(child: _buildStatCard('Credit Sales', AppCurrency.format(shift['creditSales'] as num? ?? 0), Icons.account_balance_wallet_outlined, Colors.orange)),
              ],
            ),
          const SizedBox(height: 32),

          // Cash Drawer Section
          Container(
            padding: const EdgeInsets.all(32),
            decoration: BoxDecoration(
              color: Theme.of(context).scaffoldBackgroundColor,
              borderRadius: BorderRadius.circular(24),
              border: Border.all(color: Theme.of(context).dividerColor),
            ),
            child: Column(
              crossAxisAlignment: CrossAxisAlignment.start,
              children: [
                Row(
                  children: [
                    Icon(Icons.calculate_outlined, color: (Theme.of(context).textTheme.bodyMedium?.color?.withValues(alpha: 0.6) ?? Colors.grey), size: 20),
                    const SizedBox(width: 12),
                    Expanded(child: Text('Cash Drawer Reconciliation', style: GoogleFonts.inter(fontSize: 18, fontWeight: FontWeight.w800, color: (Theme.of(context).textTheme.bodyMedium?.color ?? Colors.black)))),
                  ],
                ),
                const SizedBox(height: 24),
                Row(
                  mainAxisAlignment: MainAxisAlignment.spaceBetween,
                  children: [
                    Text('Opening Float:', style: GoogleFonts.inter(color: (Theme.of(context).textTheme.bodyMedium?.color?.withValues(alpha: 0.6) ?? Colors.grey), fontWeight: FontWeight.w600, fontSize: 16)),
                    Text(AppCurrency.format((shift['openingCash'] as num)), style: GoogleFonts.inter(fontWeight: FontWeight.w800, color: (Theme.of(context).textTheme.bodyMedium?.color ?? Colors.black), fontSize: 18)),
                  ],
                ),
                const SizedBox(height: 12),
                if (isMobile)
                  Column(
                    crossAxisAlignment: CrossAxisAlignment.start,
                    children: [
                      Text('Expected Cash:', style: GoogleFonts.inter(color: (Theme.of(context).textTheme.bodyMedium?.color?.withValues(alpha: 0.6) ?? Colors.grey), fontWeight: FontWeight.w600, fontSize: 16)),
                      const SizedBox(height: 4),
                      Text(AppCurrency.format(expectedCash), style: GoogleFonts.inter(fontWeight: FontWeight.w800, color: Theme.of(context).colorScheme.primary, fontSize: 18)),
                    ],
                  )
                else
                  Row(
                    mainAxisAlignment: MainAxisAlignment.spaceBetween,
                    children: [
                      Text('Expected Cash (Float + Cash Sales):', style: GoogleFonts.inter(color: (Theme.of(context).textTheme.bodyMedium?.color?.withValues(alpha: 0.6) ?? Colors.grey), fontWeight: FontWeight.w600, fontSize: 16)),
                      Text(AppCurrency.format(expectedCash), style: GoogleFonts.inter(fontWeight: FontWeight.w800, color: Theme.of(context).colorScheme.primary, fontSize: 18)),
                    ],
                  ),
                Padding(
                  padding: const EdgeInsets.symmetric(vertical: 24),
                  child: Divider(height: 1, color: Theme.of(context).dividerColor),
                ),
                isMobile 
                  ? Column(
                      crossAxisAlignment: CrossAxisAlignment.start,
                      children: [
                        Text('Actual Cash Counted:', style: GoogleFonts.inter(fontSize: 18, fontWeight: FontWeight.w800, color: (Theme.of(context).textTheme.bodyMedium?.color ?? Colors.black))),
                        const SizedBox(height: 12),
                        TextField(
                          controller: _actualCashController,
                          keyboardType: const TextInputType.numberWithOptions(decimal: true),
                          textAlign: TextAlign.left,
                          style: GoogleFonts.inter(fontSize: 24, fontWeight: FontWeight.w800, color: Theme.of(context).colorScheme.secondary),
                          decoration: InputDecoration(
                            prefixText: '\$ ',
                            prefixStyle: GoogleFonts.inter(fontSize: 24, fontWeight: FontWeight.w800, color: Theme.of(context).colorScheme.secondary),
                            filled: true,
                            fillColor: Theme.of(context).cardTheme.color ?? Theme.of(context).colorScheme.surface,
                            border: OutlineInputBorder(borderRadius: BorderRadius.circular(16), borderSide: BorderSide(color: Theme.of(context).dividerColor)),
                            enabledBorder: OutlineInputBorder(borderRadius: BorderRadius.circular(16), borderSide: BorderSide(color: Theme.of(context).dividerColor)),
                            contentPadding: const EdgeInsets.symmetric(horizontal: 16, vertical: 16),
                          ),
                        ),
                      ],
                    )
                  : Row(
                      children: [
                        Expanded(
                          flex: 2,
                          child: Text('Actual Cash Counted:', style: GoogleFonts.inter(fontSize: 18, fontWeight: FontWeight.w800, color: (Theme.of(context).textTheme.bodyMedium?.color ?? Colors.black))),
                        ),
                        Expanded(
                          flex: 1,
                          child: TextField(
                            controller: _actualCashController,
                            keyboardType: const TextInputType.numberWithOptions(decimal: true),
                            textAlign: TextAlign.right,
                            style: GoogleFonts.inter(fontSize: 24, fontWeight: FontWeight.w800, color: Theme.of(context).colorScheme.secondary),
                            decoration: InputDecoration(
                              prefixText: '\$ ',
                              prefixStyle: GoogleFonts.inter(fontSize: 24, fontWeight: FontWeight.w800, color: Theme.of(context).colorScheme.secondary),
                              filled: true,
                              fillColor: Theme.of(context).cardTheme.color ?? Theme.of(context).colorScheme.surface,
                              border: OutlineInputBorder(borderRadius: BorderRadius.circular(16), borderSide: BorderSide(color: Theme.of(context).dividerColor)),
                              enabledBorder: OutlineInputBorder(borderRadius: BorderRadius.circular(16), borderSide: BorderSide(color: Theme.of(context).dividerColor)),
                              contentPadding: const EdgeInsets.symmetric(horizontal: 16, vertical: 16),
                            ),
                          ),
                        ),
                      ],
                    ),
              ],
            ),
          ),
          const SizedBox(height: 40),

          // Actions
          isMobile
            ? Column(
                crossAxisAlignment: CrossAxisAlignment.stretch,
                children: [
                  OutlinedButton.icon(
                    onPressed: () {},
                    icon: const Icon(Icons.print_outlined, size: 20),
                    label: FittedBox(fit: BoxFit.scaleDown, child: Text('Print Report', style: GoogleFonts.inter(fontWeight: FontWeight.w700))),
                    style: OutlinedButton.styleFrom(
                      foregroundColor: (Theme.of(context).textTheme.bodyMedium?.color ?? Colors.black),
                      padding: const EdgeInsets.symmetric(horizontal: 16, vertical: 16),
                      side: BorderSide(color: Theme.of(context).dividerColor, width: 2),
                      shape: RoundedRectangleBorder(borderRadius: BorderRadius.circular(16)),
                    ),
                  ),
                  const SizedBox(height: 16),
                  ElevatedButton.icon(
                    onPressed: _isProcessing ? null : () => _closeShift(shift['id']),
                    icon: _isProcessing ? const SizedBox(width: 20, height: 20, child: CircularProgressIndicator(color: Colors.white, strokeWidth: 2)) : const Icon(Icons.check_box_outlined, size: 20),
                    label: FittedBox(fit: BoxFit.scaleDown, child: Text(_isProcessing ? 'Processing...' : 'Close Shift', style: GoogleFonts.inter(fontWeight: FontWeight.w800))),
                    style: ElevatedButton.styleFrom(
                      backgroundColor: Theme.of(context).colorScheme.error,
                      foregroundColor: Colors.white,
                      padding: const EdgeInsets.symmetric(horizontal: 16, vertical: 16),
                      shape: RoundedRectangleBorder(borderRadius: BorderRadius.circular(16)),
                      elevation: 0,
                    ),
                  ),
                ],
              )
            : Row(
                mainAxisAlignment: MainAxisAlignment.end,
                children: [
                  OutlinedButton.icon(
                    onPressed: () {},
                    icon: const Icon(Icons.print_outlined, size: 20),
                    label: Text('Print Report', style: GoogleFonts.inter(fontWeight: FontWeight.w700)),
                    style: OutlinedButton.styleFrom(
                      foregroundColor: (Theme.of(context).textTheme.bodyMedium?.color ?? Colors.black),
                      padding: const EdgeInsets.symmetric(horizontal: 24, vertical: 20),
                      side: BorderSide(color: Theme.of(context).dividerColor, width: 2),
                      shape: RoundedRectangleBorder(borderRadius: BorderRadius.circular(16)),
                    ),
                  ),
                  const SizedBox(width: 16),
                  ElevatedButton.icon(
                    onPressed: _isProcessing ? null : () => _closeShift(shift['id']),
                    icon: _isProcessing ? const SizedBox(width: 20, height: 20, child: CircularProgressIndicator(color: Colors.white, strokeWidth: 2)) : const Icon(Icons.check_box_outlined, size: 20),
                    label: Text(_isProcessing ? 'Processing...' : 'Close Shift', style: GoogleFonts.inter(fontWeight: FontWeight.w800)),
                    style: ElevatedButton.styleFrom(
                      backgroundColor: Theme.of(context).colorScheme.error,
                      foregroundColor: Colors.white,
                      padding: const EdgeInsets.symmetric(horizontal: 32, vertical: 20),
                      shape: RoundedRectangleBorder(borderRadius: BorderRadius.circular(16)),
                      elevation: 0,
                    ),
                  ),
                ],
              ),
        ],
      ),
    );
  }

  Widget _buildStatCard(String title, String value, IconData icon, Color color) {
    return Container(
      padding: const EdgeInsets.all(20),
      decoration: BoxDecoration(
        color: color.withValues(alpha: 0.05),
        borderRadius: BorderRadius.circular(20),
        border: Border.all(color: color.withValues(alpha: 0.1)),
      ),
      child: Column(
        crossAxisAlignment: CrossAxisAlignment.start,
        children: [
          Row(
            children: [
              Icon(icon, color: color, size: 20),
              const SizedBox(width: 8),
              Expanded(child: Text(title, style: GoogleFonts.inter(fontSize: 13, fontWeight: FontWeight.w700, color: (Theme.of(context).textTheme.bodyMedium?.color?.withValues(alpha: 0.6) ?? Colors.grey)), overflow: TextOverflow.ellipsis)),
            ],
          ),
          const SizedBox(height: 12),
          Text(value, style: GoogleFonts.inter(fontSize: 24, fontWeight: FontWeight.w800, color: (Theme.of(context).textTheme.bodyMedium?.color ?? Colors.black))),
        ],
      ),
    );
  }
}
