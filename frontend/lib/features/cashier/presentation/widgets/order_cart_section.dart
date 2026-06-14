import '../../../../core/utils/app_currency.dart';
import 'package:flutter/material.dart';
import 'package:flutter_riverpod/flutter_riverpod.dart';
import 'package:flutter_animate/flutter_animate.dart';
import 'package:google_fonts/google_fonts.dart';
// lucide_icons removed - using built-in Icons.*

import '../providers/cart_provider.dart';
import '../../domain/models/cart_item.dart';
import '../utils/receipt_printer.dart';
import 'checkout_dialog.dart';
import 'customer_search_dialog.dart';

// --- Theme Colors ---

class POSOrderCartSection extends ConsumerWidget {
  final bool isMobileModal;
  
  const POSOrderCartSection({super.key, this.isMobileModal = false});

  @override
  Widget build(BuildContext context, WidgetRef ref) {
    final cartState = ref.watch(cartProvider);

    return Container(
      decoration: BoxDecoration(
        color: Theme.of(context).cardTheme.color ?? Theme.of(context).colorScheme.surface,
        border: Border(left: BorderSide(color: Theme.of(context).dividerColor)),
      ),
      child: LayoutBuilder(
        builder: (context, constraints) {
          final isTooSmall = constraints.maxHeight < 450;

          Widget content = Column(
            children: [
              // Cart Header
              Container(
                padding: const EdgeInsets.symmetric(horizontal: 20, vertical: 16),
                decoration: BoxDecoration(
                  border: Border(bottom: BorderSide(color: Theme.of(context).dividerColor)),
                ),
                child: Row(
                  mainAxisAlignment: MainAxisAlignment.spaceBetween,
                  children: [
                    Expanded(
                      child: Row(
                        mainAxisAlignment: MainAxisAlignment.spaceBetween,
                        children: [
                          Expanded(
                            child: InkWell(
                              onTap: () {
                                showDialog(context: context, builder: (_) => const CustomerSearchDialog());
                              },
                              borderRadius: BorderRadius.circular(14),
                              child: Container(
                                padding: const EdgeInsets.symmetric(vertical: 10, horizontal: 16),
                                decoration: BoxDecoration(
                                  color: Theme.of(context).scaffoldBackgroundColor,
                                  borderRadius: BorderRadius.circular(14),
                                  border: Border.all(color: Theme.of(context).dividerColor),
                                ),
                                child: Row(
                                  children: [
                                    Icon(Icons.person_outline, color: cartState.customerName != null ? Theme.of(context).colorScheme.primary : (Theme.of(context).textTheme.bodyMedium?.color?.withValues(alpha: 0.6) ?? Colors.grey), size: 18),
                                    const SizedBox(width: 10),
                                    Expanded(
                                      child: Text(
                                        cartState.customerName ?? 'Walk-in Customer',
                                        style: GoogleFonts.inter(
                                          fontSize: 14,
                                          fontWeight: FontWeight.w800,
                                          color: cartState.customerName != null ? Theme.of(context).colorScheme.primary : (Theme.of(context).textTheme.bodyMedium?.color ?? Colors.black),
                                        ),
                                        overflow: TextOverflow.ellipsis,
                                      ),
                                    ),
                                    Icon(Icons.keyboard_arrow_down, color: (Theme.of(context).textTheme.bodyMedium?.color?.withValues(alpha: 0.6) ?? Colors.grey), size: 18),
                                  ],
                                ),
                              ),
                            ),
                          ),
                          const SizedBox(width: 12),
                          Container(
                            padding: const EdgeInsets.symmetric(horizontal: 14, vertical: 10),
                            decoration: BoxDecoration(
                              color: Theme.of(context).scaffoldBackgroundColor,
                              borderRadius: BorderRadius.circular(14),
                              border: Border.all(color: Theme.of(context).dividerColor),
                            ),
                            child: Row(
                              children: [
                                Icon(Icons.store_outlined, color: (Theme.of(context).textTheme.bodyMedium?.color?.withValues(alpha: 0.6) ?? Colors.grey), size: 16),
                                const SizedBox(width: 8),
                                Text('Main Branch', style: GoogleFonts.inter(color: (Theme.of(context).textTheme.bodyMedium?.color ?? Colors.black), fontWeight: FontWeight.w700, fontSize: 13)),
                              ],
                            ),
                          ),
                        ],
                      ),
                    ),
                  ],
                ),
              ),

              // Cart Items List
              isTooSmall
                  ? _buildCartList(context, cartState, ref, shrinkWrap: true)
                  : Expanded(child: _buildCartList(context, cartState, ref, shrinkWrap: false)),

              // Quick Actions
              Padding(
                padding: const EdgeInsets.symmetric(vertical: 8),
                child: SingleChildScrollView(
                  scrollDirection: Axis.horizontal,
                  padding: const EdgeInsets.symmetric(horizontal: 20),
                  child: Row(
                    mainAxisAlignment: MainAxisAlignment.start,
                    children: [
                    _buildQuickAction(context, Icons.pause_circle_outline, 'Hold', () {
                      if (cartState.items.isEmpty) {
                        ScaffoldMessenger.of(context).showSnackBar(const SnackBar(content: Text('Cart is empty!')));
                        return;
                      }
                      ref.read(cartProvider.notifier).holdCurrentOrder();
                      ScaffoldMessenger.of(context).showSnackBar(const SnackBar(content: Text('Order placed on hold.')));
                    }),
                    _buildQuickAction(context, Icons.list_alt_outlined, 'Held Bills', () {
                      final heldOrders = ref.read(cartProvider.notifier).getHeldOrders();
                      if (heldOrders.isEmpty) {
                        ScaffoldMessenger.of(context).showSnackBar(const SnackBar(content: Text('No orders on hold.')));
                        return;
                      }
                      showDialog(
                        context: context,
                        builder: (ctx) => AlertDialog(
                          title: Text('Held Bills', style: GoogleFonts.inter(fontWeight: FontWeight.w800, color: (Theme.of(context).textTheme.bodyMedium?.color ?? Colors.black))),
                          content: SizedBox(
                            width: 300,
                            child: ListView.builder(
                              shrinkWrap: true,
                              itemCount: heldOrders.length,
                              itemBuilder: (context, index) {
                                final heldState = heldOrders[index];
                                return ListTile(
                                  leading: Icon(Icons.receipt_long_outlined, color: Theme.of(context).colorScheme.primary),
                                  title: Text('Order ${heldState.orderNumber}', style: GoogleFonts.inter(fontWeight: FontWeight.w700)),
                                  subtitle: Text('${heldState.items.length} items - ${AppCurrency.format(heldState.grandTotal)}', style: GoogleFonts.inter()),
                                  onTap: () {
                                    ref.read(cartProvider.notifier).resumeOrder(heldState);
                                    Navigator.pop(ctx);
                                    ScaffoldMessenger.of(context).showSnackBar(SnackBar(content: Text('Order ${heldState.orderNumber} resumed.')));
                                  },
                                );
                              },
                            ),
                          ),
                          actions: [
                            TextButton(onPressed: () => Navigator.pop(ctx), child: Text('Cancel', style: GoogleFonts.inter(color: (Theme.of(context).textTheme.bodyMedium?.color?.withValues(alpha: 0.6) ?? Colors.grey)))),
                          ],
                          backgroundColor: Theme.of(context).cardTheme.color ?? Theme.of(context).colorScheme.surface,
                          shape: RoundedRectangleBorder(borderRadius: BorderRadius.circular(20)),
                        ),
                      );
                    }),
                    _buildQuickAction(context, Icons.percent_outlined, 'Discount', () {
                      showDialog(
                        context: context,
                        builder: (ctx) {
                          double parsedDiscount = 0.0;
                          return AlertDialog(
                            title: Text('Add Discount', style: GoogleFonts.inter(fontWeight: FontWeight.w800)),
                            content: TextField(
                              keyboardType: const TextInputType.numberWithOptions(decimal: true),
                              decoration: const InputDecoration(
                                labelText: 'Discount Amount (\$)',
                                border: OutlineInputBorder(),
                                prefixIcon: Icon(Icons.attach_money),
                              ),
                              onChanged: (val) {
                                parsedDiscount = double.tryParse(val) ?? 0.0;
                              },
                            ),
                            actions: [
                              TextButton(onPressed: () => Navigator.pop(ctx), child: Text('Cancel', style: GoogleFonts.inter(color: Colors.grey))),
                              ElevatedButton(
                                onPressed: () {
                                  ref.read(cartProvider.notifier).setDiscount(parsedDiscount);
                                  Navigator.pop(ctx);
                                },
                                style: ElevatedButton.styleFrom(backgroundColor: Theme.of(context).colorScheme.primary, foregroundColor: Colors.white),
                                child: const Text('Apply'),
                              ),
                            ],
                            shape: RoundedRectangleBorder(borderRadius: BorderRadius.circular(20)),
                          );
                        },
                      );
                    }),
                    _buildQuickAction(context, Icons.print_outlined, 'Print', () {
                      if (cartState.items.isEmpty) {
                        ScaffoldMessenger.of(context).showSnackBar(const SnackBar(content: Text('Cart is empty!')));
                        return;
                      }
                      ReceiptPrinter.printReceipt(
                        orderNumber: cartState.orderNumber,
                        items: cartState.items,
                        subtotal: cartState.subtotal,
                        discount: cartState.discountAmount,
                        tax: cartState.vat,
                        grandTotal: cartState.grandTotal,
                      );
                    }),
                      _buildQuickAction(context, Icons.delete_outline, 'Clear', () {
                        ref.read(cartProvider.notifier).clearCart();
                      }, isDestructive: true),
                    ],
                  ),
                ),
              ),

              // Summary Area
              Container(
                padding: const EdgeInsets.symmetric(horizontal: 24, vertical: 20),
                decoration: BoxDecoration(
                  color: Theme.of(context).scaffoldBackgroundColor,
                  borderRadius: const BorderRadius.vertical(top: Radius.circular(32)),
                  border: Border(top: BorderSide(color: Theme.of(context).dividerColor)),
                ),
                child: Column(
                  children: [
                    _buildSummaryRow(context, 'Subtotal', cartState.subtotal),
                    const SizedBox(height: 12),
                    _buildSummaryRow(context, 'Discount', -cartState.discountAmount, color: Theme.of(context).colorScheme.secondary),
                    const SizedBox(height: 12),
                    _buildSummaryRow(context, 'Tax (${(cartState.vatRate * 100).toInt()}%)', cartState.vat),
                    if (cartState.serviceChargeRate > 0) ...[
                      const SizedBox(height: 12),
                      _buildSummaryRow(context, 'Service Charge', cartState.serviceCharge),
                    ],
                    Padding(
                      padding: const EdgeInsets.symmetric(vertical: 20),
                      child: Row(
                        children: List.generate(
                          30,
                          (index) => Expanded(
                            child: Container(
                              color: index % 2 == 0 ? Colors.transparent : Theme.of(context).dividerColor,
                              height: 2,
                            ),
                          ),
                        ),
                      ),
                    ),
                    Row(
                      mainAxisAlignment: MainAxisAlignment.spaceBetween,
                      children: [
                        Text('Grand Total', style: GoogleFonts.inter(fontSize: 20, fontWeight: FontWeight.w800, color: (Theme.of(context).textTheme.bodyMedium?.color ?? Colors.black))),
                        Text(
                          AppCurrency.format(cartState.grandTotal),
                          style: GoogleFonts.inter(fontSize: 32, fontWeight: FontWeight.w800, color: Theme.of(context).colorScheme.primary),
                        ),
                      ],
                    ),
                    const SizedBox(height: 24),

                    // Massive Pay Now Button
                    SizedBox(
                      width: double.infinity,
                      height: 64,
                      child: ElevatedButton(
                        onPressed: cartState.items.isEmpty
                            ? null
                            : () {
                                showDialog(
                                  context: context,
                                  builder: (ctx) => CheckoutDialog(grandTotal: cartState.grandTotal),
                                );
                              },
                        style: ElevatedButton.styleFrom(
                          padding: EdgeInsets.zero,
                          shape: RoundedRectangleBorder(borderRadius: BorderRadius.circular(20)),
                          elevation: 0,
                          disabledBackgroundColor: Theme.of(context).colorScheme.primary.withValues(alpha: 0.3),
                        ),
                        child: Ink(
                          decoration: BoxDecoration(
                            gradient: cartState.items.isEmpty ? null : LinearGradient(
                              colors: [Theme.of(context).colorScheme.primary, const Color(0xFF3B82F6)],
                              begin: Alignment.topLeft, end: Alignment.bottomRight,
                            ),
                            borderRadius: BorderRadius.circular(20),
                          ),
                          child: Container(
                            alignment: Alignment.center,
                            child: Row(
                              mainAxisAlignment: MainAxisAlignment.center,
                              children: [
                                Icon(Icons.credit_card, size: 24, color: cartState.items.isEmpty ? Colors.white70 : Colors.white),
                                const SizedBox(width: 12),
                                Text('PAY NOW', style: GoogleFonts.inter(fontSize: 20, fontWeight: FontWeight.w800, letterSpacing: 1.5, color: cartState.items.isEmpty ? Colors.white70 : Colors.white)),
                              ],
                            ),
                          ),
                        ),
                      ).animate(onPlay: (c) => c.repeat()).shimmer(duration: 2.seconds, color: Colors.white.withValues(alpha: 0.3)),
                    ),
                  ],
                ),
              ),
            ],
          );

          return isTooSmall ? SingleChildScrollView(child: content) : content;
        },
      ),
    ).animate().slideX(begin: 1.0, end: 0.0, curve: Curves.easeOutQuart, duration: 500.ms).fadeIn(duration: 500.ms);
  }

