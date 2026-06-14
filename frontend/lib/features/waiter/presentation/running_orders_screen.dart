import 'package:flutter/material.dart';
import 'package:flutter_riverpod/flutter_riverpod.dart';
import 'package:flutter_animate/flutter_animate.dart';
import 'package:google_fonts/google_fonts.dart';
import 'dart:ui';
// lucide_icons removed - using built-in Icons.*
import 'providers/running_orders_provider.dart';

import '../../../core/widgets/responsive_layout.dart';

// --- Theme Colors ---

class RunningOrdersScreen extends ConsumerWidget {
  final bool isStandalone;
  const RunningOrdersScreen({super.key, this.isStandalone = true});

  @override
  Widget build(BuildContext context, WidgetRef ref) {
    final runningOrdersState = ref.watch(runningOrdersProvider);

    Widget content = runningOrdersState.when(
      data: (orders) {
        if (orders.isEmpty) {
          return Center(
            child: Column(
              mainAxisAlignment: MainAxisAlignment.center,
              children: [
                Container(
                  padding: const EdgeInsets.all(32),
                  decoration: BoxDecoration(
                    color: Theme.of(context).colorScheme.tertiary.withValues(alpha: 0.1),
                    shape: BoxShape.circle,
                  ),
                  child: Icon(Icons.check_circle_outline, size: 80, color: Theme.of(context).colorScheme.tertiary),
                ).animate().scale(duration: 600.ms, curve: Curves.easeOutBack),
                const SizedBox(height: 24),
                Text(
                  'All Caught Up!',
                  style: GoogleFonts.inter(color: (Theme.of(context).textTheme.bodyMedium?.color ?? Colors.black), fontSize: 26, fontWeight: FontWeight.w800),
                ).animate().fadeIn(delay: 200.ms).slideY(begin: 0.2, end: 0),
                const SizedBox(height: 12),
                Text(
                  'There are no running orders at the moment.\nTake a breath or check the tables.',
                  textAlign: TextAlign.center,
                  style: GoogleFonts.inter(color: (Theme.of(context).textTheme.bodyMedium?.color?.withValues(alpha: 0.6) ?? Colors.grey), fontSize: 16, fontWeight: FontWeight.w600),
                ).animate().fadeIn(delay: 400.ms).slideY(begin: 0.2, end: 0),
              ],
            ),
          );
        }

        return ResponsiveLayout(
          mobile: _buildMobileLayout(orders),
          tablet: _buildGridLayout(context, orders, 2),
          desktop: _buildGridLayout(context, orders, 3),
        );
      },
      loading: () => Center(child: CircularProgressIndicator(color: Theme.of(context).colorScheme.primary)),
      error: (e, _) => Center(child: Text('Error loading orders: $e', style: GoogleFonts.inter(color: Colors.red))),
    );

    if (!isStandalone) {
      return Column(
        children: [
          Container(
            padding: const EdgeInsets.symmetric(horizontal: 24, vertical: 16),
            decoration: BoxDecoration(
              color: Theme.of(context).cardTheme.color ?? Theme.of(context).colorScheme.surface,
              border: Border(bottom: BorderSide(color: Theme.of(context).dividerColor)),
            ),
            child: Row(
              mainAxisAlignment: MainAxisAlignment.spaceBetween,
              children: [
                Row(
                  children: [
                    Container(
                      padding: const EdgeInsets.all(8),
                      decoration: BoxDecoration(color: Colors.orange.withValues(alpha: 0.1), borderRadius: BorderRadius.circular(10)),
                      child: Icon(Icons.trending_up, color: Colors.orange, size: 20),
                    ),
                    const SizedBox(width: 12),
                    Text('Running Orders', style: GoogleFonts.inter(color: (Theme.of(context).textTheme.bodyMedium?.color ?? Colors.black), fontSize: 22, fontWeight: FontWeight.w800)),
                  ],
                ),
                IconButton(
                  icon: Icon(Icons.refresh, color: (Theme.of(context).textTheme.bodyMedium?.color?.withValues(alpha: 0.6) ?? Colors.grey)),
                  onPressed: () => ref.read(runningOrdersProvider.notifier).fetchRunningOrders('main-branch'),
                )
              ],
            ),
          ),
          Expanded(child: content),
        ],
      );
    }

    return Scaffold(
      backgroundColor: Theme.of(context).scaffoldBackgroundColor,
      appBar: AppBar(
        backgroundColor: Theme.of(context).cardTheme.color ?? Theme.of(context).colorScheme.surface,
        elevation: 0,
        centerTitle: false,
        iconTheme: IconThemeData(color: (Theme.of(context).textTheme.bodyMedium?.color ?? Colors.black)),
        title: Text('Running Orders', style: GoogleFonts.inter(color: (Theme.of(context).textTheme.bodyMedium?.color ?? Colors.black), fontWeight: FontWeight.w800)),
        actions: [
          IconButton(
            icon: Icon(Icons.refresh, color: (Theme.of(context).textTheme.bodyMedium?.color?.withValues(alpha: 0.6) ?? Colors.grey)),
            onPressed: () => ref.read(runningOrdersProvider.notifier).fetchRunningOrders('main-branch'),
          ),
          const SizedBox(width: 16),
        ],
        bottom: PreferredSize(
          preferredSize: const Size.fromHeight(1),
          child: Container(color: Theme.of(context).dividerColor, height: 1),
        ),
      ),
      body: content,
    );
  }

