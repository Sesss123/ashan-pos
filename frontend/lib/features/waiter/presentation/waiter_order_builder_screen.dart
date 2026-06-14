import '../../../core/utils/app_currency.dart';
import 'package:flutter/material.dart';
import 'package:flutter_riverpod/flutter_riverpod.dart';
import 'package:flutter_animate/flutter_animate.dart';
import 'package:google_fonts/google_fonts.dart';
// lucide_icons removed - using built-in Icons.*

import '../../cashier/presentation/providers/cashier_providers.dart'; 
import '../../cashier/domain/models/product.dart';
import 'providers/waiter_cart_provider.dart';
import 'providers/running_orders_provider.dart';
import '../../cashier/domain/models/cart_item.dart';
import '../../../core/widgets/responsive_layout.dart';
import '../../../core/network/dio_client.dart';
import 'widgets/customer_management_dialog.dart';

// --- Theme Colors ---

class WaiterOrderBuilderScreen extends ConsumerStatefulWidget {
  final String tableId;
  final String tableName;

  const WaiterOrderBuilderScreen({super.key, required this.tableId, required this.tableName});

  @override
  ConsumerState<WaiterOrderBuilderScreen> createState() => _WaiterOrderBuilderScreenState();
}

class _WaiterOrderBuilderScreenState extends ConsumerState<WaiterOrderBuilderScreen> {
  Map<String, dynamic>? _selectedCustomer;

  @override
  void initState() {
    super.initState();
    Future.microtask(() async {
      ref.read(waiterCartProvider.notifier).setTable(widget.tableId);
      
      try {
        final runningOrdersState = await ref.read(runningOrdersProvider.future);
        final runningOrders = runningOrdersState;
        dynamic tableOrder;
        for (var o in runningOrders) {
          if (o['order']?['tableId'] == widget.tableId) {
            tableOrder = o;
            break;
          }
        }

        if (tableOrder != null && tableOrder['order'] != null && tableOrder['order']['items'] != null) {
          final orderId = tableOrder['order']['id'];
          final itemsList = tableOrder['order']['items'] as List<dynamic>;
          final cartItems = itemsList.map((i) {
             return CartItem(
               id: i['id'],
               orderId: orderId,
               product: Product(
                 id: i['product']?['id'] ?? '',
                 categoryId: i['product']?['categoryId'] ?? '',
                 name: i['product']?['name'] ?? 'Unknown',
                 price: (i['price'] as num?)?.toDouble() ?? 0.0,
                 barcode: i['product']?['barcode'] ?? '',
                 isAvailable: true,
               ),
               quantity: i['quantity'] as int? ?? 1,
               notes: i['notes'] ?? '',
             );
          }).toList();
          ref.read(waiterCartProvider.notifier).loadExistingItems(cartItems);
        }
      } catch (e) {
         // ignore error
      }
    });
  }

  void _showNotesDialog(Product product) {
    final controller = TextEditingController();
    showDialog(
      context: context,
      builder: (ctx) => AlertDialog(
        backgroundColor: Theme.of(context).cardTheme.color ?? Theme.of(context).colorScheme.surface,
        shape: RoundedRectangleBorder(borderRadius: BorderRadius.circular(24)),
        title: Text('Add Notes for ${product.name}', style: GoogleFonts.inter(fontWeight: FontWeight.w800, color: (Theme.of(context).textTheme.bodyMedium?.color ?? Colors.black))),
        content: TextField(
          controller: controller,
          style: GoogleFonts.inter(color: (Theme.of(context).textTheme.bodyMedium?.color ?? Colors.black)),
          decoration: InputDecoration(
            hintText: 'e.g. No onions, extra spicy...',
            hintStyle: GoogleFonts.inter(color: (Theme.of(context).textTheme.bodyMedium?.color?.withValues(alpha: 0.6) ?? Colors.grey)),
            filled: true,
            fillColor: Theme.of(context).scaffoldBackgroundColor,
            border: OutlineInputBorder(borderRadius: BorderRadius.circular(16), borderSide: BorderSide.none),
          ),
          maxLines: 3,
        ),
        actions: [
          TextButton(onPressed: () => Navigator.pop(ctx), child: Text('Cancel', style: GoogleFonts.inter(color: (Theme.of(context).textTheme.bodyMedium?.color?.withValues(alpha: 0.6) ?? Colors.grey)))),
          ElevatedButton(
            onPressed: () {
              ref.read(waiterCartProvider.notifier).addItem(product, notes: controller.text);
              Navigator.pop(ctx);
            },
            style: ElevatedButton.styleFrom(
              backgroundColor: Theme.of(context).colorScheme.primary,
              foregroundColor: Colors.white,
              shape: RoundedRectangleBorder(borderRadius: BorderRadius.circular(12)),
            ),
            child: Text('Add to Order', style: GoogleFonts.inter(fontWeight: FontWeight.w700)),
          ),
        ],
      ),
    );
  }

