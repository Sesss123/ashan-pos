import '../../../../core/utils/app_currency.dart';
import 'package:flutter/material.dart';
import 'package:flutter_riverpod/flutter_riverpod.dart';
import 'package:flutter_animate/flutter_animate.dart';
import 'package:google_fonts/google_fonts.dart';
// lucide_icons removed - using built-in Icons.*

import '../../domain/models/order.dart';
import '../providers/cart_provider.dart';
import 'qr_payment_view.dart';
import '../../../../core/utils/bluetooth_printer_service.dart';

// --- Theme Colors ---

class CheckoutDialog extends ConsumerStatefulWidget {
  final double grandTotal;

  const CheckoutDialog({super.key, required this.grandTotal});

  @override
  ConsumerState<CheckoutDialog> createState() => _CheckoutDialogState();
}

class _CheckoutDialogState extends ConsumerState<CheckoutDialog> {
  PaymentMethod _selectedMethod = PaymentMethod.cash;
  
  // Cash method states
  final TextEditingController _cashReceivedController = TextEditingController();
  double _cashChange = 0.0;
  
  // Split payment states
  int _splitCount = 2;
  List<double> _splitShares = [];
  List<PaymentMethod> _splitMethods = [];

  // General checkout complete state
  bool _isProcessing = false;
  bool _isSuccess = false;
  Order? _completedOrder;

  @override
  void initState() {
    super.initState();
    _cashReceivedController.text = widget.grandTotal.toStringAsFixed(2);
    _calculateChange();
    _updateSplitShares();
  }

  @override
  void dispose() {
    _cashReceivedController.dispose();
    super.dispose();
  }

  void _calculateChange() {
    final cash = double.tryParse(_cashReceivedController.text) ?? 0.0;
    setState(() {
      _cashChange = cash >= widget.grandTotal ? cash - widget.grandTotal : 0.0;
    });
  }

  void _updateSplitShares() {
    final share = double.parse((widget.grandTotal / _splitCount).toStringAsFixed(2));
    final shares = List.generate(_splitCount, (index) => share);
    final methods = List.generate(_splitCount, (index) => PaymentMethod.cash);
    // Adjust last one to avoid 1 cent rounding error
    final sum = shares.fold(0.0, (a, b) => a + b);
    if ((sum - widget.grandTotal).abs() > 0.001) {
      shares.last += widget.grandTotal - sum;
    }
    setState(() {
      _splitShares = shares;
      _splitMethods = methods;
    });
  }

  Future<void> _handlePayment() async {
    final cartState = ref.read(cartProvider);
    if (cartState.orderType == OrderType.dineIn && cartState.tableNumber == null) {
      ScaffoldMessenger.of(context).showSnackBar(
        const SnackBar(content: Text('Please select a Table Number for Dine In orders.')),
      );
      Navigator.pop(context); 
      return;
    }

    setState(() { _isProcessing = true; });

    await Future.delayed(const Duration(seconds: 1)); // Simulate Gateway

    try {
      final order = await ref.read(cartProvider.notifier).processCheckout(
        _selectedMethod,
        splitPayments: _selectedMethod == PaymentMethod.split ? _splitShares : null,
        splitMethods: _selectedMethod == PaymentMethod.split ? _splitMethods : null,
      );

      setState(() {
        _isProcessing = false;
        _isSuccess = true;
        _completedOrder = order;
      });
    } catch (e) {
      setState(() { _isProcessing = false; });
      if (!mounted) return;
      ScaffoldMessenger.of(context).showSnackBar(SnackBar(content: Text('Payment Failed: $e')));
    }
  }

  Future<void> _printReceipt() async {
    if (_completedOrder != null) {
       try {
         await BluetoothPrinterService.instance.printReceipt(_completedOrder!.toJson());
       } catch (e) {
         if (!mounted) return;
         showDialog(
           context: context,
           builder: (ctx) => AlertDialog(
             title: const Text('Printer Error'),
             content: Text('Failed to print receipt: $e\nPlease check the printer and try again.'),
             actions: [
               TextButton(
                 onPressed: () => Navigator.pop(ctx),
                 child: const Text('Dismiss'),
               ),
               ElevatedButton(
                 onPressed: () {
                   Navigator.pop(ctx);
                   _printReceipt();
                 },
                 child: const Text('Retry Print'),
               ),
             ],
           ),
         );
       }
    }
  }

