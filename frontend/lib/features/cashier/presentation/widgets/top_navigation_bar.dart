import 'dart:ui';
import 'package:flutter/material.dart';
import 'package:flutter_riverpod/flutter_riverpod.dart';
import 'package:google_fonts/google_fonts.dart';
// lucide_icons removed - using built-in Icons.*

import '../../domain/models/order.dart';
import '../../../auth/presentation/login_screen.dart';
import '../providers/cart_provider.dart';
import '../providers/cashier_providers.dart';
import 'receipt_history_dialog.dart';
import 'daily_closing_dialog.dart';
import '../../../../core/widgets/theme_toggle_widget.dart';
import '../../../../core/utils/bluetooth_printer_service.dart';
import '../../../../core/widgets/bluetooth_printer_settings_dialog.dart';

// --- Theme Colors ---

class POSTopNavigationBar extends ConsumerWidget {
  final OrderType selectedOrderType;
  final ValueChanged<OrderType> onOrderTypeChanged;

  const POSTopNavigationBar({
    super.key,
    required this.selectedOrderType,
    required this.onOrderTypeChanged,
  });

  @override
  Widget build(BuildContext context, WidgetRef ref) {
    final cartState = ref.watch(cartProvider);
    
    return LayoutBuilder(
      builder: (context, constraints) {
        final isMobile = constraints.maxWidth < 1024;

        return Container(
          padding: EdgeInsets.symmetric(horizontal: isMobile ? 16 : 24, vertical: 12),
          decoration: BoxDecoration(
            color: Theme.of(context).cardTheme.color ?? Theme.of(context).colorScheme.surface.withValues(alpha: 0.8),
            border: Border(bottom: BorderSide(color: Theme.of(context).dividerColor, width: 1.5)),
            boxShadow: [BoxShadow(color: Colors.black.withValues(alpha: 0.02), blurRadius: 10, offset: const Offset(0, 4))],
          ),
          child: ClipRRect(
            child: BackdropFilter(
              filter: ImageFilter.blur(sigmaX: 10, sigmaY: 10),
              child: isMobile 
                ? _buildMobileLayout(context, ref, cartState)
                : _buildDesktopLayout(context, ref, cartState),
            ),
          ),
        );
      }
    );
  }

  Widget _buildMobileLayout(BuildContext context, WidgetRef ref, CartState cartState) {
    return Column(
      crossAxisAlignment: CrossAxisAlignment.stretch,
      children: [
        Row(
          mainAxisAlignment: MainAxisAlignment.spaceBetween,
          children: [
            Row(
              children: [
                Container(
                  width: 40,
                  height: 40,
                  decoration: BoxDecoration(
                    color: Theme.of(context).colorScheme.primary.withValues(alpha: 0.1),
                    borderRadius: BorderRadius.circular(12),
                  ),
                  child: Icon(Icons.restaurant, color: Theme.of(context).colorScheme.primary, size: 20),
                ),
                const SizedBox(width: 12),
                Text('Ashn POS', style: GoogleFonts.inter(color: (Theme.of(context).textTheme.bodyMedium?.color ?? Colors.black), fontSize: 18, fontWeight: FontWeight.w800)),
              ],
            ),
            Row(
              children: [
                _buildActionIconButton(
                  context,
                  icon: Icons.history,
                  tooltip: 'Receipt History',
                  onPressed: () => showDialog(context: context, builder: (_) => const ReceiptHistoryDialog()),
                ),
                const SizedBox(width: 8),
                _buildActionIconButton(
                  context,
                  icon: Icons.account_balance_wallet_outlined,
                  tooltip: 'Daily Closing',
                  onPressed: () => showDialog(context: context, builder: (_) => const DailyClosingDialog()),
                ),
                const SizedBox(width: 8),
                // Theme Toggle
                const ThemeToggleWidget(compact: true),
                const SizedBox(width: 8),
                const BluetoothStatusIcon(),
              ],
            )
          ],
        ),
        const SizedBox(height: 16),
        Row(
          children: [
            Expanded(
              child: _buildOrderTypeSelector(context, isMobile: true),
            ),
            if (selectedOrderType == OrderType.dineIn) ...[
              const SizedBox(width: 12),
              Expanded(
                child: _buildTableSelector(context, ref, cartState, isMobile: true),
              ),
            ],
          ],
        )
      ],
    );
  }