  void _showTransferDialog() {
    final tables = ref.read(tablesProvider).value ?? [];
    final currentTable = tables.firstWhere(
      (table) => table['id'] == widget.tableId,
      orElse: () => null,
    );
    final activeOrders = currentTable?['orders'] as List<dynamic>?;
    final activeOrderId = activeOrders?.isNotEmpty == true ? activeOrders!.first['orderId'] : null;
    final availableTables = tables
        .where((table) => table['id'] != widget.tableId && table['status'] == 'Available')
        .toList();
    String? destinationTableId;

    showDialog(
      context: context,
      builder: (ctx) => StatefulBuilder(
        builder: (ctx, setDialogState) => AlertDialog(
          backgroundColor: Theme.of(context).cardTheme.color ?? Theme.of(context).colorScheme.surface,
          shape: RoundedRectangleBorder(borderRadius: BorderRadius.circular(24)),
          title: Text('Transfer ${widget.tableName}', style: GoogleFonts.inter(fontWeight: FontWeight.w800, color: (Theme.of(context).textTheme.bodyMedium?.color ?? Colors.black))),
          content: Column(
            mainAxisSize: MainAxisSize.min,
            crossAxisAlignment: CrossAxisAlignment.start,
            children: [
              if (activeOrderId == null)
                Padding(
                  padding: const EdgeInsets.only(bottom: 16),
                  child: Container(
                    padding: const EdgeInsets.all(12),
                    decoration: BoxDecoration(color: const Color(0xFFFEF2F2), borderRadius: BorderRadius.circular(12)),
                    child: Row(
                      children: [
                        Icon(Icons.info_outline, color: Color(0xFFEF4444), size: 20),
                        const SizedBox(width: 8),
                        Expanded(child: Text('No active order found. Transfer requires a submitted order.', style: GoogleFonts.inter(color: const Color(0xFFEF4444), fontSize: 13, fontWeight: FontWeight.w600))),
                      ],
                    ),
                  ),
                ),
              if (availableTables.isEmpty)
                Text('No available destination tables found.', style: GoogleFonts.inter(color: (Theme.of(context).textTheme.bodyMedium?.color?.withValues(alpha: 0.6) ?? Colors.grey)))
              else
                DropdownButtonFormField<String>(
                  decoration: InputDecoration(
                    labelText: 'Select Destination Table',
                    labelStyle: GoogleFonts.inter(color: (Theme.of(context).textTheme.bodyMedium?.color?.withValues(alpha: 0.6) ?? Colors.grey)),
                    filled: true,
                    fillColor: Theme.of(context).scaffoldBackgroundColor,
                    border: OutlineInputBorder(borderRadius: BorderRadius.circular(16), borderSide: BorderSide.none),
                  ),
                  items: availableTables.map((table) {
                    return DropdownMenuItem<String>(
                      value: table['id'] as String,
                      child: Text(table['name'] as String, style: GoogleFonts.inter(color: (Theme.of(context).textTheme.bodyMedium?.color ?? Colors.black), fontWeight: FontWeight.w600)),
                    );
                  }).toList(),
                  onChanged: (value) => setDialogState(() => destinationTableId = value),
                ),
            ],
          ),
          actions: [
            TextButton(onPressed: () => Navigator.pop(ctx), child: Text('Cancel', style: GoogleFonts.inter(color: (Theme.of(context).textTheme.bodyMedium?.color?.withValues(alpha: 0.6) ?? Colors.grey)))),
            ElevatedButton(
              style: ElevatedButton.styleFrom(
                backgroundColor: Colors.orange,
                foregroundColor: Colors.white,
                shape: RoundedRectangleBorder(borderRadius: BorderRadius.circular(12)),
              ),
              onPressed: (destinationTableId == null || activeOrderId == null)
                  ? null
                  : () async {
                      try {
                        await ref.read(dioClientProvider).dio.post('/waiter/tables/transfer', data: {
                          'fromTableId': widget.tableId,
                          'toTableId': destinationTableId,
                          'orderId': activeOrderId,
                        });
                        ref.invalidate(tablesProvider);
                        if (!ctx.mounted) return;
                        Navigator.pop(ctx);
                        if (!mounted) return;
                        ScaffoldMessenger.of(context).showSnackBar(const SnackBar(content: Text('Table transferred successfully!')));
                        Navigator.pop(context); // Go back to dashboard
                      } catch (e) {
                        if (!mounted) return;
                        ScaffoldMessenger.of(context).showSnackBar(SnackBar(content: Text('Failed to transfer table: $e')));
                      }
                    },
              child: Text('Confirm Transfer', style: GoogleFonts.inter(fontWeight: FontWeight.w700)),
            ),
          ],
        ),
      ),
    );
  }

