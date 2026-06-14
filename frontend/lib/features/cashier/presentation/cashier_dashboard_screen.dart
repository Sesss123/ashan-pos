import '../../../core/utils/app_currency.dart';
import 'package:flutter/material.dart';
import 'package:flutter_riverpod/flutter_riverpod.dart';
import 'package:flutter_animate/flutter_animate.dart';
import 'package:google_fonts/google_fonts.dart';

import 'providers/cart_provider.dart';
import 'providers/cashier_providers.dart';
import 'providers/notifications_provider.dart';
import 'widgets/menu_section.dart';
import 'widgets/order_cart_section.dart';
import 'widgets/daily_closing_dialog.dart';
import '../../../core/widgets/responsive_layout.dart';
import '../../../core/widgets/theme_toggle_widget.dart';
import 'widgets/orders_module_view.dart';
import 'widgets/customers_module_view.dart';
import 'widgets/table_actions_dialog.dart';
import 'widgets/profile_module_view.dart';
import '../../auth/presentation/login_screen.dart';
import '../../../core/realtime/socket_provider.dart';
import '../../waiter/presentation/providers/running_orders_provider.dart';
import '../domain/models/order.dart';
import '../../../core/theme/app_colors.dart';
import 'package:hive_flutter/hive_flutter.dart';

class CashierDashboardScreen extends ConsumerStatefulWidget {
  const CashierDashboardScreen({super.key});

  @override
  ConsumerState<CashierDashboardScreen> createState() => _CashierDashboardScreenState();
}

class _CashierDashboardScreenState extends ConsumerState<CashierDashboardScreen> {
  int _bottomNavIndex = 0; // POS is default

  @override
  void initState() {
    super.initState();
  }

  @override
  void dispose() {
    super.dispose();
  }

  @override
  Widget build(BuildContext context) {
    final cartState = ref.watch(cartProvider);
    final tablesState = ref.watch(tablesProvider);
    final ordersState = ref.watch(runningOrdersProvider);
    ref.watch(realTimeSyncProvider); // Enable Real-time Sync

    return Scaffold(
      backgroundColor: Theme.of(context).scaffoldBackgroundColor,
      body: SafeArea(
        child: _buildBodyContent(context, tablesState, ordersState),
      ),
      bottomNavigationBar: _buildBottomNav(),
      floatingActionButton: _bottomNavIndex == 0 && (ResponsiveLayout.isMobile(context) || (ResponsiveLayout.isTablet(context) && MediaQuery.of(context).size.width < 800))
          ? Container(
              margin: const EdgeInsets.symmetric(horizontal: 16),
              child: InkWell(
                onTap: () => _showCartBottomSheet(context),
                borderRadius: BorderRadius.circular(16),
                child: Container(
                  height: 64,
                  decoration: BoxDecoration(
                    color: Theme.of(context).colorScheme.primary,
                    borderRadius: BorderRadius.circular(16),
                    boxShadow: [
                      BoxShadow(color: Theme.of(context).colorScheme.primary.withValues(alpha: 0.3), blurRadius: 20, offset: const Offset(0, 8))
                    ],
                  ),
                  padding: const EdgeInsets.symmetric(horizontal: 24),
                  child: Row(
                    mainAxisAlignment: MainAxisAlignment.spaceBetween,
                    children: [
                      Row(
                        children: [
                          Container(
                            padding: const EdgeInsets.all(8),
                            decoration: BoxDecoration(color: Colors.white.withValues(alpha: 0.2), borderRadius: BorderRadius.circular(12)),
                            child: const Icon(Icons.shopping_cart_outlined, color: Colors.white, size: 20),
                          ),
                          const SizedBox(width: 16),
                          Text(
                            '${cartState.items.length} Items',
                            style: GoogleFonts.inter(color: Colors.white, fontWeight: FontWeight.w700, fontSize: 16),
                          ),
                        ],
                      ),
                      Text(
                        AppCurrency.format(cartState.grandTotal),
                        style: GoogleFonts.inter(color: Colors.white, fontWeight: FontWeight.w800, fontSize: 18),
                      ),
                    ],
                  ),
                ),
              ),
            ).animate().slideY(begin: 1, end: 0, curve: Curves.easeOutQuart, duration: 600.ms)
          : null,
      floatingActionButtonLocation: FloatingActionButtonLocation.centerFloat,
    );
  }

  Widget _buildBodyContent(BuildContext context, AsyncValue<List<dynamic>> tablesState, AsyncValue<List<dynamic>> ordersState) {
    switch (_bottomNavIndex) {
      case 0:
        return ResponsiveLayout(
          mobile: _buildMobileLayout(context, tablesState, ordersState),
          tablet: _buildTabletLayout(context, tablesState, ordersState),
          desktop: _buildDesktopLayout(context, tablesState, ordersState),
        );
      case 1:
        return const OrdersModuleView();
      case 2:
        return const CustomersModuleView();
      case 3:
        return const ProfileModuleView();
      default:
        return const SizedBox();
    }
  }