  Widget _buildDesktopLayout(BuildContext context, WidgetRef ref, CartState cartState) {
    return Row(
      children: [
        // Logo Area
        Row(
          children: [
            Container(
              width: 48,
              height: 48,
              decoration: BoxDecoration(
                color: Theme.of(context).colorScheme.primary,
                borderRadius: BorderRadius.circular(14),
                boxShadow: [BoxShadow(color: Theme.of(context).colorScheme.primary.withValues(alpha: 0.3), blurRadius: 12, offset: const Offset(0, 4))],
              ),
              child: Icon(Icons.store_outlined, color: Colors.white, size: 24),
            ),
            const SizedBox(width: 16),
            Column(
              crossAxisAlignment: CrossAxisAlignment.start,
              children: [
                Text('Ashn POS', style: GoogleFonts.inter(color: (Theme.of(context).textTheme.bodyMedium?.color ?? Colors.black), fontSize: 20, fontWeight: FontWeight.w800, letterSpacing: -0.5)),
                Text('Terminal 01', style: GoogleFonts.inter(color: (Theme.of(context).textTheme.bodyMedium?.color?.withValues(alpha: 0.6) ?? Colors.grey), fontSize: 12, fontWeight: FontWeight.w600)),
              ],
            ),
          ],
        ),
        const SizedBox(width: 24),
        
        // Global Search
        Expanded(
          child: Container(
            height: 48,
            padding: const EdgeInsets.symmetric(horizontal: 16),
            decoration: BoxDecoration(
              color: const Color(0xFFF1F5F9), // Slate 100
              borderRadius: BorderRadius.circular(14),
              border: Border.all(color: Theme.of(context).dividerColor),
            ),
            child: Row(
              children: [
                Icon(Icons.search, color: (Theme.of(context).textTheme.bodyMedium?.color?.withValues(alpha: 0.6) ?? Colors.grey), size: 20),
                const SizedBox(width: 12),
                Expanded(
                  child: TextField(
                    style: GoogleFonts.inter(color: (Theme.of(context).textTheme.bodyMedium?.color ?? Colors.black), fontWeight: FontWeight.w600),
                    decoration: InputDecoration(
                      hintText: 'Search products (Press / to focus)',
                      hintStyle: GoogleFonts.inter(color: (Theme.of(context).textTheme.bodyMedium?.color?.withValues(alpha: 0.6) ?? Colors.grey), fontWeight: FontWeight.w500),
                      border: InputBorder.none,
                      isDense: true,
                    ),
                  ),
                ),
                Container(
                  padding: const EdgeInsets.all(4),
                  decoration: BoxDecoration(color: Colors.white, borderRadius: BorderRadius.circular(6), border: Border.all(color: Theme.of(context).dividerColor)),
                  child: Icon(Icons.qr_code_scanner, color: (Theme.of(context).textTheme.bodyMedium?.color?.withValues(alpha: 0.6) ?? Colors.grey), size: 16),
                ),
              ],
            ),
          ),
        ),
        const SizedBox(width: 24),
        
        // Order Type Selector
        _buildOrderTypeSelector(context, isMobile: false),
        
        // Dynamic Table Selector for Dine In
        if (selectedOrderType == OrderType.dineIn) ...[
          const SizedBox(width: 12),
          _buildTableSelector(context, ref, cartState, isMobile: false),
        ],
        
        const SizedBox(width: 24),
        
        // Action Icons
        _buildActionIconButton(
          context,
          icon: Icons.receipt_long_outlined,
          tooltip: 'Receipt History',
          onPressed: () => showDialog(context: context, builder: (_) => const ReceiptHistoryDialog()),
        ),
        const SizedBox(width: 8),
        _buildActionIconButton(
          context,
          icon: Icons.calculate_outlined,
          tooltip: 'Daily Closing',
          onPressed: () => showDialog(context: context, builder: (_) => const DailyClosingDialog()),
        ),
        const SizedBox(width: 8),
        // Theme Toggle
        const ThemeToggleWidget(compact: true),
        const SizedBox(width: 8),
        const BluetoothStatusIcon(),
        const SizedBox(width: 16),
        Container(width: 1.5, height: 32, color: Theme.of(context).dividerColor),
        const SizedBox(width: 16),

        // Cashier Profile
        Container(
          padding: const EdgeInsets.all(6),
          decoration: BoxDecoration(
            color: const Color(0xFFF8FAFC),
            borderRadius: BorderRadius.circular(30),
            border: Border.all(color: Theme.of(context).dividerColor),
          ),
          child: Row(
            children: [
              Container(
                width: 36, height: 36,
                decoration: BoxDecoration(color: Theme.of(context).colorScheme.primary, shape: BoxShape.circle),
                alignment: Alignment.center,
                child: Text('SA', style: GoogleFonts.inter(fontWeight: FontWeight.w800, color: Colors.white, fontSize: 13)),
              ),
              const SizedBox(width: 12),
              Column(
                crossAxisAlignment: CrossAxisAlignment.start,
                children: [
                  Text('Sehas Ashan', style: GoogleFonts.inter(color: (Theme.of(context).textTheme.bodyMedium?.color ?? Colors.black), fontSize: 14, fontWeight: FontWeight.w800)),
                  Text('Cashier', style: GoogleFonts.inter(color: (Theme.of(context).textTheme.bodyMedium?.color?.withValues(alpha: 0.6) ?? Colors.grey), fontSize: 11, fontWeight: FontWeight.w600)),
                ],
              ),
              const SizedBox(width: 12),
              Material(
                color: Colors.transparent,
                child: InkWell(
                  borderRadius: BorderRadius.circular(20),
                  onTap: () {
                    Navigator.pushAndRemoveUntil(
                      context,
                      MaterialPageRoute(builder: (context) => const LoginScreen()),
                      (route) => false,
                    );
                  },
                  child: Container(
                    padding: const EdgeInsets.all(8),
                    decoration: BoxDecoration(color: Theme.of(context).colorScheme.error.withValues(alpha: 0.1), shape: BoxShape.circle),
                    child: Icon(Icons.logout, color: Theme.of(context).colorScheme.error, size: 16),
                  ),
                ),
              ),
            ],
          ),
        ),
      ],
    );
  }