  void _showMergeDialog() {
    final tables = ref.read(tablesProvider).value ?? [];
    final occupiedTables = tables
        .where((table) => table['id'] != widget.tableId && table['status'] == 'Occupied')
        .toList();
    
    String? sourceTableId;

    showDialog(
      context: context,
      builder: (ctx) => StatefulBuilder(
        builder: (ctx, setDialogState) => AlertDialog(
          backgroundColor: Theme.of(context).cardTheme.color ?? Theme.of(context).colorScheme.surface,
          shape: RoundedRectangleBorder(borderRadius: BorderRadius.circular(24)),
          title: Text('Merge into ${widget.tableName}', style: GoogleFonts.inter(fontWeight: FontWeight.w800, color: (Theme.of(context).textTheme.bodyMedium?.color ?? Colors.black))),
          content: Column(
            mainAxisSize: MainAxisSize.min,
            crossAxisAlignment: CrossAxisAlignment.start,
            children: [
              Text('Select an occupied table to merge its orders into ${widget.tableName}. The other table will become Available.', style: GoogleFonts.inter(color: (Theme.of(context).textTheme.bodyMedium?.color?.withValues(alpha: 0.6) ?? Colors.grey))),
              const SizedBox(height: 16),
              if (occupiedTables.isEmpty)
                Text('No occupied tables found to merge.', style: GoogleFonts.inter(color: (Theme.of(context).textTheme.bodyMedium?.color?.withValues(alpha: 0.6) ?? Colors.grey)))
              else
                DropdownButtonFormField<String>(
                  decoration: InputDecoration(
                    labelText: 'Select Source Table',
                    labelStyle: GoogleFonts.inter(color: (Theme.of(context).textTheme.bodyMedium?.color?.withValues(alpha: 0.6) ?? Colors.grey)),
                    filled: true,
                    fillColor: Theme.of(context).scaffoldBackgroundColor,
                    border: OutlineInputBorder(borderRadius: BorderRadius.circular(16), borderSide: BorderSide.none),
                  ),
                  items: occupiedTables.map((table) {
                    return DropdownMenuItem<String>(
                      value: table['id'] as String,
                      child: Text(table['name'] as String, style: GoogleFonts.inter(color: (Theme.of(context).textTheme.bodyMedium?.color ?? Colors.black), fontWeight: FontWeight.w600)),
                    );
                  }).toList(),
                  onChanged: (value) => setDialogState(() => sourceTableId = value),
                ),
            ],
          ),
          actions: [
            TextButton(onPressed: () => Navigator.pop(ctx), child: Text('Cancel', style: GoogleFonts.inter(color: (Theme.of(context).textTheme.bodyMedium?.color?.withValues(alpha: 0.6) ?? Colors.grey)))),
            ElevatedButton(
              style: ElevatedButton.styleFrom(
                backgroundColor: Theme.of(context).colorScheme.primary,
                foregroundColor: Colors.white,
                shape: RoundedRectangleBorder(borderRadius: BorderRadius.circular(12)),
              ),
              onPressed: (sourceTableId == null) ? null : () async {
                try {
                  final sourceTable = occupiedTables.firstWhere((t) => t['id'] == sourceTableId);
                  final sourceActiveOrders = sourceTable['orders'] as List<dynamic>?;
                  final sourceOrderId = sourceActiveOrders?.isNotEmpty == true ? sourceActiveOrders!.first['orderId'] : null;

                  if (sourceOrderId == null) {
                    if (!context.mounted) return;
                    ScaffoldMessenger.of(context).showSnackBar(const SnackBar(content: Text('Selected table has no active order to merge.')));
                    return;
                  }

                  await ref.read(dioClientProvider).dio.post('/waiter/tables/merge', data: {
                    'fromTableId': sourceTableId,
                    'toTableId': widget.tableId,
                    'orderId': sourceOrderId,
                  });
                  ref.invalidate(tablesProvider);
                  if (!ctx.mounted) return;
                  Navigator.pop(ctx);
                  if (!mounted) return;
                  ScaffoldMessenger.of(context).showSnackBar(const SnackBar(content: Text('Tables merged successfully!')));
                  Navigator.pop(context); // Go back to dashboard to refresh view
                } catch (e) {
                  if (!mounted) return;
                  ScaffoldMessenger.of(context).showSnackBar(SnackBar(content: Text('Failed to merge tables: $e')));
                }
              },
              child: Text('Confirm Merge', style: GoogleFonts.inter(fontWeight: FontWeight.w700)),
            ),
          ],
        ),
      ),
    );
  }