  Widget _buildMobileLayout(BuildContext context, AsyncValue<List<dynamic>> tablesState, AsyncValue<List<dynamic>> ordersState) {
    return Container(
      padding: const EdgeInsets.symmetric(horizontal: 16, vertical: 8),
      child: CustomScrollView(
        slivers: [
          SliverToBoxAdapter(child: _buildHeader(isMobile: true)),
          const SliverToBoxAdapter(child: SizedBox(height: 32)),
          SliverToBoxAdapter(child: _buildKPICards(tablesState, ordersState, ref.watch(currentShiftProvider), isMobile: true)),
          const SliverToBoxAdapter(child: SizedBox(height: 32)),
          const SliverToBoxAdapter(child: POSMenuSection(shrinkWrap: true, physics: NeverScrollableScrollPhysics())),
          const SliverToBoxAdapter(child: SizedBox(height: 32)),
          SliverToBoxAdapter(child: Text('Restaurant Floor Map', style: GoogleFonts.inter(color: (Theme.of(context).textTheme.bodyMedium?.color ?? Colors.black), fontSize: 20, fontWeight: FontWeight.w800))),
          const SliverToBoxAdapter(child: SizedBox(height: 16)),
          SliverToBoxAdapter(child: _buildLiveTableMap(tablesState)),
          const SliverToBoxAdapter(child: SizedBox(height: 32)),
          SliverToBoxAdapter(child: _buildQuickActions(context, isMobile: true)),
          const SliverToBoxAdapter(child: SizedBox(height: 32)),
          SliverToBoxAdapter(child: _buildKitchenStatusWidget(ordersState)),
        ],
      ),
    );
  }

  Widget _buildTabletLayout(BuildContext context, AsyncValue<List<dynamic>> tablesState, AsyncValue<List<dynamic>> ordersState) {
    if (MediaQuery.of(context).size.width < 800) {
      return Container(
        padding: const EdgeInsets.all(24),
        child: CustomScrollView(
          slivers: [
            SliverToBoxAdapter(child: _buildHeader()),
            const SliverToBoxAdapter(child: SizedBox(height: 32)),
            SliverToBoxAdapter(child: _buildKPICards(tablesState, ordersState, ref.watch(currentShiftProvider))),
            const SliverToBoxAdapter(child: SizedBox(height: 32)),
            const SliverToBoxAdapter(child: POSMenuSection(shrinkWrap: true, physics: NeverScrollableScrollPhysics())),
            const SliverToBoxAdapter(child: SizedBox(height: 32)),
            SliverToBoxAdapter(child: Text('Restaurant Floor Map', style: GoogleFonts.inter(color: (Theme.of(context).textTheme.bodyMedium?.color ?? Colors.black), fontSize: 20, fontWeight: FontWeight.w800))),
            const SliverToBoxAdapter(child: SizedBox(height: 16)),
            SliverToBoxAdapter(
              child: SizedBox(height: 400, child: _buildLiveTableMap(tablesState)),
            ),
            const SliverToBoxAdapter(child: SizedBox(height: 32)),
            SliverToBoxAdapter(child: _buildQuickActions(context)),
            const SliverToBoxAdapter(child: SizedBox(height: 32)),
            SliverToBoxAdapter(child: _buildKitchenStatusWidget(ordersState)),
          ],
        ),
      );
    }
    
    return Row(
      children: [
        Expanded(
          flex: 60,
          child: Container(
            padding: const EdgeInsets.all(24),
            child: CustomScrollView(
              slivers: [
                SliverToBoxAdapter(child: _buildHeader()),
                const SliverToBoxAdapter(child: SizedBox(height: 32)),
                SliverToBoxAdapter(child: _buildKPICards(tablesState, ordersState, ref.watch(currentShiftProvider))),
                const SliverToBoxAdapter(child: SizedBox(height: 32)),
                const SliverToBoxAdapter(child: POSMenuSection(shrinkWrap: true, physics: NeverScrollableScrollPhysics())),
                const SliverToBoxAdapter(child: SizedBox(height: 32)),
                SliverToBoxAdapter(child: Text('Restaurant Floor Map', style: GoogleFonts.inter(color: (Theme.of(context).textTheme.bodyMedium?.color ?? Colors.black), fontSize: 20, fontWeight: FontWeight.w800))),
                const SliverToBoxAdapter(child: SizedBox(height: 16)),
                SliverToBoxAdapter(
                  child: SizedBox(height: 400, child: _buildLiveTableMap(tablesState)),
                ),
                const SliverToBoxAdapter(child: SizedBox(height: 32)),
                SliverToBoxAdapter(child: _buildQuickActions(context)),
                const SliverToBoxAdapter(child: SizedBox(height: 32)),
                SliverToBoxAdapter(child: _buildKitchenStatusWidget(ordersState)),
              ],
            ),
          ),
        ),
        const Expanded(
          flex: 40,
          child: POSOrderCartSection(),
        ),
      ],
    );
  }

  Widget _buildDesktopLayout(BuildContext context, AsyncValue<List<dynamic>> tablesState, AsyncValue<List<dynamic>> ordersState) {
    return Row(
      crossAxisAlignment: CrossAxisAlignment.stretch,
      children: [
        Expanded(
          flex: 65,
          child: SingleChildScrollView(
            padding: const EdgeInsets.all(32.0),
            child: Column(
              crossAxisAlignment: CrossAxisAlignment.start,
              children: [
                _buildHeader(),
                const SizedBox(height: 32),
                _buildKPICards(tablesState, ordersState, ref.watch(currentShiftProvider)),
                const SizedBox(height: 32),
                const POSMenuSection(shrinkWrap: true, physics: NeverScrollableScrollPhysics()),
                const SizedBox(height: 32),
                Text('Restaurant Floor Map', style: GoogleFonts.inter(color: (Theme.of(context).textTheme.bodyMedium?.color ?? Colors.black), fontSize: 20, fontWeight: FontWeight.w800)),
                const SizedBox(height: 16),
                _buildLiveTableMap(tablesState),
                const SizedBox(height: 32),
                Row(
                  crossAxisAlignment: CrossAxisAlignment.start,
                  children: [
                    Expanded(child: _buildQuickActions(context)),
                    const SizedBox(width: 32),
                    Expanded(child: _buildKitchenStatusWidget(ordersState)),
                  ],
                ),
              ],
            ),
          ),
        ),
        
        Container(
          width: 420,
          decoration: BoxDecoration(
            color: Theme.of(context).cardTheme.color ?? Theme.of(context).colorScheme.surface,
            border: Border(left: BorderSide(color: Theme.of(context).dividerColor)),
            boxShadow: [
              BoxShadow(color: Colors.black.withValues(alpha: 0.02), blurRadius: 24, offset: const Offset(-4, 0))
            ]
          ),
          child: const POSOrderCartSection(),
        ),
      ],
    );
  }