  @override
  Widget build(BuildContext context) {
    return Dialog(
      backgroundColor: Colors.transparent,
      insetPadding: const EdgeInsets.symmetric(horizontal: 16, vertical: 24),
      child: LayoutBuilder(
        builder: (context, constraints) {
          final dialogWidth = constraints.maxWidth < 600 ? constraints.maxWidth : 600.0;
          return Container(
            width: dialogWidth,
            decoration: BoxDecoration(
              color: Theme.of(context).cardTheme.color ?? Theme.of(context).colorScheme.surface,
              borderRadius: BorderRadius.circular(32),
              boxShadow: [BoxShadow(color: Colors.black.withValues(alpha: 0.1), blurRadius: 40, offset: const Offset(0, 20))],
            ),
            child: AnimatedSize(
              duration: const Duration(milliseconds: 300),
              curve: Curves.easeOutQuart,
              child: AnimatedSwitcher(
                duration: const Duration(milliseconds: 300),
                child: _isSuccess ? _buildSuccessState() : _buildPaymentState(),
              ),
            ),
          );
        },
      ),
    );
  }

  Widget _buildPaymentState() {
    return Padding(
      padding: const EdgeInsets.all(32),
      child: Column(
        mainAxisSize: MainAxisSize.min,
        crossAxisAlignment: CrossAxisAlignment.stretch,
        children: [
          // Header
          Row(
            mainAxisAlignment: MainAxisAlignment.spaceBetween,
            children: [
              Expanded(child: Text('Complete Checkout', style: GoogleFonts.inter(fontSize: 24, fontWeight: FontWeight.w800, color: (Theme.of(context).textTheme.bodyMedium?.color ?? Colors.black)), overflow: TextOverflow.ellipsis)),
              IconButton(
                icon: Icon(Icons.close, color: (Theme.of(context).textTheme.bodyMedium?.color?.withValues(alpha: 0.6) ?? Colors.grey)),
                onPressed: _isProcessing ? null : () => Navigator.pop(context),
              ),
            ],
          ),
          const SizedBox(height: 24),
          
          // Total amount card
          Container(
            padding: const EdgeInsets.symmetric(vertical: 24, horizontal: 24),
            decoration: BoxDecoration(
              color: Theme.of(context).colorScheme.primary.withValues(alpha: 0.05),
              borderRadius: BorderRadius.circular(20),
              border: Border.all(color: Theme.of(context).colorScheme.primary.withValues(alpha: 0.1)),
            ),
            child: Row(
              mainAxisAlignment: MainAxisAlignment.spaceBetween,
              children: [
                Text('Grand Total', style: GoogleFonts.inter(fontSize: 18, fontWeight: FontWeight.w700, color: (Theme.of(context).textTheme.bodyMedium?.color?.withValues(alpha: 0.6) ?? Colors.grey))),
                Text(
                  AppCurrency.format(widget.grandTotal),
                  style: GoogleFonts.inter(fontSize: 36, fontWeight: FontWeight.w800, color: Theme.of(context).colorScheme.primary),
                ),
              ],
            ),
          ),
          const SizedBox(height: 32),
          Text('Select Payment Method', style: GoogleFonts.inter(fontSize: 16, fontWeight: FontWeight.w700, color: (Theme.of(context).textTheme.bodyMedium?.color ?? Colors.black))),
          const SizedBox(height: 12),

          // Method selector grid
          Row(
            children: [
              _buildMethodButton(PaymentMethod.cash, Icons.payments_outlined, 'Cash'),
              const SizedBox(width: 12),
              _buildMethodButton(PaymentMethod.card, Icons.credit_card, 'Card'),
              const SizedBox(width: 12),
              _buildMethodButton(PaymentMethod.online, Icons.qr_code, 'QR Pay'),
            ],
          ),
          const SizedBox(height: 12),
          Row(
            children: [
              _buildMethodButton(PaymentMethod.split, Icons.call_split, 'Split'),
              const SizedBox(width: 12),
              const Expanded(flex: 2, child: SizedBox()),
            ],
          ),
          const SizedBox(height: 32),

          // Details area depending on selection
          Flexible(
            child: LayoutBuilder(
              builder: (context, constraints) {
                return SingleChildScrollView(
                  child: AnimatedSwitcher(
                    duration: const Duration(milliseconds: 250),
                    child: SizedBox(
                      key: ValueKey(_selectedMethod),
                      width: constraints.maxWidth,
                      child: _buildSelectedDetails(),
                    ),
                  ),
                );
              }
            ),
          ),
          const SizedBox(height: 32),

          // Process button
          if (_selectedMethod != PaymentMethod.online)
            SizedBox(
              height: 60,
              child: ElevatedButton(
                onPressed: _isProcessing ? null : _handlePayment,
                style: ElevatedButton.styleFrom(
                  backgroundColor: Theme.of(context).colorScheme.primary,
                  foregroundColor: Colors.white,
                  shape: RoundedRectangleBorder(borderRadius: BorderRadius.circular(16)),
                  elevation: 0,
                  disabledBackgroundColor: Theme.of(context).colorScheme.primary.withValues(alpha: 0.5),
                ),
                child: _isProcessing
                    ? const SizedBox(height: 24, width: 24, child: CircularProgressIndicator(color: Colors.white, strokeWidth: 3))
                    : Text('Confirm Payment', style: GoogleFonts.inter(fontSize: 18, fontWeight: FontWeight.w800)),
              ),
            ),
        ],
      ),
    );
  }