  @override
  Widget build(BuildContext context) {
    return Scaffold(
      backgroundColor: Theme.of(context).scaffoldBackgroundColor,
      appBar: AppBar(
        backgroundColor: Theme.of(context).cardTheme.color ?? Theme.of(context).colorScheme.surface,
        elevation: 0,
        centerTitle: false,
        iconTheme: IconThemeData(color: (Theme.of(context).textTheme.bodyMedium?.color ?? Colors.black)),
        leading: IconButton(
          icon: Icon(Icons.arrow_back_ios_new_rounded, color: Theme.of(context).colorScheme.primary),
          onPressed: () => Navigator.pop(context),
        ),
        title: Row(
          children: [
            Container(
              padding: const EdgeInsets.all(8),
              decoration: BoxDecoration(color: Theme.of(context).colorScheme.primary.withValues(alpha: 0.1), borderRadius: BorderRadius.circular(10)),
              child: Icon(Icons.restaurant, color: Theme.of(context).colorScheme.primary, size: 20),
            ),
            const SizedBox(width: 12),
            Expanded(
              child: FittedBox(
                fit: BoxFit.scaleDown,
                alignment: Alignment.centerLeft,
                child: Text('Order for ${widget.tableName}', style: GoogleFonts.inter(color: (Theme.of(context).textTheme.bodyMedium?.color ?? Colors.black), fontWeight: FontWeight.w800)),
              ),
            ),
          ],
        ),
        actions: [
          if (_selectedCustomer != null)
            Padding(
              padding: const EdgeInsets.only(right: 8, top: 16),
              child: Text(
                _selectedCustomer!['name'],
                style: GoogleFonts.inter(color: Theme.of(context).colorScheme.primary, fontWeight: FontWeight.bold),
              ),
            ),
          IconButton(
            icon: Icon(Icons.person_add_alt_1_outlined, color: Theme.of(context).colorScheme.secondary),
            tooltip: 'Select Customer',
            onPressed: () async {
              final customer = await showDialog(
                context: context,
                builder: (ctx) => const CustomerManagementDialog(),
              );
              if (customer != null) {
                setState(() => _selectedCustomer = customer as Map<String, dynamic>);
              }
            },
          ),
          IconButton(
            icon: Icon(Icons.receipt_outlined, color: Colors.orange),
            tooltip: 'Request Bill',
            onPressed: () async {
              try {
                await ref.read(dioClientProvider).dio.post('/waiter/tables/${widget.tableId}/request-bill');
                if (!context.mounted) return;
                ScaffoldMessenger.of(context).showSnackBar(const SnackBar(content: Text('Bill requested! Cashier notified.')));
              } catch (e) {
                if (!context.mounted) return;
                ScaffoldMessenger.of(context).showSnackBar(SnackBar(content: Text('Failed to request bill: $e')));
              }
            },
          ),
          IconButton(
            icon: Icon(Icons.cleaning_services_outlined, color: Theme.of(context).colorScheme.primary),
            tooltip: 'Clear Table',
            onPressed: () async {
              try {
                await ref.read(dioClientProvider).dio.put('/waiter/tables/${widget.tableId}/status', data: {'status': 'Available'});
                ref.invalidate(tablesProvider);
                if (!context.mounted) return;
                ScaffoldMessenger.of(context).showSnackBar(const SnackBar(content: Text('Table cleared to Available!')));
                Navigator.pop(context);
              } catch (e) {
                if (!context.mounted) return;
                ScaffoldMessenger.of(context).showSnackBar(SnackBar(content: Text('Failed: $e')));
              }
            },
          ),
          IconButton(
            icon: Icon(Icons.swap_horiz, color: (Theme.of(context).textTheme.bodyMedium?.color?.withValues(alpha: 0.6) ?? Colors.grey)),
            tooltip: 'Transfer Table',
            onPressed: _showTransferDialog,
          ),
          IconButton(
            icon: Icon(Icons.merge, color: (Theme.of(context).textTheme.bodyMedium?.color?.withValues(alpha: 0.6) ?? Colors.grey)),
            tooltip: 'Merge Table',
            onPressed: _showMergeDialog,
          ),
          const SizedBox(width: 16),
        ],
        bottom: PreferredSize(
          preferredSize: const Size.fromHeight(1),
          child: Container(color: Theme.of(context).dividerColor, height: 1),
        ),
      ),
      body: ResponsiveLayout(
        mobile: _buildMobileLayout(),
        tablet: _buildDesktopLayout(),
        desktop: _buildDesktopLayout(),
      ),
      floatingActionButton: ResponsiveLayout.isMobile(context)
          ? FloatingActionButton.extended(
              onPressed: () => _showMobileCartBottomSheet(),
              backgroundColor: Theme.of(context).colorScheme.primary,
              elevation: 4,
              icon: Icon(Icons.shopping_bag_outlined, color: Colors.white),
              label: Consumer(
                builder: (context, ref, _) {
                  final cartState = ref.watch(waiterCartProvider);
                  return Text(
                    'Review (${cartState.items.length}) - ${AppCurrency.format(cartState.subtotal)}',
                    style: GoogleFonts.inter(color: Colors.white, fontWeight: FontWeight.w800),
                  );
                },
              ),
            )
          : null,
      floatingActionButtonLocation: FloatingActionButtonLocation.centerFloat,
    );
  }

  Widget _buildMobileLayout() {
    return Column(
      children: [
        const SizedBox(height: 16),
        _buildCategoryPills(),
        const SizedBox(height: 16),
        Expanded(child: _buildMenuGrid(crossAxisCount: 2)),
      ],
    );
  }

  Widget _buildDesktopLayout() {
    return Row(
      children: [
        // Left: Menu
        Expanded(
          flex: 2,
          child: Column(
            children: [
              const SizedBox(height: 24),
              _buildCategoryPills(),
              const SizedBox(height: 24),
              Expanded(child: _buildMenuGrid(crossAxisCount: MediaQuery.of(context).size.width > 1024 ? 4 : 3)),
            ],
          ),
        ),
        
        // Right: Cart
        Container(
          width: 380,
          decoration: BoxDecoration(
            border: Border(left: BorderSide(color: Theme.of(context).dividerColor)),
            color: Theme.of(context).cardTheme.color ?? Theme.of(context).colorScheme.surface,
          ),
          child: _buildCartPanel(),
        )
      ],
    );
  }