  // 1. Header
  Widget _buildHeader({bool isMobile = false}) {
    final unreadCount = ref.watch(unreadNotificationsCountProvider);

    final shiftState = ref.watch(currentShiftProvider);
    final hasShift = shiftState.value != null;

    final leftContent = Column(
      crossAxisAlignment: CrossAxisAlignment.start,
      children: [
        Text(
          'Good Evening, John 👋', 
          style: GoogleFonts.inter(color: (Theme.of(context).textTheme.bodyMedium?.color ?? Colors.black), fontSize: 26, fontWeight: FontWeight.w800, letterSpacing: -0.5),
        ),

        const SizedBox(height: 16),
        if (hasShift)
          Row(
            children: [
              Container(
                width: 8, height: 8, 
                decoration: BoxDecoration(color: Theme.of(context).colorScheme.secondary, shape: BoxShape.circle)
              ).animate(onPlay: (c) => c.repeat(reverse: true)).fadeOut(duration: 1.seconds).fadeIn(duration: 1.seconds),
              const SizedBox(width: 8),
              Expanded(
                child: Text(
                  'Active Shift', 
                  style: GoogleFonts.inter(color: Theme.of(context).colorScheme.secondary, fontSize: 14, fontWeight: FontWeight.w700),
                  overflow: TextOverflow.ellipsis,
                ),
              ),
            ],
          )
        else
          ElevatedButton.icon(
            onPressed: () {
              _showShiftSummaryDialog(context);
            },
            icon: const Icon(Icons.play_circle_outline, size: 18),
            label: Text('Start Shift', style: GoogleFonts.inter(fontWeight: FontWeight.w700)),
            style: ElevatedButton.styleFrom(
              backgroundColor: Theme.of(context).colorScheme.error,
              foregroundColor: Colors.white,
              padding: const EdgeInsets.symmetric(horizontal: 16, vertical: 8),
            ),
          ),
          
        ValueListenableBuilder(
          valueListenable: Hive.box('offline_orders').listenable(),
          builder: (context, box, widget) {
            final count = box.length;
            if (count == 0) return const SizedBox.shrink();
            return Padding(
              padding: const EdgeInsets.only(top: 12),
              child: Container(
                padding: const EdgeInsets.symmetric(horizontal: 12, vertical: 8),
                decoration: BoxDecoration(
                  color: Colors.red.withValues(alpha: 0.1),
                  borderRadius: BorderRadius.circular(12),
                  border: Border.all(color: Colors.red.withValues(alpha: 0.5)),
                ),
                child: Row(
                  mainAxisSize: MainAxisSize.min,
                  children: [
                    const Icon(Icons.wifi_off, color: Colors.red, size: 16),
                    const SizedBox(width: 8),
                    Text('You are offline - Orders will be synced later ($count pending)', style: GoogleFonts.inter(color: Colors.red, fontWeight: FontWeight.bold, fontSize: 12)),
                  ],
                ),
              ),
            );
          },
        ),
      ],
    );

    final rightContent = Row(
      mainAxisAlignment: isMobile ? MainAxisAlignment.spaceBetween : MainAxisAlignment.end,
      children: [
        _buildIconButton(
          icon: Icons.notifications_outlined,
          badgeCount: unreadCount,
          onTap: () {
             ref.read(notificationsProvider.notifier).markAllAsRead();
             _showNotificationsDialog(context);
          },
        ),
        if (!isMobile) const SizedBox(width: 12),
        _buildIconButton(
          icon: Icons.assessment_outlined,
          onTap: () => _showShiftSummaryDialog(context),
        ),
        if (!isMobile) const SizedBox(width: 12),
        // Theme Toggle
        const ThemeToggleWidget(compact: true),
        if (!isMobile) const SizedBox(width: 12),
        _buildIconButton(
          icon: Icons.logout_outlined,
          onTap: () {
            Navigator.pushAndRemoveUntil(context, MaterialPageRoute(builder: (_) => const LoginScreen()), (route) => false);
          },
        ),
      ],
    );

    if (isMobile) {
      return Column(
        crossAxisAlignment: CrossAxisAlignment.stretch,
        children: [
          rightContent,
          const SizedBox(height: 16),
          leftContent,
        ],
      ).animate().fadeIn(duration: 400.ms).slideY(begin: -0.05, end: 0);
    }

    return Row(
      mainAxisAlignment: MainAxisAlignment.spaceBetween,
      crossAxisAlignment: CrossAxisAlignment.start,
      children: [
        Expanded(child: leftContent),
        rightContent,
      ],
    ).animate().fadeIn(duration: 400.ms).slideY(begin: -0.05, end: 0);
  }

