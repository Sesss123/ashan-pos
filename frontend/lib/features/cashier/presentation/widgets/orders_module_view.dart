import '../../../../core/utils/app_currency.dart';
import 'package:flutter/material.dart';
import 'package:flutter_riverpod/flutter_riverpod.dart';
import 'package:google_fonts/google_fonts.dart';

import '../providers/cart_provider.dart';
import '../../../waiter/presentation/providers/running_orders_provider.dart';
import '../../../../core/widgets/virtual_receipt_dialog.dart';
import 'checkout_dialog.dart';

class OrdersModuleView extends ConsumerWidget {
  const OrdersModuleView({super.key});

  @override
  Widget build(BuildContext context, WidgetRef ref) {
    final runningOrdersState = ref.watch(runningOrdersProvider);
    // Note: To make held orders reactive, cartProvider needs to expose them via state.
    // For now we read them directly on build.
    final heldOrders = ref.read(cartProvider.notifier).getHeldOrders();

    return Container(
      color: Theme.of(context).scaffoldBackgroundColor,
      padding: const EdgeInsets.all(24),
      child: Column(
        crossAxisAlignment: CrossAxisAlignment.start,
        children: [
          Text('Active & Held Orders', style: GoogleFonts.inter(fontSize: 24, fontWeight: FontWeight.w800, color: Theme.of(context).textTheme.bodyMedium?.color)),
          const SizedBox(height: 24),
          Expanded(
            child: runningOrdersState.when(
              data: (runningOrders) {
                final allOrders = [...heldOrders, ...runningOrders];
                
                // Dummy data removed per user request
                if (allOrders.isEmpty) {
                  return Center(
                    child: Text('No active or held orders found.', style: GoogleFonts.inter(fontSize: 18, color: Colors.grey)),
                  );
                }

                return GridView.builder(
                  gridDelegate: const SliverGridDelegateWithMaxCrossAxisExtent(
                    maxCrossAxisExtent: 350,
                    mainAxisExtent: 220,
                    crossAxisSpacing: 16,
                    mainAxisSpacing: 16,
                  ),
                  itemCount: allOrders.length,
                  itemBuilder: (context, index) {
                    final item = allOrders[index];
                    final isHeld = item is CartState;
                    return _buildOrderCard(context, ref, item, isHeld);
                  },
                );
              },
              loading: () => Center(child: CircularProgressIndicator(color: Theme.of(context).colorScheme.primary)),
              error: (e, _) => Center(child: Text('Error loading orders: $e', style: GoogleFonts.inter(color: Colors.red))),
            ),
          ),
        ],
      ),
    );
  }