  Widget _buildMethodButton(PaymentMethod method, IconData icon, String label) {
    final isSelected = _selectedMethod == method;

    return Expanded(
      child: InkWell(
        onTap: _isProcessing ? null : () => setState(() => _selectedMethod = method),
        borderRadius: BorderRadius.circular(16),
        child: AnimatedContainer(
          duration: const Duration(milliseconds: 200),
          padding: const EdgeInsets.symmetric(vertical: 20),
          decoration: BoxDecoration(
            color: isSelected ? Theme.of(context).colorScheme.primary : Theme.of(context).cardTheme.color ?? Theme.of(context).colorScheme.surface,
            borderRadius: BorderRadius.circular(16),
            border: Border.all(color: isSelected ? Theme.of(context).colorScheme.primary : Theme.of(context).dividerColor),
            boxShadow: isSelected ? [BoxShadow(color: Theme.of(context).colorScheme.primary.withValues(alpha: 0.3), blurRadius: 12, offset: const Offset(0, 4))] : [],
          ),
          child: Column(
            children: [
              Icon(icon, color: isSelected ? Colors.white : (Theme.of(context).textTheme.bodyMedium?.color?.withValues(alpha: 0.6) ?? Colors.grey), size: 28),
              const SizedBox(height: 8),
              Text(
                label,
                style: GoogleFonts.inter(
                  fontSize: 13,
                  fontWeight: isSelected ? FontWeight.w800 : FontWeight.w600,
                  color: isSelected ? Colors.white : (Theme.of(context).textTheme.bodyMedium?.color ?? Colors.black),
                ),
              ),
            ],
          ),
        ),
      ),
    );
  }

  Widget _buildSelectedDetails() {
    switch (_selectedMethod) {
      case PaymentMethod.cash: return _buildCashView();
      case PaymentMethod.card: return _buildCardView();
      case PaymentMethod.online: return _buildOnlineView();
      case PaymentMethod.split: return _buildSplitView();
      case PaymentMethod.credit: return _buildCreditView();
    }
  }