  void _showNotificationsDialog(BuildContext context) {
    showDialog(
      context: context,
      builder: (ctx) => Consumer(
        builder: (context, ref, child) {
          final notifications = ref.watch(notificationsProvider);
          return Dialog(
            shape: RoundedRectangleBorder(borderRadius: BorderRadius.circular(16)),
            child: Container(
              width: 400,
              padding: const EdgeInsets.all(24),
              child: Column(
                mainAxisSize: MainAxisSize.min,
                crossAxisAlignment: CrossAxisAlignment.start,
                children: [
                  Text('Notifications', style: GoogleFonts.inter(fontSize: 20, fontWeight: FontWeight.w800)),
                  const SizedBox(height: 16),
                  if (notifications.isEmpty)
                    const Text('No recent notifications.')
                  else
                    Flexible(
                      child: ListView.separated(
                        shrinkWrap: true,
                        itemCount: notifications.length,
                        separatorBuilder: (_, _) => const Divider(),
                        itemBuilder: (context, index) {
                          final n = notifications[index];
                          return ListTile(
                            leading: Icon(Icons.info_outline, color: Theme.of(context).colorScheme.primary),
                            title: Text(n.title, style: const TextStyle(fontWeight: FontWeight.bold)),
                            subtitle: Text(n.message),
                            trailing: Text('${n.createdAt.hour}:${n.createdAt.minute.toString().padLeft(2, '0')}'),
                          );
                        },
                      ),
                    ),
                  const SizedBox(height: 16),
                  Align(
                    alignment: Alignment.centerRight,
                    child: TextButton(
                      onPressed: () => Navigator.pop(context),
                      child: const Text('Close'),
                    ),
                  )
                ],
              ),
            ),
          );
        }
      )
    );
  }

  Widget _buildIconButton({required IconData icon, int? badgeCount, required VoidCallback onTap}) {
    return Container(
      decoration: BoxDecoration(
        color: Theme.of(context).cardTheme.color ?? Theme.of(context).colorScheme.surface, 
        borderRadius: BorderRadius.circular(16), 
        border: Border.all(color: Theme.of(context).dividerColor),
        boxShadow: [BoxShadow(color: Colors.black.withValues(alpha: 0.02), blurRadius: 8, offset: const Offset(0, 2))]
      ),
      child: Material(
        color: Colors.transparent,
        child: InkWell(
          borderRadius: BorderRadius.circular(16),
          onTap: onTap,
          child: Stack(
            children: [
              Padding(
                padding: const EdgeInsets.all(12.0),
                child: Icon(icon, color: (Theme.of(context).textTheme.bodyMedium?.color ?? Colors.black), size: 24),
              ),
              if (badgeCount != null)
                Positioned(
                  right: 8, top: 8,
                  child: Container(
                    padding: const EdgeInsets.all(4),
                    decoration: BoxDecoration(color: Theme.of(context).colorScheme.error, shape: BoxShape.circle),
                    child: Text('$badgeCount', style: GoogleFonts.inter(color: Colors.white, fontSize: 10, fontWeight: FontWeight.bold)),
                  ),
                ),
            ],
          ),
        ),
      ),
    );
  }

  // 2. KPI Cards
  Widget _buildKPICards(AsyncValue<List<dynamic>> tablesState, AsyncValue<List<dynamic>> ordersState, AsyncValue<Map<String, dynamic>?> shiftState, {bool isMobile = false}) {
    int available = 0;
    int occupied = 0;
    int reserved = 0;

    tablesState.whenData((tables) {
      for (var t in tables) {
        if (t['status'] == 'Available') available++;
        if (t['status'] == 'Occupied') occupied++;
        if (t['status'] == 'Reserved') reserved++;
      }
    });

    final availableCard = _EnterpriseMetricCard(
      title: 'Available', 
      value: '$available Tables', 
      icon: Icons.check_circle,
      color: Theme.of(context).colorScheme.primary, // Changed to Primary (Green)
      subtitle: '+2 from last hour',
    );
    final occupiedCard = _EnterpriseMetricCard(
      title: 'Occupied', 
      value: '$occupied Tables', 
      icon: Icons.people,
      color: Theme.of(context).colorScheme.error, 
      subtitle: 'Current Guests : ${occupied * 3}',
    );
    final reservedCard = _EnterpriseMetricCard(
      title: 'Reserved', 
      value: '$reserved Table${reserved == 1 ? '' : 's'}', 
      icon: Icons.event_available,
      color: Colors.orange, 
      subtitle: 'Next Booking : 7:30 PM',
    );
    double todaySales = 0.0;
    int totalOrders = 0;
    int pendingPaymentsCount = 0;
    double customerCredits = 0.0; // Mocked for now

    shiftState.whenData((shift) {
      if (shift != null) {
        todaySales = (shift['totalSales'] ?? 0.0).toDouble();
      }
    });

    ordersState.whenData((orders) {
      totalOrders = orders.length;
      pendingPaymentsCount = orders.where((o) => o['paymentStatus'] == 'Pending').length;
    });

    final salesCard = _EnterpriseMetricCard(
      title: 'Today\'s Sales', 
      value: AppCurrency.format(todaySales), 
      icon: Icons.payments_outlined,
      color: Theme.of(context).colorScheme.primary,
      subtitle: 'Current Shift',
    );
    final ordersCard = _EnterpriseMetricCard(
      title: 'Total Orders', 
      value: '$totalOrders', 
      icon: Icons.receipt_long,
      color: Colors.blueAccent, 
      subtitle: '$pendingPaymentsCount Pending Payments',
    );
    final creditsCard = _EnterpriseMetricCard(
      title: 'Customer Credits', 
      value: AppCurrency.format(customerCredits), 
      icon: Icons.account_balance_wallet_outlined,
      color: Colors.deepPurple, 
      subtitle: 'Outstanding Balance',
    );

    if (isMobile) {
      return Column(
        children: [
          Row(
            children: [
              Expanded(child: availableCard),
              const SizedBox(width: 16),
              Expanded(child: occupiedCard),
            ],
          ),
          const SizedBox(height: 16),
          Row(
            children: [
              Expanded(child: reservedCard),
              const SizedBox(width: 16),
              Expanded(child: ordersCard),
            ],
          ),
          const SizedBox(height: 16),
          const SizedBox(height: 16),
          SizedBox(width: double.infinity, child: salesCard),
          const SizedBox(height: 16),
          SizedBox(width: double.infinity, child: creditsCard),
        ],
      );
    }
    return Column(
      children: [
        Row(
          children: [
            Expanded(child: salesCard),
            const SizedBox(width: 16),
            Expanded(child: ordersCard),
            const SizedBox(width: 16),
            Expanded(child: creditsCard),
          ],
        ),
        const SizedBox(height: 16),
        Row(
          children: [
            Expanded(child: availableCard),
            const SizedBox(width: 16),
            Expanded(child: occupiedCard),
            const SizedBox(width: 16),
            Expanded(child: reservedCard),
          ],
        ),
      ],
    );
  }