  Widget _buildActionIconButton(BuildContext context, {required IconData icon, required String tooltip, required VoidCallback onPressed}) {
    return Container(
      decoration: BoxDecoration(
        color: Theme.of(context).cardTheme.color ?? Theme.of(context).colorScheme.surface,
        borderRadius: BorderRadius.circular(12),
        border: Border.all(color: Theme.of(context).dividerColor),
        boxShadow: [BoxShadow(color: Colors.black.withValues(alpha: 0.02), blurRadius: 4, offset: const Offset(0, 2))],
      ),
      child: IconButton(
        icon: Icon(icon, color: (Theme.of(context).textTheme.bodyMedium?.color ?? Colors.black), size: 20),
        tooltip: tooltip,
        onPressed: onPressed,
      ),
    );
  }

  Widget _buildOrderTypeSelector(BuildContext context, {bool isMobile = false}) {
    return Container(
      height: 48,
      padding: const EdgeInsets.symmetric(horizontal: 16),
      decoration: BoxDecoration(
        color: Theme.of(context).colorScheme.primary.withValues(alpha: 0.05),
        borderRadius: BorderRadius.circular(14),
        border: Border.all(color: Theme.of(context).colorScheme.primary.withValues(alpha: 0.2)),
      ),
      child: DropdownButtonHideUnderline(
        child: DropdownButton<OrderType>(
          value: selectedOrderType,
          dropdownColor: Theme.of(context).cardTheme.color ?? Theme.of(context).colorScheme.surface,
          icon: Icon(Icons.keyboard_arrow_down, color: Theme.of(context).colorScheme.primary, size: 18),
          isExpanded: isMobile,
          borderRadius: BorderRadius.circular(16),
          items: OrderType.values.map((type) {
            IconData typeIcon;
            switch(type) {
              case OrderType.dineIn: typeIcon = Icons.coffee; break;
              case OrderType.takeAway: typeIcon = Icons.shopping_bag_outlined; break;
              case OrderType.delivery: typeIcon = Icons.delivery_dining; break;
            }
            return DropdownMenuItem(
              value: type,
              child: Row(
                children: [
                  Icon(typeIcon, color: Theme.of(context).colorScheme.primary, size: 18),
                  const SizedBox(width: 10),
                  Text(
                    type.name.toUpperCase(),
                    style: GoogleFonts.inter(color: Theme.of(context).colorScheme.primary, fontWeight: FontWeight.w800, fontSize: 13),
                    overflow: TextOverflow.ellipsis,
                  ),
                ],
              ),
            );
          }).toList(),
          onChanged: (val) {
            if (val != null) onOrderTypeChanged(val);
          },
        ),
      ),
    );
  }