  Widget _buildCategoryPills() {
    final categoriesState = ref.watch(categoriesProvider);
    final selectedCategoryId = ref.watch(waiterCartProvider).selectedCategoryId;

    return categoriesState.when(
      data: (categories) => SizedBox(
        height: 48,
        child: ListView.separated(
          scrollDirection: Axis.horizontal,
          padding: const EdgeInsets.symmetric(horizontal: 24),
          itemCount: categories.length + 1,
          separatorBuilder: (_, _) => const SizedBox(width: 12),
          itemBuilder: (context, index) {
            if (index == 0) {
              final isSelected = selectedCategoryId == null;
              return _CategoryPill(
                title: 'All Items',
                icon: Icons.grid_view,
                isSelected: isSelected,
                onTap: () => ref.read(waiterCartProvider.notifier).selectCategory(null),
              );
            }
            final category = categories[index - 1];
            final isSelected = category.id == selectedCategoryId;
            return _CategoryPill(
              title: category.name,
              icon: _getIconForCategory(category.name),
              isSelected: isSelected,
              onTap: () => ref.read(waiterCartProvider.notifier).selectCategory(category.id),
            );
          },
        ),
      ),
      loading: () => const SizedBox(height: 48, child: Center(child: CircularProgressIndicator())),
      error: (e, _) => SizedBox(height: 48, child: Center(child: Text('Error: $e'))),
    );
  }

  IconData _getIconForCategory(String name) {
    final lower = name.toLowerCase();
    if (lower.contains('pizza')) return Icons.local_pizza_outlined;
    if (lower.contains('burger')) return Icons.lunch_dining;
    if (lower.contains('drink') || lower.contains('beverage')) return Icons.local_cafe_outlined;
    if (lower.contains('coffee')) return Icons.coffee;
    if (lower.contains('dessert')) return Icons.cake_outlined;
    if (lower.contains('salad')) return Icons.eco_outlined;
    return Icons.no_meals;
  }

  Widget _buildMenuGrid({required int crossAxisCount}) {
    final productsState = ref.watch(productsProvider);
    final selectedCategoryId = ref.watch(waiterCartProvider).selectedCategoryId;
    
    return productsState.when(
      data: (allProducts) {
        final products = selectedCategoryId == null 
            ? allProducts 
            : allProducts.where((p) => p.categoryId == selectedCategoryId).toList();

        return GridView.builder(
          padding: EdgeInsets.only(left: 24, right: 24, top: 0, bottom: ResponsiveLayout.isMobile(context) ? 100 : 24),
          gridDelegate: SliverGridDelegateWithFixedCrossAxisCount(
            crossAxisCount: crossAxisCount,
            childAspectRatio: ResponsiveLayout.isMobile(context) ? 0.8 : 0.9,
            crossAxisSpacing: 20,
            mainAxisSpacing: 20,
          ),
          itemCount: products.length,
          itemBuilder: (context, index) {
            final product = products[index];
            return Material(
              color: Colors.transparent,
              child: InkWell(
                onTap: () => ref.read(waiterCartProvider.notifier).addItem(product),
                onLongPress: () => _showNotesDialog(product), // Long press for notes
                borderRadius: BorderRadius.circular(20),
                child: Container(
                  decoration: BoxDecoration(
                    color: Theme.of(context).cardTheme.color ?? Theme.of(context).colorScheme.surface,
                    borderRadius: BorderRadius.circular(20),
                    border: Border.all(color: Theme.of(context).dividerColor),
                    boxShadow: [BoxShadow(color: Colors.black.withValues(alpha: 0.02), blurRadius: 10, offset: const Offset(0, 4))],
                  ),
                  child: Column(
                    crossAxisAlignment: CrossAxisAlignment.stretch,
                    children: [
                      // Product Image area
                      Expanded(
                        child: Container(
                          decoration: BoxDecoration(
                            color: Theme.of(context).scaffoldBackgroundColor,
                            borderRadius: BorderRadius.vertical(top: Radius.circular(20)),
                          ),
                          child: Center(
                            child: Icon(
                              _getIconForCategory(product.categoryName),
                              size: 48, 
                              color: Theme.of(context).dividerColor
                            ),
                          ),
                        ),
                      ),
                      // Content area
                      Padding(
                        padding: const EdgeInsets.all(12),
                        child: Column(
                          crossAxisAlignment: CrossAxisAlignment.start,
                          children: [
                            Text(
                              product.name,
                              style: GoogleFonts.inter(color: (Theme.of(context).textTheme.bodyMedium?.color ?? Colors.black), fontWeight: FontWeight.w800, fontSize: 14),
                              maxLines: 2,
                              overflow: TextOverflow.ellipsis,
                            ),
                            const SizedBox(height: 8),
                            Row(
                              mainAxisAlignment: MainAxisAlignment.spaceBetween,
                              children: [
                                Flexible(
                                  child: Text(
                                    AppCurrency.format(product.price),
                                    style: GoogleFonts.inter(
                                      color: Theme.of(context).colorScheme.primary,
                                      fontWeight: FontWeight.w900,
                                      fontSize: 16,
                                    ),
                                    overflow: TextOverflow.ellipsis,
                                  ),
                                ),
                                Container(
                                  padding: const EdgeInsets.all(6),
                                  decoration: BoxDecoration(
                                    color: Theme.of(context).colorScheme.primary,
                                    shape: BoxShape.circle,
                                  ),
                                  child: Icon(Icons.add, size: 16, color: Colors.white),
                                ),
                              ],
                            ),
                          ],
                        ),
                      ),
                    ],
                  ),
                ),
              ).animate().fadeIn(duration: 200.ms).scale(begin: const Offset(0.95, 0.95)),
            );
          },
        );
      },
      loading: () => const Center(child: CircularProgressIndicator()),
      error: (e, _) => Center(child: Text('Error: $e')),
    );
  }