  Widget _buildMobileLayout(List<dynamic> orders) {
    return ListView.separated(
      padding: const EdgeInsets.all(24),
      itemCount: orders.length,
      separatorBuilder: (_, _) => const SizedBox(height: 16),
      itemBuilder: (context, index) {
        return _OrderCard(kitchenOrder: orders[index], isGrid: false);
      },
    );
  }

  Widget _buildGridLayout(BuildContext context, List<dynamic> orders, int crossAxisCount) {
    return GridView.builder(
      padding: const EdgeInsets.all(24),
      gridDelegate: SliverGridDelegateWithFixedCrossAxisCount(
        crossAxisCount: crossAxisCount,
        childAspectRatio: 1.2,
        crossAxisSpacing: 20,
        mainAxisSpacing: 20,
      ),
      itemCount: orders.length,
      itemBuilder: (context, index) {
        return _OrderCard(kitchenOrder: orders[index], isGrid: true);
      },
    );
  }
}

class _OrderCard extends ConsumerWidget {
  final dynamic kitchenOrder;
  final bool isGrid;

  const _OrderCard({required this.kitchenOrder, this.isGrid = false});

  @override
  Widget build(BuildContext context, WidgetRef ref) {
    final status = kitchenOrder['status'] as String;
    final orderDetails = kitchenOrder['order'];
    
    Color statusColor;
    Color statusBgColor;
    IconData statusIcon;
    switch (status) {
      case 'Pending': 
        statusColor = Colors.orange; 
        statusBgColor = Colors.orange.withValues(alpha: 0.1);
        statusIcon = Icons.access_time;
        break;
      case 'Preparing': 
        statusColor = Theme.of(context).colorScheme.tertiary; 
        statusBgColor = Theme.of(context).colorScheme.tertiary.withValues(alpha: 0.1);
        statusIcon = Icons.restaurant_menu;
        break;
      case 'Ready': 
        statusColor = Theme.of(context).colorScheme.secondary; 
        statusBgColor = Theme.of(context).colorScheme.secondary.withValues(alpha: 0.1);
        statusIcon = Icons.notifications_active;
        break;
      default: 
        statusColor = (Theme.of(context).textTheme.bodyMedium?.color?.withValues(alpha: 0.6) ?? Colors.grey);
        statusBgColor = (Theme.of(context).textTheme.bodyMedium?.color?.withValues(alpha: 0.6) ?? Colors.grey).withValues(alpha: 0.1);
        statusIcon = Icons.help_outline;
    }

    Widget card = ClipRRect(
      borderRadius: BorderRadius.circular(20),
      child: BackdropFilter(
        filter: ImageFilter.blur(sigmaX: 10, sigmaY: 10),
        child: AnimatedContainer(
          duration: const Duration(milliseconds: 300),
          decoration: BoxDecoration(
            color: (Theme.of(context).cardTheme.color ?? Theme.of(context).colorScheme.surface).withValues(alpha: 0.7),
            borderRadius: BorderRadius.circular(20),
            border: Border.all(color: status == 'Ready' ? Theme.of(context).colorScheme.secondary : Colors.white.withValues(alpha: 0.1), width: status == 'Ready' ? 2 : 1.5),
            boxShadow: [
              BoxShadow(
                color: (status == 'Ready' ? Theme.of(context).colorScheme.secondary : Colors.black).withValues(alpha: status == 'Ready' ? 0.2 : 0.05), 
                blurRadius: status == 'Ready' ? 20 : 12, 
                offset: const Offset(0, 4)
              )
            ],
          ),
          child: Column(
            crossAxisAlignment: CrossAxisAlignment.stretch,
            children: [
              // Header
              Container(
                padding: const EdgeInsets.symmetric(horizontal: 20, vertical: 16),
                decoration: BoxDecoration(
                  color: Theme.of(context).scaffoldBackgroundColor.withValues(alpha: 0.5),
                  border: Border(bottom: BorderSide(color: Theme.of(context).dividerColor.withValues(alpha: 0.3))),
                ),
              child: Row(
                mainAxisAlignment: MainAxisAlignment.spaceBetween,
                children: [
                  Builder(builder: (context) {
                    final idStr = (orderDetails['id'] ?? 'N/A').toString();
                    final displayId = idStr.length > 8 ? idStr.substring(0, 8) : idStr;
                    return Text('Order #$displayId', style: GoogleFonts.inter(fontWeight: FontWeight.w800, fontSize: 16, color: (Theme.of(context).textTheme.bodyMedium?.color ?? Colors.black)));
                  }),
                  AnimatedSwitcher(
                    duration: const Duration(milliseconds: 300),
                    transitionBuilder: (child, anim) => ScaleTransition(scale: anim, child: child),
                    child: Container(
                      key: ValueKey(status),
                      padding: const EdgeInsets.symmetric(horizontal: 10, vertical: 6),
                      decoration: BoxDecoration(color: statusBgColor, borderRadius: BorderRadius.circular(12), border: Border.all(color: statusColor.withValues(alpha: 0.3))),
                      child: Row(
                        mainAxisSize: MainAxisSize.min,
                        children: [
                          Icon(statusIcon, color: statusColor, size: 14),
                          const SizedBox(width: 6),
                          Text(status.toUpperCase(), style: GoogleFonts.inter(color: statusColor, fontWeight: FontWeight.w800, fontSize: 12, letterSpacing: 1)),
                        ],
                      ),
                    ),
                  )
                ],
              ),
            ),
            
            // Items
            if (isGrid)
              Expanded(
                child: Padding(
                  padding: const EdgeInsets.all(20),
                  child: Column(
                    crossAxisAlignment: CrossAxisAlignment.start,
                    children: [
                      Text('Items:', style: GoogleFonts.inter(fontWeight: FontWeight.w800, color: (Theme.of(context).textTheme.bodyMedium?.color?.withValues(alpha: 0.6) ?? Colors.grey), fontSize: 13, letterSpacing: 1)),
                      const SizedBox(height: 12),
                      Expanded(
                        child: ListView(
                          shrinkWrap: true,
                          children: _buildItemsList(context, orderDetails),
                        ),
                      ),
                    ],
                  ),
                ),
              )
            else
              Padding(
                padding: const EdgeInsets.all(20),
                child: Column(
                  mainAxisSize: MainAxisSize.min,
                  crossAxisAlignment: CrossAxisAlignment.start,
                  children: [
                    Text('Items:', style: GoogleFonts.inter(fontWeight: FontWeight.w800, color: (Theme.of(context).textTheme.bodyMedium?.color?.withValues(alpha: 0.6) ?? Colors.grey), fontSize: 13, letterSpacing: 1)),
                    const SizedBox(height: 12),
                    ..._buildItemsList(context, orderDetails),
                  ],
                ),
              ),
            
            // Actions
            if (status == 'Pending' || status == 'Ready')
              Container(
                padding: const EdgeInsets.all(16),
                decoration: BoxDecoration(
                  border: Border(top: BorderSide(color: Theme.of(context).dividerColor.withValues(alpha: 0.3))),
                  color: Theme.of(context).scaffoldBackgroundColor.withValues(alpha: 0.5),
                ),
                child: Row(
                  mainAxisAlignment: MainAxisAlignment.end,
                  children: [
                    if (status == 'Pending')
                      TextButton.icon(
                        icon: Icon(Icons.edit_outlined, size: 18),
                        label: Text('Modify', style: GoogleFonts.inter(fontWeight: FontWeight.w700)),
                        style: TextButton.styleFrom(foregroundColor: Theme.of(context).colorScheme.primary),
                        onPressed: () {},
                      ),
                    if (status == 'Ready')
                      ElevatedButton.icon(
                        icon: Icon(Icons.check_box_outlined, size: 18),
                        label: Text('MARK SERVED', style: GoogleFonts.inter(fontWeight: FontWeight.w800, letterSpacing: 1)),
                        style: ElevatedButton.styleFrom(
                          backgroundColor: Theme.of(context).colorScheme.secondary, 
                          foregroundColor: Colors.white,
                          shape: RoundedRectangleBorder(borderRadius: BorderRadius.circular(12)),
                          padding: const EdgeInsets.symmetric(horizontal: 20, vertical: 12),
                          elevation: 0,
                        ),
                        onPressed: () {
                          ref.read(runningOrdersProvider.notifier).markAsServed(kitchenOrder['id'].toString());
                        },
                      )
                  ],
                ),
              )
          ],
        ),
      ),
    ),
  );

    if (status == 'Ready') {
      return card.animate(onPlay: (controller) => controller.repeat(reverse: true))
          .shimmer(duration: 2000.ms, color: Theme.of(context).colorScheme.secondary.withValues(alpha: 0.2));
    }

    return card;
  }