  Widget _buildCashView() {
    final double subtotal = widget.grandTotal;
    final List<double> shortcuts = {
      subtotal,
      (subtotal / 10).ceil() * 10.0,
      (subtotal / 50).ceil() * 50.0,
      (subtotal / 100).ceil() * 100.0,
    }.toList(); 

    return Column(
      crossAxisAlignment: CrossAxisAlignment.stretch,
      children: [
        Text('Cash Received', style: GoogleFonts.inter(fontWeight: FontWeight.w700, fontSize: 14, color: (Theme.of(context).textTheme.bodyMedium?.color ?? Colors.black))),
        const SizedBox(height: 12),
        TextField(
          controller: _cashReceivedController,
          keyboardType: const TextInputType.numberWithOptions(decimal: true),
          style: GoogleFonts.inter(fontSize: 24, fontWeight: FontWeight.w800, color: (Theme.of(context).textTheme.bodyMedium?.color ?? Colors.black)),
          decoration: InputDecoration(
            prefixText: '\$ ',
            prefixStyle: GoogleFonts.inter(fontSize: 24, fontWeight: FontWeight.w800, color: (Theme.of(context).textTheme.bodyMedium?.color ?? Colors.black)),
            filled: true,
            fillColor: Theme.of(context).scaffoldBackgroundColor,
            border: OutlineInputBorder(borderRadius: BorderRadius.circular(16), borderSide: BorderSide.none),
            contentPadding: const EdgeInsets.symmetric(horizontal: 20, vertical: 20),
          ),
          onChanged: (_) => _calculateChange(),
        ),
        const SizedBox(height: 16),
        Wrap(
          spacing: 12,
          runSpacing: 12,
          children: shortcuts.map((amt) {
            return InkWell(
              onTap: () {
                _cashReceivedController.text = amt.toStringAsFixed(2);
                _calculateChange();
              },
              borderRadius: BorderRadius.circular(12),
              child: Container(
                padding: const EdgeInsets.symmetric(horizontal: 16, vertical: 12),
                decoration: BoxDecoration(
                  color: Theme.of(context).scaffoldBackgroundColor,
                  borderRadius: BorderRadius.circular(12),
                  border: Border.all(color: Theme.of(context).dividerColor),
                ),
                child: Text(AppCurrency.format(amt), style: GoogleFonts.inter(fontWeight: FontWeight.w700, color: (Theme.of(context).textTheme.bodyMedium?.color ?? Colors.black))),
              ),
            );
          }).toList(),
        ),
        const SizedBox(height: 24),
        Container(
          padding: const EdgeInsets.symmetric(horizontal: 24, vertical: 20),
          decoration: BoxDecoration(
            color: _cashChange > 0 ? Theme.of(context).colorScheme.secondary.withValues(alpha: 0.1) : Theme.of(context).scaffoldBackgroundColor,
            borderRadius: BorderRadius.circular(16),
          ),
          child: Row(
            mainAxisAlignment: MainAxisAlignment.spaceBetween,
            children: [
              Text('Change Due:', style: GoogleFonts.inter(fontSize: 16, fontWeight: FontWeight.w700, color: _cashChange > 0 ? Theme.of(context).colorScheme.secondary : (Theme.of(context).textTheme.bodyMedium?.color?.withValues(alpha: 0.6) ?? Colors.grey))),
              Text(
                AppCurrency.format(_cashChange),
                style: GoogleFonts.inter(fontSize: 24, fontWeight: FontWeight.w800, color: _cashChange > 0 ? Theme.of(context).colorScheme.secondary : (Theme.of(context).textTheme.bodyMedium?.color ?? Colors.black)),
              ),
            ],
          ),
        ),
      ],
    );
  }