  Widget _buildTableSelector(BuildContext context, WidgetRef ref, CartState cartState, {bool isMobile = false}) {
    final tablesAsyncValue = ref.watch(tablesProvider);

    return Container(
      height: 48,
      padding: const EdgeInsets.symmetric(horizontal: 16),
      decoration: BoxDecoration(
        color: Theme.of(context).cardTheme.color ?? Theme.of(context).colorScheme.surface,
        borderRadius: BorderRadius.circular(14),
        border: Border.all(color: Theme.of(context).dividerColor),
        boxShadow: [BoxShadow(color: Colors.black.withValues(alpha: 0.02), blurRadius: 4, offset: const Offset(0, 2))],
      ),
      child: tablesAsyncValue.when(
        data: (tables) {
          return DropdownButtonHideUnderline(
            child: DropdownButton<String>(
              hint: Text('Select Table', style: GoogleFonts.inter(color: Colors.orange, fontWeight: FontWeight.w800)),
              value: cartState.tableNumber,
              dropdownColor: Theme.of(context).cardTheme.color ?? Theme.of(context).colorScheme.surface,
              icon: Icon(Icons.keyboard_arrow_down, color: (Theme.of(context).textTheme.bodyMedium?.color?.withValues(alpha: 0.6) ?? Colors.grey), size: 18),
              isExpanded: isMobile,
              borderRadius: BorderRadius.circular(16),
              items: tables.map<DropdownMenuItem<String>>((table) {
                final status = table['status'] as String;
                final color = status == 'Available' ? Theme.of(context).colorScheme.secondary : (status == 'Occupied' ? Theme.of(context).colorScheme.error : Colors.orange);
                return DropdownMenuItem<String>(
                  value: table['name'],
                  child: Row(
                    children: [
                      Container(
                        width: 10, height: 10,
                        decoration: BoxDecoration(color: color, shape: BoxShape.circle, boxShadow: [BoxShadow(color: color.withValues(alpha: 0.4), blurRadius: 4)]),
                      ),
                      const SizedBox(width: 10),
                      Text(table['name'], style: GoogleFonts.inter(color: (Theme.of(context).textTheme.bodyMedium?.color ?? Colors.black), fontWeight: FontWeight.w700)),
                    ],
                  ),
                );
              }).toList(),
              onChanged: (val) {
                ref.read(cartProvider.notifier).setOrderDetails(tableNumber: val);
              },
            ),
          );
        },
        loading: () => Center(child: SizedBox(width: 20, height: 20, child: CircularProgressIndicator(strokeWidth: 2, color: Theme.of(context).colorScheme.primary))),
        error: (_, _) => Row(
          mainAxisAlignment: MainAxisAlignment.center,
          children: [
            Icon(Icons.error_outline, color: Theme.of(context).colorScheme.error, size: 18),
            const SizedBox(width: 8),
            Text('No Tables', style: GoogleFonts.inter(color: Theme.of(context).colorScheme.error, fontSize: 13, fontWeight: FontWeight.w800)),
          ],
        ),
      ),
    );
  }
}

class BluetoothStatusIcon extends StatelessWidget {
  const BluetoothStatusIcon({super.key});

  @override
  Widget build(BuildContext context) {
    return ValueListenableBuilder<BluetoothPrinter?>(
      valueListenable: BluetoothPrinterService.instance.connectedPrinter,
      builder: (context, connected, _) {
        final isConnected = connected != null;
        return Container(
          decoration: BoxDecoration(
            color: isConnected 
                ? Theme.of(context).colorScheme.primary.withValues(alpha: 0.1) 
                : Theme.of(context).cardTheme.color ?? Theme.of(context).colorScheme.surface,
            borderRadius: BorderRadius.circular(12),
            border: Border.all(
              color: isConnected 
                  ? Theme.of(context).colorScheme.primary.withValues(alpha: 0.3) 
                  : Theme.of(context).dividerColor,
            ),
          ),
          child: IconButton(
            icon: Icon(
              isConnected ? Icons.bluetooth_connected : Icons.bluetooth,
              color: isConnected 
                  ? Theme.of(context).colorScheme.primary 
                  : (Theme.of(context).textTheme.bodyMedium?.color?.withValues(alpha: 0.6) ?? Colors.grey),
              size: 20,
            ),
            tooltip: isConnected ? 'Printer: ${connected.name}' : 'Configure Bluetooth Printer',
            onPressed: () => BluetoothPrinterSettingsDialog.show(context),
          ),
        );
      },
    );
  }
}