  // 3. Quick Actions
  Widget _buildQuickActions(BuildContext context, {bool isMobile = false}) {
    final actions = [
      _ActionButton(label: 'New Order', icon: Icons.add_circle_outline, backgroundColor: Theme.of(context).colorScheme.primary, textColor: Colors.white, onTap: () => _openMenuSection(context)),
      _ActionButton(label: 'Orders', icon: Icons.receipt_long_outlined, backgroundColor: const Color(0xFFEFF6FF), textColor: Theme.of(context).colorScheme.secondary, onTap: () => setState(() => _bottomNavIndex = 1)),
      _ActionButton(label: 'Transfer', icon: Icons.swap_horiz_outlined, backgroundColor: const Color(0xFFF0FDF4), textColor: Theme.of(context).colorScheme.primary, onTap: () {}),
      _ActionButton(label: 'Merge', icon: Icons.merge_outlined, backgroundColor: const Color(0xFFFEF2F2), textColor: Theme.of(context).colorScheme.error, onTap: () {}),
    ];

    if (isMobile) {
      return Column(
        crossAxisAlignment: CrossAxisAlignment.start,
        children: [
          Text('Quick Actions', style: GoogleFonts.inter(color: (Theme.of(context).textTheme.bodyMedium?.color ?? Colors.black), fontSize: 20, fontWeight: FontWeight.w800)),
          const SizedBox(height: 16),
          Row(children: [Expanded(child: actions[0]), const SizedBox(width: 16), Expanded(child: actions[1])]),
          const SizedBox(height: 16),
          Row(children: [Expanded(child: actions[2]), const SizedBox(width: 16), Expanded(child: actions[3])]),
        ],
      );
    }

    return Column(
      crossAxisAlignment: CrossAxisAlignment.start,
      children: [
        Text('Quick Actions', style: GoogleFonts.inter(color: (Theme.of(context).textTheme.bodyMedium?.color ?? Colors.black), fontSize: 20, fontWeight: FontWeight.w800)),
        const SizedBox(height: 16),
        Row(
          children: actions.map((a) => Expanded(child: Padding(padding: const EdgeInsets.only(right: 16), child: a))).toList(),
        ),
      ],
    );
  }

  void _openMenuSection(BuildContext context) {
    showModalBottomSheet(
      context: context,
      isScrollControlled: true,
      backgroundColor: Colors.transparent,
      builder: (context) => DraggableScrollableSheet(
        initialChildSize: 0.85,
        minChildSize: 0.5,
        maxChildSize: 0.95,
        builder: (_, controller) => Container(
          decoration: BoxDecoration(
            color: Theme.of(context).scaffoldBackgroundColor,
            borderRadius: const BorderRadius.vertical(top: Radius.circular(24)),
          ),
          child: const POSMenuSection(),
        ),
      ),
    );
  }