  Widget _buildCardView() {
    return Center(
      child: Padding(
        padding: const EdgeInsets.symmetric(vertical: 32),
        child: Column(
          children: [
            Icon(Icons.tap_and_play, size: 80, color: Theme.of(context).colorScheme.primary)
                .animate(onPlay: (controller) => controller.repeat())
                .shimmer(duration: const Duration(seconds: 2), color: Theme.of(context).colorScheme.primary.withValues(alpha: 0.3)),
            const SizedBox(height: 24),
            Text('Awaiting Card', style: GoogleFonts.inter(fontSize: 20, fontWeight: FontWeight.w800, color: (Theme.of(context).textTheme.bodyMedium?.color ?? Colors.black))),
            const SizedBox(height: 8),
            Text('Please tap or insert card on the terminal', style: GoogleFonts.inter(fontSize: 14, color: (Theme.of(context).textTheme.bodyMedium?.color?.withValues(alpha: 0.6) ?? Colors.grey), fontWeight: FontWeight.w600)),
          ],
        ),
      ),
    );
  }

  Widget _buildOnlineView() {
    final cartState = ref.read(cartProvider);
    return QrPaymentView(
      subtotal: cartState.subtotal,
      discount: cartState.discountAmount,
      tax: cartState.vat,
      serviceCharge: cartState.serviceCharge,
      grandTotal: cartState.grandTotal,
      orderNumber: cartState.orderNumber,
      cashierName: cartState.customerName ?? 'Cashier',
      onPaymentSuccess: () {
        ref.read(cartProvider.notifier).clearCart();
        Navigator.pop(context);
      },
      onCancel: () {
        Navigator.pop(context);
      },
    );
  }

  Widget _buildSplitView() {
    return Column(
      crossAxisAlignment: CrossAxisAlignment.stretch,
      children: [
        Row(
          mainAxisAlignment: MainAxisAlignment.spaceBetween,
          children: [
            Expanded(child: Text('Number of splits', style: GoogleFonts.inter(fontWeight: FontWeight.w700, fontSize: 16, color: (Theme.of(context).textTheme.bodyMedium?.color ?? Colors.black)))),
            const SizedBox(width: 8),
            Container(
              decoration: BoxDecoration(color: Theme.of(context).scaffoldBackgroundColor, borderRadius: BorderRadius.circular(12), border: Border.all(color: Theme.of(context).dividerColor)),
              child: Row(
                children: [
                  IconButton(
                    icon: Icon(Icons.remove),
                    onPressed: _splitCount <= 2 ? null : () { setState(() { _splitCount--; _updateSplitShares(); }); },
                  ),
                  Text('$_splitCount', style: GoogleFonts.inter(fontSize: 18, fontWeight: FontWeight.w800)),
                  IconButton(
                    icon: Icon(Icons.add),
                    onPressed: _splitCount >= 10 ? null : () { setState(() { _splitCount++; _updateSplitShares(); }); },
                  ),
                ],
              ),
            ),
          ],
        ),
        const SizedBox(height: 24),
        Container(
          constraints: const BoxConstraints(maxHeight: 200),
          decoration: BoxDecoration(
            color: Theme.of(context).scaffoldBackgroundColor,
            borderRadius: BorderRadius.circular(16),
            border: Border.all(color: Theme.of(context).dividerColor),
          ),
          child: ListView.separated(
            shrinkWrap: true,
            padding: const EdgeInsets.all(16),
            itemCount: _splitCount,
            separatorBuilder: (_, _) => Divider(height: 24, color: Theme.of(context).dividerColor),
            itemBuilder: (context, index) {
              return Row(
                mainAxisAlignment: MainAxisAlignment.spaceBetween,
                children: [
                  Text('Share #${index + 1}', style: GoogleFonts.inter(fontSize: 15, fontWeight: FontWeight.w600, color: (Theme.of(context).textTheme.bodyMedium?.color ?? Colors.black))),
                  DropdownButton<PaymentMethod>(
                    value: _splitMethods[index],
                    underline: const SizedBox(),
                    items: [PaymentMethod.cash, PaymentMethod.card, PaymentMethod.online, PaymentMethod.credit]
                        .map((m) => DropdownMenuItem(value: m, child: Text(m.name, style: GoogleFonts.inter(fontWeight: FontWeight.w600))))
                        .toList(),
                    onChanged: (val) {
                       if (val != null) setState(() => _splitMethods[index] = val);
                    },
                  ),
                  Text(AppCurrency.format(_splitShares[index]), style: GoogleFonts.inter(fontSize: 16, fontWeight: FontWeight.w800, color: Theme.of(context).colorScheme.primary)),
                ],
              );
            },
          ),
        ),
      ],
    );
  }