  Widget _buildCartPanel() {
    final cartState = ref.watch(waiterCartProvider);
    
    return Column(
      children: [
        Container(
          padding: const EdgeInsets.all(24),
          decoration: BoxDecoration(
            border: Border(bottom: BorderSide(color: Theme.of(context).dividerColor)),
          ),
          child: Row(
            children: [
              Container(
                padding: const EdgeInsets.all(10),
                decoration: BoxDecoration(color: Theme.of(context).colorScheme.primary.withValues(alpha: 0.1), borderRadius: BorderRadius.circular(12)),
                child: Icon(Icons.list_alt, color: Theme.of(context).colorScheme.primary, size: 20),
              ),
              const SizedBox(width: 16),
              Text('Review Order', style: GoogleFonts.inter(color: (Theme.of(context).textTheme.bodyMedium?.color ?? Colors.black), fontSize: 20, fontWeight: FontWeight.w800)),
            ],
          ),
        ),
        Expanded(
          child: (cartState.items.isEmpty && cartState.sentItems.isEmpty)
              ? Center(
                  child: Column(
                    mainAxisSize: MainAxisSize.min,
                    children: [
                      Icon(Icons.shopping_cart_outlined, size: 48, color: Theme.of(context).dividerColor),
                      const SizedBox(height: 16),
                      Text('No items added yet', style: GoogleFonts.inter(color: (Theme.of(context).textTheme.bodyMedium?.color?.withValues(alpha: 0.6) ?? Colors.grey), fontWeight: FontWeight.w600)),
                    ],
                  )
                )
              : ListView(
                  padding: const EdgeInsets.all(24),
                  children: [
                    if (cartState.sentItems.isNotEmpty) ...[
                      Row(
                        children: [
                          Icon(Icons.check_circle, color: Colors.green, size: 16),
                          const SizedBox(width: 8),
                          Text('Already Sent', style: GoogleFonts.inter(color: Colors.green, fontWeight: FontWeight.w700, fontSize: 14)),
                        ],
                      ),
                      const SizedBox(height: 12),
                      ...cartState.sentItems.map((item) => Container(
                        margin: const EdgeInsets.only(bottom: 12),
                        padding: const EdgeInsets.all(12),
                        decoration: BoxDecoration(
                          color: Theme.of(context).scaffoldBackgroundColor,
                          borderRadius: BorderRadius.circular(16),
                          border: Border.all(color: Theme.of(context).dividerColor),
                        ),
                        child: Row(
                          children: [
                            Expanded(
                              child: Column(
                                crossAxisAlignment: CrossAxisAlignment.start,
                                children: [
                                  Text(item.product.name, style: GoogleFonts.inter(color: (Theme.of(context).textTheme.bodyMedium?.color?.withValues(alpha: 0.5) ?? Colors.grey), fontWeight: FontWeight.w700, fontSize: 15)),
                                  if (item.notes.isNotEmpty) ...[
                                    const SizedBox(height: 4),
                                    Text('Notes: ${item.notes}', style: GoogleFonts.inter(color: Colors.orange.withValues(alpha: 0.5), fontWeight: FontWeight.w600, fontSize: 12)),
                                  ],
                                  const SizedBox(height: 4),
                                  Text(AppCurrency.format(item.totalPrice), style: GoogleFonts.inter(color: (Theme.of(context).textTheme.bodyMedium?.color?.withValues(alpha: 0.4) ?? Colors.grey), fontWeight: FontWeight.w600, fontSize: 13)),
                                ],
                              ),
                            ),
                            Row(
                              mainAxisSize: MainAxisSize.min,
                              children: [
                                if (item.id != null && item.orderId != null)
                                  IconButton(
                                    icon: Icon(Icons.cancel_outlined, color: Colors.red),
                                    onPressed: () async {
                                      try {
                                        await ref.read(waiterCartProvider.notifier).voidItem(item.orderId!, item.id!);
                                        if (mounted) {
                                          ScaffoldMessenger.of(context).showSnackBar(const SnackBar(content: Text('Item voided successfully')));
                                        }
                                      } catch (e) {
                                        if (mounted) {
                                          ScaffoldMessenger.of(context).showSnackBar(SnackBar(content: Text('Failed to void: $e')));
                                        }
                                      }
                                    },
                                  ),
                                Container(
                                  padding: const EdgeInsets.symmetric(horizontal: 16, vertical: 8),
                                  decoration: BoxDecoration(color: Theme.of(context).dividerColor.withValues(alpha: 0.5), borderRadius: BorderRadius.circular(12)),
                                  child: Text('${item.quantity}x', style: GoogleFonts.inter(color: (Theme.of(context).textTheme.bodyMedium?.color?.withValues(alpha: 0.5) ?? Colors.grey), fontWeight: FontWeight.w800, fontSize: 16)),
                                ),
                              ],
                            ),
                          ],
                        ),
                      )),
                      const SizedBox(height: 16),
                      Divider(color: Theme.of(context).dividerColor),
                      const SizedBox(height: 16),
                    ],
                    if (cartState.items.isNotEmpty) ...[
                      Row(
                        children: [
                          Icon(Icons.fiber_new_rounded, color: Theme.of(context).colorScheme.primary, size: 20),
                          const SizedBox(width: 8),
                          Text('New Items', style: GoogleFonts.inter(color: Theme.of(context).colorScheme.primary, fontWeight: FontWeight.w700, fontSize: 14)),
                        ],
                      ),
                      const SizedBox(height: 12),
                      ...cartState.items.map((item) => Container(
                        margin: const EdgeInsets.only(bottom: 12),
                        child: Dismissible(
                          key: ValueKey('new_${item.product.id}_${item.notes}'),
                          direction: DismissDirection.endToStart,
                          background: Container(
                            alignment: Alignment.centerRight,
                            padding: const EdgeInsets.only(right: 24),
                            decoration: BoxDecoration(color: Theme.of(context).colorScheme.error, borderRadius: BorderRadius.circular(16)),
                            child: Icon(Icons.delete_outline, color: Colors.white),
                          ),
                          onDismissed: (_) {
                            ref.read(waiterCartProvider.notifier).updateQuantity(item.product, 0, item.notes);
                          },
                          child: Container(
                            padding: const EdgeInsets.all(12),
                            decoration: BoxDecoration(
                              color: Theme.of(context).cardTheme.color ?? Theme.of(context).colorScheme.surface,
                              borderRadius: BorderRadius.circular(16),
                              border: Border.all(color: Theme.of(context).dividerColor),
                              boxShadow: [BoxShadow(color: Colors.black.withValues(alpha: 0.02), blurRadius: 8, offset: const Offset(0, 4))],
                            ),
                            child: Row(
                              children: [
                                Expanded(
                                  child: Column(
                                    crossAxisAlignment: CrossAxisAlignment.start,
                                    children: [
                                      Text(item.product.name, style: GoogleFonts.inter(color: (Theme.of(context).textTheme.bodyMedium?.color ?? Colors.black), fontWeight: FontWeight.w800, fontSize: 15)),
                                      if (item.notes.isNotEmpty) ...[
                                        const SizedBox(height: 4),
                                        Text('Notes: ${item.notes}', style: GoogleFonts.inter(color: Colors.orange, fontWeight: FontWeight.w600, fontSize: 12)),
                                      ],
                                      const SizedBox(height: 4),
                                      Text(AppCurrency.format(item.totalPrice), style: GoogleFonts.inter(color: (Theme.of(context).textTheme.bodyMedium?.color?.withValues(alpha: 0.6) ?? Colors.grey), fontWeight: FontWeight.w600, fontSize: 13)),
                                    ],
                                  ),
                                ),
                                Container(
                                  decoration: BoxDecoration(color: Theme.of(context).scaffoldBackgroundColor, borderRadius: BorderRadius.circular(12)),
                                  child: Row(
                                    mainAxisSize: MainAxisSize.min,
                                    children: [
                                      IconButton(
                                        icon: Icon(Icons.delete_outline, color: Theme.of(context).colorScheme.error, size: 18),
                                        onPressed: () => ref.read(waiterCartProvider.notifier).updateQuantity(item.product, 0, item.notes),
                                        constraints: const BoxConstraints(minWidth: 36, minHeight: 36),
                                        padding: EdgeInsets.zero,
                                      ),
                                      Container(width: 1, height: 24, color: Theme.of(context).dividerColor),
                                      IconButton(
                                        icon: Icon(Icons.remove, color: (Theme.of(context).textTheme.bodyMedium?.color?.withValues(alpha: 0.6) ?? Colors.grey), size: 16),
                                        onPressed: () => ref.read(waiterCartProvider.notifier).updateQuantity(item.product, item.quantity - 1, item.notes),
                                        constraints: const BoxConstraints(minWidth: 36, minHeight: 36),
                                        padding: EdgeInsets.zero,
                                      ),
                                      Text('${item.quantity}', style: GoogleFonts.inter(color: (Theme.of(context).textTheme.bodyMedium?.color ?? Colors.black), fontWeight: FontWeight.w800, fontSize: 16)),
                                      IconButton(
                                        icon: Icon(Icons.add, color: Theme.of(context).colorScheme.primary, size: 16),
                                        onPressed: () => ref.read(waiterCartProvider.notifier).updateQuantity(item.product, item.quantity + 1, item.notes),
                                        constraints: const BoxConstraints(minWidth: 36, minHeight: 36),
                                        padding: EdgeInsets.zero,
                                      ),
                                    ],
                                  ),
                                ),
                              ],
                            ),
                          ).animate().fadeIn().slideX(begin: 0.1, end: 0),
                        ),
                      )),
                    ],
                  ],
                ),
        ),
        Container(
          padding: const EdgeInsets.all(24),
          decoration: BoxDecoration(
            color: Theme.of(context).scaffoldBackgroundColor,
            border: Border(top: BorderSide(color: Theme.of(context).dividerColor)),
          ),
          child: Column(
            children: [
              Row(
                mainAxisAlignment: MainAxisAlignment.spaceBetween,
                children: [
                  Text('Subtotal', style: GoogleFonts.inter(color: (Theme.of(context).textTheme.bodyMedium?.color?.withValues(alpha: 0.6) ?? Colors.grey), fontSize: 16, fontWeight: FontWeight.w700)),
                  Text(AppCurrency.format(cartState.subtotal), style: GoogleFonts.inter(color: (Theme.of(context).textTheme.bodyMedium?.color ?? Colors.black), fontSize: 24, fontWeight: FontWeight.w800)),
                ],
              ),
              const SizedBox(height: 24),
              SizedBox(
                width: double.infinity,
                height: 56,
                child: ElevatedButton(
                  onPressed: cartState.items.isEmpty ? null : () async {
                    try {
                      await ref.read(waiterCartProvider.notifier).sendToKitchen('main-branch');
                      if (mounted) {
                        ScaffoldMessenger.of(context).showSnackBar(const SnackBar(content: Text('Order sent to kitchen!')));
                        Navigator.pop(context);
                        if (ResponsiveLayout.isMobile(context)) {
                          Navigator.pop(context); // Also close bottom sheet if open
                        }
                      }
                    } catch (e) {
                      if (mounted) {
                        ScaffoldMessenger.of(context).showSnackBar(SnackBar(content: Text('Failed: $e')));
                      }
                    }
                  },
                  style: ElevatedButton.styleFrom(
                    backgroundColor: Theme.of(context).colorScheme.secondary,
                    foregroundColor: Colors.white,
                    shape: RoundedRectangleBorder(borderRadius: BorderRadius.circular(16)),
                    elevation: 0,
                    disabledBackgroundColor: Theme.of(context).colorScheme.secondary.withValues(alpha: 0.4),
                  ),
                  child: Row(
                    mainAxisAlignment: MainAxisAlignment.center,
                    children: [
                      Icon(Icons.send_rounded, size: 20),
                      const SizedBox(width: 12),
                      Text('SEND TO KITCHEN', style: GoogleFonts.inter(fontSize: 16, fontWeight: FontWeight.w800, letterSpacing: 1.5)),
                    ],
                  ),
                ),
              )
            ],
          ),
        )
      ],
    );
  }