  // 4. Live Table Map
  Widget _buildLiveTableMap(AsyncValue<List<dynamic>> tablesState) {
    return tablesState.when(
      data: (tables) {
        return Builder(
          builder: (context) {
            final screenWidth = MediaQuery.of(context).size.width;
            int crossAxisCount = 2; // Phone
            if (screenWidth >= 1024) {
              crossAxisCount = 6; // Desktop
            } else if (screenWidth >= 600) {
              crossAxisCount = 4; // Tablet
            }

            return GridView.builder(
              physics: const NeverScrollableScrollPhysics(),
              shrinkWrap: true,
              gridDelegate: SliverGridDelegateWithFixedCrossAxisCount(
                crossAxisCount: crossAxisCount,
                childAspectRatio: 1.0,
                crossAxisSpacing: 16,
                mainAxisSpacing: 16,
              ),
              itemCount: tables.length,
              itemBuilder: (context, index) {
                final table = tables[index];
                final status = table['status'] as String;
                Color statusColor;
                Color bgColor;
                
                switch (status) {
                  case 'Occupied': 
                    statusColor = AppColors.error; 
                    bgColor = AppColors.error.withValues(alpha: 0.1);
                    break;
                  case 'Reserved': 
                    statusColor = AppColors.warning; 
                    bgColor = AppColors.warning.withValues(alpha: 0.1);
                    break;
                  default: 
                    statusColor = AppColors.primary;
                    bgColor = Theme.of(context).cardTheme.color ?? Theme.of(context).colorScheme.surface;
                }

                return Material(
                  color: bgColor,
                  borderRadius: BorderRadius.circular(16),
                  child: InkWell(
                    onTap: () async {
                      if (status == 'Available') {
                        ref.read(cartProvider.notifier).setOrderType(OrderType.dineIn);
                        ref.read(cartProvider.notifier).setOrderDetails(
                          tableNumber: table['name'],
                          tableId: table['id'],
                        );
                        _openMenuSection(context);
                      } else {
                        final action = await showDialog<String>(
                          context: context,
                          builder: (_) => TableActionsDialog(sourceTable: table),
                        );
                        if (action == 'view_order') {
                          ref.read(cartProvider.notifier).setOrderType(OrderType.dineIn);
                          ref.read(cartProvider.notifier).setOrderDetails(
                            tableNumber: table['name'],
                            tableId: table['id'],
                          );
                          if (!context.mounted) return;
                          _openMenuSection(context);
                        }
                      }
                    },
                    borderRadius: BorderRadius.circular(16),
                    child: Container(
                      decoration: BoxDecoration(
                        borderRadius: BorderRadius.circular(16),
                        border: Border.all(color: status == 'Available' ? Theme.of(context).dividerColor : statusColor.withValues(alpha: 0.3), width: 1.5),
                        boxShadow: [
                          BoxShadow(color: statusColor.withValues(alpha: 0.05), blurRadius: 10, offset: const Offset(0, 4)),
                        ]
                      ),
                      child: Stack(
                        children: [
                          Positioned(
                            top: 12, right: 12,
                            child: Container(
                              width: 10, height: 10,
                              decoration: BoxDecoration(
                                color: statusColor, 
                                shape: BoxShape.circle,
                                boxShadow: [BoxShadow(color: statusColor.withValues(alpha: 0.4), blurRadius: 4)]
                              ),
                            ),
                          ),
                          Center(
                            child: Column(
                              mainAxisAlignment: MainAxisAlignment.center,
                              children: [
                                Icon(Icons.chair_outlined, color: statusColor.withValues(alpha: 0.8), size: 32),
                                const SizedBox(height: 8),
                                Text(
                                  table['name'].toString().replaceAll('Table ', 'T'), 
                                  style: GoogleFonts.inter(color: (Theme.of(context).textTheme.bodyMedium?.color ?? Colors.black), fontSize: 18, fontWeight: FontWeight.w800)
                                ),
                              ],
                            ),
                          ),
                        ],
                      ),
                    ),
                  ),
                ).animate().fadeIn(delay: Duration(milliseconds: 20 * index)).scale(curve: Curves.easeOutQuart);
              },
            );
          },
        );
      },
      loading: () => Center(child: CircularProgressIndicator(color: Theme.of(context).colorScheme.primary)),
      error: (e, _) => Center(child: Text('Error loading tables: $e', style: GoogleFonts.inter(color: Colors.red))),
    );
  }

  void _showCartBottomSheet(BuildContext context) {
    showModalBottomSheet(
      context: context,
      isScrollControlled: true,
      backgroundColor: Colors.transparent,
      builder: (context) => DraggableScrollableSheet(
        initialChildSize: 0.85,
        minChildSize: 0.5,
        maxChildSize: 0.95,
        builder: (_, controller) => Container(
          decoration: BoxDecoration(
            color: Theme.of(context).scaffoldBackgroundColor,
            borderRadius: const BorderRadius.vertical(top: Radius.circular(24)),
            boxShadow: [BoxShadow(color: Colors.black.withValues(alpha: 0.1), blurRadius: 40, offset: const Offset(0, -10))],
          ),
          child: Column(
            children: [
              Center(
                child: Container(
                  margin: const EdgeInsets.only(top: 12, bottom: 8),
                  height: 4,
                  width: 40,
                  decoration: BoxDecoration(
                    color: Theme.of(context).dividerColor,
                    borderRadius: BorderRadius.circular(2),
                  ),
                ),
              ),
              const Expanded(
                child: POSOrderCartSection(isMobileModal: true),
              ),
            ],
          ),
        ),
      ),
    );
  }

  Widget _buildBottomNav() {
    return Container(
      decoration: BoxDecoration(
        color: Theme.of(context).cardTheme.color ?? Theme.of(context).colorScheme.surface,
        boxShadow: [BoxShadow(color: Colors.black.withValues(alpha: 0.05), blurRadius: 20, offset: const Offset(0, -4))],
      ),
      child: SafeArea(
        child: Padding(
          padding: const EdgeInsets.symmetric(horizontal: 8, vertical: 8),
          child: Row(
            mainAxisAlignment: MainAxisAlignment.spaceAround,
            children: [
              _buildNavItem(0, 'Dashboard', Icons.grid_view),
              _buildNavItem(1, 'Orders', Icons.format_list_numbered_outlined),
              _buildNavItem(2, 'Customers', Icons.people_outline),
              _buildNavItem(3, 'Profile', Icons.person_outline),
            ],
          ),
        ),
      ),
    );
  }