  List<Widget> _buildItemsList(BuildContext context, dynamic orderDetails) {
    return ((orderDetails['items'] as List).map((item) {
      return Padding(
        padding: const EdgeInsets.only(bottom: 12),
        child: Row(
          crossAxisAlignment: CrossAxisAlignment.start,
          children: [
            Container(
              padding: const EdgeInsets.symmetric(horizontal: 8, vertical: 4),
              decoration: BoxDecoration(color: Theme.of(context).colorScheme.primary.withValues(alpha: 0.1), borderRadius: BorderRadius.circular(6)),
              child: Text('${item['quantity']}x', style: GoogleFonts.inter(fontWeight: FontWeight.w800, color: Theme.of(context).colorScheme.primary, fontSize: 14)),
            ),
            const SizedBox(width: 12),
            Expanded(
              child: Column(
                crossAxisAlignment: CrossAxisAlignment.start,
                children: [
                  Text(item['product']['name'], style: GoogleFonts.inter(color: (Theme.of(context).textTheme.bodyMedium?.color ?? Colors.black), fontWeight: FontWeight.w700, fontSize: 15)),
                  if (item['notes'] != null && item['notes'].toString().isNotEmpty) ...[
                    const SizedBox(height: 4),
                    Row(
                      children: [
                        Icon(Icons.comment_outlined, size: 12, color: Colors.orange),
                        const SizedBox(width: 4),
                        Text('${item['notes']}', style: GoogleFonts.inter(color: Colors.orange, fontWeight: FontWeight.w600, fontSize: 13)),
                      ],
                    ),
                  ]
                ],
              ),
            ),
          ],
        ),
      );
    }).toList());
  }
}