  Widget _buildOrderCard(BuildContext context, WidgetRef ref, dynamic orderItem, bool isHeld) {
    String title = '';
    String itemsText = '';
    String totalText = '';
    String badgeText = '';

    if (isHeld) {
      final cart = orderItem as CartState;
      title = 'Held Order';
      badgeText = 'HELD';
      itemsText = cart.items.map((i) => '${i.quantity}x ${i.product.name}').join('\n');
      totalText = AppCurrency.format(cart.grandTotal);
    } else {
      final orderId = orderItem['id'].toString();
      title = 'Order #${orderId.length > 6 ? orderId.substring(0, 6) : orderId}';
      badgeText = (orderItem['status'] as String).toUpperCase();
      
      try {
        final items = orderItem['order']['items'] as List<dynamic>;
        itemsText = items.map((i) => '${i['quantity']}x ${i['product']['name']}').join('\n');
      } catch (e) {
        itemsText = 'Items unknown';
      }
      
      totalText = '...'; // Total not available in kitchen running orders
    }
    return Container(
      decoration: BoxDecoration(
        color: Theme.of(context).cardTheme.color ?? Theme.of(context).colorScheme.surface,
        borderRadius: BorderRadius.circular(16),
        border: Border.all(color: Theme.of(context).dividerColor),
        boxShadow: [
          BoxShadow(color: Colors.black.withValues(alpha: 0.02), blurRadius: 8, offset: const Offset(0, 2))
        ]
      ),
      child: Padding(
        padding: const EdgeInsets.all(16),
        child: Column(
          crossAxisAlignment: CrossAxisAlignment.start,
          children: [
            Row(
              mainAxisAlignment: MainAxisAlignment.spaceBetween,
              children: [
                Expanded(
                  child: Text(
                    title, 
                    style: GoogleFonts.inter(fontWeight: FontWeight.w800, fontSize: 18, color: Theme.of(context).textTheme.bodyMedium?.color),
                    overflow: TextOverflow.ellipsis,
                  ),
                ),
                const SizedBox(width: 8),
                Container(
                  padding: const EdgeInsets.symmetric(horizontal: 10, vertical: 4),
                  decoration: BoxDecoration(
                    color: isHeld ? Colors.orange.withValues(alpha: 0.1) : Colors.blue.withValues(alpha: 0.1), 
                    borderRadius: BorderRadius.circular(8)
                  ),
                  child: Text(badgeText, style: GoogleFonts.inter(color: isHeld ? Colors.orange : Colors.blue, fontWeight: FontWeight.w700, fontSize: 12)),
                )
              ],
            ),
            Divider(color: Theme.of(context).dividerColor, height: 24),
            Text(
              itemsText, 
              style: GoogleFonts.inter(color: Theme.of(context).textTheme.bodyMedium?.color?.withValues(alpha: 0.7) ?? Colors.grey, fontWeight: FontWeight.w500),
              maxLines: 3,
              overflow: TextOverflow.ellipsis,
            ),
            const Spacer(),
            Row(
              mainAxisAlignment: MainAxisAlignment.spaceBetween,
              children: [
                Flexible(
                  child: Text(
                    totalText, 
                    style: GoogleFonts.inter(fontSize: 18, fontWeight: FontWeight.w800, color: Theme.of(context).colorScheme.primary),
                    overflow: TextOverflow.ellipsis,
                  ),
                ),
                const SizedBox(width: 8),
                if (isHeld)
                  ElevatedButton(
                    onPressed: () {
                      ref.read(cartProvider.notifier).resumeOrder(orderItem as CartState);
                      ScaffoldMessenger.of(context).showSnackBar(const SnackBar(content: Text('Order resumed.')));
                    },
                    style: ElevatedButton.styleFrom(
                      backgroundColor: Theme.of(context).colorScheme.primary, 
                      foregroundColor: Colors.white,
                      elevation: 0,
                      shape: RoundedRectangleBorder(borderRadius: BorderRadius.circular(10))
                    ),
                    child: Text('Resume', style: GoogleFonts.inter(fontWeight: FontWeight.w700)),
                  )
                else
                  Row(
                    mainAxisSize: MainAxisSize.min,
                    children: [
                      OutlinedButton(
                        onPressed: () {
                          final items = orderItem['order']?['items'] as List<dynamic>? ?? [];
                          final mappedItems = items.map((i) {
                            return {
                              'quantity': i['quantity'],
                              'price': i['price'] ?? i['product']?['price'] ?? 0.0,
                              'product': i['product'],
                            };
                          }).toList();

                          final virtualOrder = {
                            'id': orderItem['id'],
                            'createdAt': orderItem['createdAt'] ?? DateTime.now().toIso8601String(),
                            'type': orderItem['type'] ?? 'Dine-In',
                            'paymentMethod': orderItem['paymentMethod'] ?? 'Pending',
                            'items': mappedItems,
                            'subtotal': orderItem['order']?['subtotal'] ?? 0.0,
                            'tax': orderItem['order']?['tax'] ?? 0.0,
                            'total': orderItem['order']?['total'] ?? 0.0,
                          };
                          VirtualReceiptDialog.show(context, virtualOrder);
                        },
                        style: OutlinedButton.styleFrom(
                          foregroundColor: Theme.of(context).colorScheme.primary,
                          side: BorderSide(color: Theme.of(context).colorScheme.primary.withValues(alpha: 0.5)),
                          shape: RoundedRectangleBorder(borderRadius: BorderRadius.circular(10))
                        ),
                        child: Text('View', style: GoogleFonts.inter(fontWeight: FontWeight.w700)),
                      ),
                      const SizedBox(width: 8),
                      ElevatedButton(
                        onPressed: () {
                          showDialog(
                            context: context,
                            builder: (ctx) => CheckoutDialog(grandTotal: (orderItem['order']?['total'] ?? 0.0).toDouble()),
                          );
                        },
                        style: ElevatedButton.styleFrom(
                          backgroundColor: Colors.green, 
                          foregroundColor: Colors.white,
                          elevation: 0,
                          shape: RoundedRectangleBorder(borderRadius: BorderRadius.circular(10))
                        ),
                        child: Text('Pay', style: GoogleFonts.inter(fontWeight: FontWeight.w700)),
                      ),
                    ],
                  ),
              ],
            )
          ],
        ),
      ),
    );
  }
}