  Widget _buildNavItem(int index, String label, IconData icon) {
    final isSelected = _bottomNavIndex == index;
    return Expanded(
      child: InkWell(
        onTap: () => setState(() => _bottomNavIndex = index),
        borderRadius: BorderRadius.circular(16),
        child: Container(
          padding: const EdgeInsets.symmetric(vertical: 12),
          decoration: BoxDecoration(
            borderRadius: BorderRadius.circular(16),
            color: isSelected ? Theme.of(context).colorScheme.primary.withValues(alpha: 0.08) : Colors.transparent,
          ),
          child: Column(
            mainAxisSize: MainAxisSize.min,
            children: [
              Icon(icon, color: isSelected ? Theme.of(context).colorScheme.primary : (Theme.of(context).textTheme.bodyMedium?.color?.withValues(alpha: 0.6) ?? Colors.grey), size: 24),
              const SizedBox(height: 4),
              Text(
                label, 
                style: GoogleFonts.inter(
                  color: isSelected ? Theme.of(context).colorScheme.primary : (Theme.of(context).textTheme.bodyMedium?.color?.withValues(alpha: 0.6) ?? Colors.grey), 
                  fontWeight: isSelected ? FontWeight.w800 : FontWeight.w600, 
                  fontSize: 12
                )
              ),
            ],
          ),
        ),
      ),
    );
  }

  void _showShiftSummaryDialog(BuildContext context) {
    showDialog(
      context: context,
      builder: (ctx) => const DailyClosingDialog(),
    );
  }

  // 5. Kitchen Tracker Widget
  Widget _buildKitchenStatusWidget(AsyncValue<List<dynamic>> ordersState) {
    int pending = 0;
    int preparing = 0;
    int ready = 0;
    int served = 0;

    ordersState.whenData((orders) {
      for (var o in orders) {
        if (o['status'] == 'Pending') pending++;
        if (o['status'] == 'Preparing') preparing++;
        if (o['status'] == 'Ready') ready++;
        if (o['status'] == 'Served') served++;
      }
    });

    int total = pending + preparing + ready + served;
    int maxCount = total > 0 ? total : 20;

    return Column(
      crossAxisAlignment: CrossAxisAlignment.start,
      children: [
        Text('Kitchen Tracker', style: GoogleFonts.inter(color: (Theme.of(context).textTheme.bodyMedium?.color ?? Colors.black), fontSize: 20, fontWeight: FontWeight.w800)),
        const SizedBox(height: 24),
        _KitchenStatusProgressRow(label: 'Pending', count: pending, maxCount: maxCount, color: Colors.orange),
        const SizedBox(height: 16),
        _KitchenStatusProgressRow(label: 'Preparing', count: preparing, maxCount: maxCount, color: Theme.of(context).colorScheme.primary),
        const SizedBox(height: 16),
        _KitchenStatusProgressRow(label: 'Ready', count: ready, maxCount: maxCount, color: Theme.of(context).colorScheme.secondary),
      ],
    );
  }
}

class _EnterpriseMetricCard extends StatefulWidget {
  final String title;
  final String value;
  final IconData icon;
  final Color color;
  final String subtitle;

  const _EnterpriseMetricCard({required this.title, required this.value, required this.icon, required this.color, required this.subtitle});

  @override
  State<_EnterpriseMetricCard> createState() => _EnterpriseMetricCardState();
}

class _EnterpriseMetricCardState extends State<_EnterpriseMetricCard> {
  bool _isHovered = false;