  Widget _buildCartList(BuildContext context, CartState cartState, WidgetRef ref, {required bool shrinkWrap}) {
    if (cartState.items.isEmpty) {
      return Center(
        child: SingleChildScrollView(
          child: Column(
            mainAxisSize: MainAxisSize.min,
            mainAxisAlignment: MainAxisAlignment.center,
            children: [
              Container(
                padding: const EdgeInsets.all(32),
                decoration: BoxDecoration(
                  color: Theme.of(context).colorScheme.primary.withValues(alpha: 0.1),
                  shape: BoxShape.circle,
                ),
                child: Icon(Icons.shopping_cart_outlined, size: 64, color: Theme.of(context).colorScheme.primary),
              ).animate(onPlay: (c) => c.repeat(reverse: true)).scaleXY(begin: 0.95, end: 1.05, duration: 2.seconds),
              const SizedBox(height: 24),
              Text('Cart is empty', style: GoogleFonts.inter(fontSize: 22, fontWeight: FontWeight.w800, color: (Theme.of(context).textTheme.bodyMedium?.color ?? Colors.black))),
              const SizedBox(height: 8),
              Text('Select products from the menu to add.', style: GoogleFonts.inter(fontSize: 14, fontWeight: FontWeight.w500, color: (Theme.of(context).textTheme.bodyMedium?.color?.withValues(alpha: 0.6) ?? Colors.grey))),
            ],
          ),
        ),
      ).animate().fadeIn(duration: 400.ms);
    }

    return ListView.separated(
      shrinkWrap: shrinkWrap,
      physics: shrinkWrap ? const NeverScrollableScrollPhysics() : const AlwaysScrollableScrollPhysics(),
      padding: const EdgeInsets.symmetric(horizontal: 20, vertical: 20),
      itemCount: cartState.items.length,
      separatorBuilder: (_, _) => const SizedBox(height: 16),
      itemBuilder: (context, index) {
        final item = cartState.items[index];
        return Dismissible(
          key: ValueKey('${item.product.id}_${item.notes}'),
          direction: DismissDirection.endToStart,
          background: Container(
            alignment: Alignment.centerRight,
            padding: const EdgeInsets.only(right: 24),
            decoration: BoxDecoration(color: Theme.of(context).colorScheme.error, borderRadius: BorderRadius.circular(16)),
            child: Icon(Icons.delete_outline, color: Colors.white),
          ),
          onDismissed: (direction) {
            ref.read(cartProvider.notifier).removeFromCart(item.product, item.notes);
          },
          child: _CartItemRow(item: item, ref: ref).animate().fadeIn(duration: 200.ms).slideX(begin: 0.05, end: 0),
        );
      },
    );
  }