  void _showMobileCartBottomSheet() {
    showModalBottomSheet(
      context: context,
      isScrollControlled: true,
      backgroundColor: Colors.transparent,
      builder: (context) => DraggableScrollableSheet(
        initialChildSize: 0.9,
        minChildSize: 0.5,
        maxChildSize: 0.95,
        builder: (_, controller) => Container(
          decoration: BoxDecoration(
            color: Theme.of(context).cardTheme.color ?? Theme.of(context).colorScheme.surface,
            borderRadius: BorderRadius.vertical(top: Radius.circular(32)),
          ),
          child: Column(
            children: [
              Container(
                margin: const EdgeInsets.only(top: 16, bottom: 8),
                height: 6,
                width: 48,
                decoration: BoxDecoration(
                  color: Theme.of(context).dividerColor,
                  borderRadius: BorderRadius.circular(3),
                ),
              ),
              Expanded(
                child: _buildCartPanel(),
              ),
            ],
          ),
        ),
      ),
    );
  }
}

class _CategoryPill extends StatelessWidget {
  final String title;
  final IconData icon;
  final bool isSelected;
  final VoidCallback onTap;

  const _CategoryPill({required this.title, required this.icon, required this.isSelected, required this.onTap});

  @override
  Widget build(BuildContext context) {
    return Material(
      color: Colors.transparent,
      child: InkWell(
        onTap: onTap,
        borderRadius: BorderRadius.circular(24),
        child: AnimatedContainer(
          duration: const Duration(milliseconds: 200),
          padding: const EdgeInsets.symmetric(horizontal: 20, vertical: 12),
          decoration: BoxDecoration(
            color: isSelected ? Theme.of(context).colorScheme.primary : Theme.of(context).cardTheme.color ?? Theme.of(context).colorScheme.surface,
            borderRadius: BorderRadius.circular(24),
            border: Border.all(color: isSelected ? Theme.of(context).colorScheme.primary : Theme.of(context).dividerColor),
            boxShadow: isSelected ? [BoxShadow(color: Theme.of(context).colorScheme.primary.withValues(alpha: 0.3), blurRadius: 12, offset: const Offset(0, 4))] : [],
          ),
          child: Row(
            mainAxisSize: MainAxisSize.min,
            children: [
              Icon(icon, size: 18, color: isSelected ? Colors.white : (Theme.of(context).textTheme.bodyMedium?.color?.withValues(alpha: 0.6) ?? Colors.grey)),
              const SizedBox(width: 8),
              Text(
                title,
                style: GoogleFonts.inter(
                  fontWeight: isSelected ? FontWeight.w800 : FontWeight.w700,
                  color: isSelected ? Colors.white : (Theme.of(context).textTheme.bodyMedium?.color ?? Colors.black),
                ),
              ),
            ],
          ),
        ),
      ),
    );
  }
}