  Widget _buildCreditView() {
    return Column(
      crossAxisAlignment: CrossAxisAlignment.stretch,
      children: [
        Container(
          padding: const EdgeInsets.all(20),
          decoration: BoxDecoration(color: const Color(0xFFF59E0B).withValues(alpha: 0.1), borderRadius: BorderRadius.circular(16)),
          child: Column(
            children: [
              Icon(Icons.warning_amber_rounded, color: Color(0xFFF59E0B), size: 32),
              const SizedBox(height: 12),
              Text('Module Required', style: GoogleFonts.inter(fontWeight: FontWeight.w800, fontSize: 16, color: const Color(0xFFF59E0B))),
              const SizedBox(height: 8),
              Text('Store credit module is not configured for this terminal.', textAlign: TextAlign.center, style: GoogleFonts.inter(color: (Theme.of(context).textTheme.bodyMedium?.color ?? Colors.black), fontWeight: FontWeight.w600)),
            ],
          ),
        )
      ],
    );
  }

  Widget _buildSuccessState() {
    return Padding(
      padding: const EdgeInsets.all(40),
      child: Column(
        mainAxisSize: MainAxisSize.min,
        crossAxisAlignment: CrossAxisAlignment.center,
        children: [
          Container(
            width: 96,
            height: 96,
            decoration: BoxDecoration(color: Theme.of(context).colorScheme.secondary.withValues(alpha: 0.1), shape: BoxShape.circle),
            child: Icon(Icons.check_circle_outline, size: 48, color: Theme.of(context).colorScheme.secondary),
          ).animate().scale(duration: const Duration(milliseconds: 500), curve: Curves.elasticOut),
          const SizedBox(height: 32),
          Text('Payment Successful', style: GoogleFonts.inter(fontSize: 28, fontWeight: FontWeight.w800, color: (Theme.of(context).textTheme.bodyMedium?.color ?? Colors.black))),
          const SizedBox(height: 8),
          Text('Order #${_completedOrder?.orderNumber}', style: GoogleFonts.inter(color: (Theme.of(context).textTheme.bodyMedium?.color?.withValues(alpha: 0.6) ?? Colors.grey), fontSize: 16, fontWeight: FontWeight.w600)),
          const SizedBox(height: 40),
          Row(
            children: [
              Expanded(
                child: OutlinedButton(
                  onPressed: _printReceipt,
                  style: OutlinedButton.styleFrom(
                    padding: const EdgeInsets.symmetric(vertical: 16),
                    side: BorderSide(color: Theme.of(context).dividerColor),
                    shape: RoundedRectangleBorder(borderRadius: BorderRadius.circular(16)),
                  ),
                  child: Row(
                    mainAxisAlignment: MainAxisAlignment.center,
                    children: [
                      Icon(Icons.print_outlined, color: (Theme.of(context).textTheme.bodyMedium?.color ?? Colors.black), size: 20),
                      const SizedBox(width: 8),
                      Text('Print Receipt', style: GoogleFonts.inter(color: (Theme.of(context).textTheme.bodyMedium?.color ?? Colors.black), fontWeight: FontWeight.w700)),
                    ],
                  ),
                ),
              ),
              const SizedBox(width: 16),
              Expanded(
                child: ElevatedButton(
                  onPressed: () => Navigator.pop(context),
                  style: ElevatedButton.styleFrom(
                    padding: const EdgeInsets.symmetric(vertical: 16),
                    backgroundColor: Theme.of(context).colorScheme.primary,
                    shape: RoundedRectangleBorder(borderRadius: BorderRadius.circular(16)),
                  ),
                  child: Text('New Order', style: GoogleFonts.inter(color: Colors.white, fontWeight: FontWeight.w700)),
                ),
              ),
            ],
          ),
        ],
      ),
    );
  }
}