  Widget _buildQuickAction(BuildContext context, IconData icon, String label, VoidCallback onTap, {bool isDestructive = false}) {
    final color = isDestructive ? Theme.of(context).colorScheme.error : Theme.of(context).colorScheme.primary;
    final bgColor = isDestructive ? Theme.of(context).colorScheme.error.withValues(alpha: 0.1) : Theme.of(context).colorScheme.primary.withValues(alpha: 0.1);
    
    return Container(
      margin: const EdgeInsets.only(right: 12),
      child: Material(
        color: bgColor,
        borderRadius: BorderRadius.circular(16),
        child: InkWell(
          onTap: onTap,
          borderRadius: BorderRadius.circular(16),
          child: Container(
            padding: const EdgeInsets.symmetric(horizontal: 16, vertical: 12),
            constraints: const BoxConstraints(minWidth: 70),
            child: Column(
              mainAxisSize: MainAxisSize.min,
              children: [
                Icon(icon, color: color, size: 24),
                const SizedBox(height: 8),
                Text(label, style: GoogleFonts.inter(fontSize: 12, fontWeight: FontWeight.w700, color: color)),
              ],
            ),
          ),
        ),
      ),
    );
  }

  Widget _buildSummaryRow(BuildContext context, String label, double amount, {Color? color}) {
    return Row(
      mainAxisAlignment: MainAxisAlignment.spaceBetween,
      children: [
        Text(label, style: GoogleFonts.inter(fontSize: 15, fontWeight: FontWeight.w600, color: (Theme.of(context).textTheme.bodyMedium?.color?.withValues(alpha: 0.6) ?? Colors.grey))),
        Text(
          AppCurrency.format(amount),
          style: GoogleFonts.inter(fontSize: 16, fontWeight: FontWeight.w800, color: color ?? (Theme.of(context).textTheme.bodyMedium?.color ?? Colors.black)),
        ),
      ],
    );
  }
}