  @override
  Widget build(BuildContext context) {
    final isDark = Theme.of(context).brightness == Brightness.dark;

    return MouseRegion(
      onEnter: (_) => setState(() => _isHovered = true),
      onExit: (_) => setState(() => _isHovered = false),
      child: AnimatedContainer(
        duration: const Duration(milliseconds: 300),
        curve: Curves.easeOutQuart,
        transform: Matrix4.diagonal3Values(_isHovered ? 1.02 : 1.0, _isHovered ? 1.02 : 1.0, 1.0),
        transformAlignment: Alignment.center,
        decoration: BoxDecoration(
          color: Theme.of(context).cardTheme.color ?? Theme.of(context).colorScheme.surface,
          borderRadius: BorderRadius.circular(20),
          border: Border.all(
            color: _isHovered ? widget.color.withValues(alpha: 0.5) : Theme.of(context).dividerColor.withValues(alpha: 0.6),
            width: _isHovered ? 2 : 1,
          ),
          boxShadow: [
            if (_isHovered)
              BoxShadow(
                color: widget.color.withValues(alpha: 0.15),
                blurRadius: 20,
                offset: const Offset(0, 8),
              )
            else
              BoxShadow(
                color: Colors.black.withValues(alpha: 0.03),
                blurRadius: 10,
                offset: const Offset(0, 4),
              ),
          ],
          gradient: LinearGradient(
            begin: Alignment.topLeft,
            end: Alignment.bottomRight,
            colors: [
              Theme.of(context).cardTheme.color ?? Theme.of(context).colorScheme.surface,
              widget.color.withValues(alpha: isDark ? 0.05 : 0.02),
            ],
          ),
        ),
        child: Stack(
          children: [
            // Decorative background blur icon
            Positioned(
              right: -20,
              bottom: -20,
              child: Icon(
                widget.icon,
                size: 100,
                color: widget.color.withValues(alpha: isDark ? 0.03 : 0.04),
              ),
            ),
            Padding(
              padding: const EdgeInsets.all(20),
              child: Column(
                crossAxisAlignment: CrossAxisAlignment.start,
                children: [
                  Row(
                    children: [
                      Expanded(
                        child: Text(
                          widget.title,
                          style: GoogleFonts.inter(
                            color: Theme.of(context).colorScheme.onSurface.withValues(alpha: 0.7),
                            fontWeight: FontWeight.w600,
                            fontSize: 14,
                            letterSpacing: 0.3,
                          ),
                          overflow: TextOverflow.ellipsis,
                        ),
                      ),
                      const SizedBox(width: 8),
                      AnimatedContainer(
                        duration: const Duration(milliseconds: 300),
                        padding: const EdgeInsets.all(8),
                        decoration: BoxDecoration(
                          color: _isHovered ? widget.color : widget.color.withValues(alpha: 0.1),
                          borderRadius: BorderRadius.circular(12),
                          boxShadow: _isHovered
                              ? [BoxShadow(color: widget.color.withValues(alpha: 0.4), blurRadius: 8, offset: const Offset(0, 4))]
                              : [],
                        ),
                        child: Icon(
                          widget.icon,
                          color: _isHovered ? Colors.white : widget.color,
                          size: 20,
                        ),
                      ),
                    ],
                  ),
                  const SizedBox(height: 16),
                  FittedBox(
                    fit: BoxFit.scaleDown,
                    alignment: Alignment.centerLeft,
                    child: Text(
                      widget.value,
                      style: GoogleFonts.inter(
                        color: Theme.of(context).colorScheme.onSurface,
                        fontSize: 28,
                        fontWeight: FontWeight.w800,
                        letterSpacing: -0.5,
                      ),
                    ),
                  ),
                  const SizedBox(height: 12),
                  Row(
                    children: [
                      Icon(Icons.trending_up, color: widget.color, size: 16),
                      const SizedBox(width: 6),
                      Expanded(
                        child: Text(
                          widget.subtitle,
                          style: GoogleFonts.inter(
                            color: widget.color,
                            fontSize: 12,
                            fontWeight: FontWeight.w600,
                          ),
                          overflow: TextOverflow.ellipsis,
                        ),
                      ),
                    ],
                  ),
                ],
              ),
            ),
          ],
        ),
      ),
    );
  }
}

class _ActionButton extends StatelessWidget {
  final String label;
  final IconData icon;
  final Color backgroundColor;
  final Color textColor;
  final VoidCallback onTap;

  const _ActionButton({required this.label, required this.icon, required this.backgroundColor, required this.textColor, required this.onTap});

  @override
  Widget build(BuildContext context) {
    return Material(
      color: backgroundColor,
      borderRadius: BorderRadius.circular(16),
      child: InkWell(
        onTap: onTap,
        borderRadius: BorderRadius.circular(16),
        child: Container(
          padding: const EdgeInsets.symmetric(vertical: 24),
          alignment: Alignment.center,
          child: Column(
            mainAxisSize: MainAxisSize.min,
            children: [
              Icon(icon, color: textColor, size: 32),
              const SizedBox(height: 12),
              Text(label, style: GoogleFonts.inter(color: textColor, fontSize: 16, fontWeight: FontWeight.w700)),
            ],
          ),
        ),
      ),
    );
  }
}

class _KitchenStatusProgressRow extends StatelessWidget {
  final String label;
  final int count;
  final int maxCount;
  final Color color;

  const _KitchenStatusProgressRow({required this.label, required this.count, required this.maxCount, required this.color});

  @override
  Widget build(BuildContext context) {
    final double progress = maxCount == 0 ? 0.0 : (count / maxCount).clamp(0.0, 1.0);
    return Container(
      padding: const EdgeInsets.all(16),
      decoration: BoxDecoration(
        color: Theme.of(context).cardTheme.color ?? Theme.of(context).colorScheme.surface,
        borderRadius: BorderRadius.circular(16),
        border: Border.all(color: Theme.of(context).dividerColor),
        boxShadow: [BoxShadow(color: Colors.black.withValues(alpha: 0.01), blurRadius: 8, offset: const Offset(0, 2))]
      ),
      child: Column(
        crossAxisAlignment: CrossAxisAlignment.start,
        children: [
          Row(
            mainAxisAlignment: MainAxisAlignment.spaceBetween,
            children: [
              Row(
                children: [
                  Container(
                    padding: const EdgeInsets.all(6),
                    decoration: BoxDecoration(color: color.withValues(alpha: 0.1), borderRadius: BorderRadius.circular(8)),
                    child: Icon(Icons.local_fire_department_outlined, color: color, size: 16),
                  ),
                  const SizedBox(width: 12),
                  Text(label, style: GoogleFonts.inter(color: (Theme.of(context).textTheme.bodyMedium?.color ?? Colors.black), fontWeight: FontWeight.w700, fontSize: 15)),
                ],
              ),
              Text(count.toString().padLeft(2, '0'), style: GoogleFonts.inter(color: (Theme.of(context).textTheme.bodyMedium?.color ?? Colors.black), fontWeight: FontWeight.w800, fontSize: 18)),
            ],
          ),
          const SizedBox(height: 16),
          ClipRRect(
            borderRadius: BorderRadius.circular(8),
            child: LinearProgressIndicator(
              value: progress,
              backgroundColor: Theme.of(context).scaffoldBackgroundColor,
              color: color,
              minHeight: 8,
            ),
          ).animate().slideX(duration: 800.ms, curve: Curves.easeOutQuart),
        ],
      ),
    );
  }
}