class _CartItemRow extends StatelessWidget {
  final CartItem item;
  final WidgetRef ref;

  const _CartItemRow({required this.item, required this.ref});

  @override
  Widget build(BuildContext context) {
    return Container(
      padding: const EdgeInsets.all(12),
      decoration: BoxDecoration(
        color: Theme.of(context).cardTheme.color ?? Theme.of(context).colorScheme.surface,
        borderRadius: BorderRadius.circular(16),
        border: Border.all(color: Theme.of(context).dividerColor),
        boxShadow: [BoxShadow(color: Colors.black.withValues(alpha: 0.02), blurRadius: 8, offset: const Offset(0, 4))],
      ),
      child: Row(
        crossAxisAlignment: CrossAxisAlignment.center,
        children: [
          // Qty Controls
          Container(
            decoration: BoxDecoration(
              color: Theme.of(context).scaffoldBackgroundColor,
              borderRadius: BorderRadius.circular(12),
            ),
            child: Column(
              children: [
                IconButton(
                  icon: Icon(Icons.add, size: 16, color: Theme.of(context).colorScheme.primary),
                  onPressed: () {
                    ref.read(cartProvider.notifier).updateQuantity(item.product, item.quantity + 1, item.notes);
                  },
                  padding: EdgeInsets.zero,
                  constraints: const BoxConstraints(minHeight: 32, minWidth: 40),
                ),
                Text('${item.quantity}', style: GoogleFonts.inter(fontWeight: FontWeight.w800, fontSize: 16, color: (Theme.of(context).textTheme.bodyMedium?.color ?? Colors.black))),
                IconButton(
                  icon: Icon(Icons.remove, size: 16, color: (Theme.of(context).textTheme.bodyMedium?.color?.withValues(alpha: 0.6) ?? Colors.grey)),
                  onPressed: () {
                    ref.read(cartProvider.notifier).updateQuantity(item.product, item.quantity - 1, item.notes);
                  },
                  padding: EdgeInsets.zero,
                  constraints: const BoxConstraints(minHeight: 32, minWidth: 40),
                ),
              ],
            ),
          ),
          const SizedBox(width: 16),

          // Item Info
          Expanded(
            child: Column(
              crossAxisAlignment: CrossAxisAlignment.start,
              children: [
                Text(item.product.name, style: GoogleFonts.inter(fontSize: 16, fontWeight: FontWeight.w800, color: (Theme.of(context).textTheme.bodyMedium?.color ?? Colors.black))),
                if (item.notes.isNotEmpty) ...[
                  const SizedBox(height: 4),
                  Text(item.notes, style: GoogleFonts.inter(fontSize: 12, fontWeight: FontWeight.w600, color: const Color(0xFFF59E0B))),
                ],
                const SizedBox(height: 4),
                Text(AppCurrency.format(item.product.price), style: GoogleFonts.inter(fontSize: 14, fontWeight: FontWeight.w600, color: (Theme.of(context).textTheme.bodyMedium?.color?.withValues(alpha: 0.6) ?? Colors.grey))),
              ],
            ),
          ),

          // Total Price & Remove
          Column(
            crossAxisAlignment: CrossAxisAlignment.end,
            children: [
              Text(
                AppCurrency.format(item.totalPrice),
                style: GoogleFonts.inter(fontSize: 18, fontWeight: FontWeight.w800, color: Theme.of(context).colorScheme.primary),
              ),
              const SizedBox(height: 12),
              InkWell(
                onTap: () {
                  ref.read(cartProvider.notifier).removeFromCart(item.product, item.notes);
                },
                child: Container(
                  padding: const EdgeInsets.all(6),
                  decoration: BoxDecoration(color: Theme.of(context).colorScheme.error.withValues(alpha: 0.1), borderRadius: BorderRadius.circular(8)),
                  child: Icon(Icons.delete_outline, color: Theme.of(context).colorScheme.error, size: 16),
                ),
              ),
            ],
          ),
        ],
      ),
    );
  }
}
