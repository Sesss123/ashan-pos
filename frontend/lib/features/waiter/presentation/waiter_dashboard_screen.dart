import '../../../core/utils/app_currency.dart';
import 'dart:async';
import 'package:flutter/material.dart';
import 'package:flutter_riverpod/flutter_riverpod.dart';
import 'package:flutter_animate/flutter_animate.dart';
import 'package:google_fonts/google_fonts.dart';
import 'dart:ui';
// phosphor_flutter removed - using built-in Icons.* (was incompatible with Flutter 3.x)

import 'providers/running_orders_provider.dart';
import '../../cashier/presentation/providers/cashier_providers.dart'; // For tablesProvider
import 'waiter_order_builder_screen.dart';
import 'running_orders_screen.dart';
import 'reservations_screen.dart';
import '../../auth/presentation/login_screen.dart';
import '../../../core/widgets/responsive_layout.dart';
import '../../../core/widgets/theme_toggle_widget.dart';
import '../../../core/network/dio_client.dart';
import '../../../core/realtime/socket_service.dart';
import 'package:audioplayers/audioplayers.dart';
import '../../../core/theme/app_colors.dart';

// --- Waiter Stats Provider ---
final waiterStatsProvider = FutureProvider.autoDispose<Map<String, dynamic>>((ref) async {
  final dio = ref.read(dioClientProvider).dio;
  final response = await dio.get('/waiter/dashboard-stats');
  return response.data['data'] as Map<String, dynamic>;
});

// --- Enterprise SaaS Color Palette ---

class WaiterDashboardScreen extends ConsumerStatefulWidget {
  const WaiterDashboardScreen({super.key});

  @override
  ConsumerState<WaiterDashboardScreen> createState() => _WaiterDashboardScreenState();
}

class _WaiterDashboardScreenState extends ConsumerState<WaiterDashboardScreen> {
  int _bottomNavIndex = 0;
  late DateTime _shiftStartTime;

  @override
  void initState() {
    super.initState();
    _shiftStartTime = DateTime.now().subtract(const Duration(hours: 4, minutes: 20));
    Future.microtask(() {
      ref.read(runningOrdersProvider.notifier).listenToSocket('main-branch');
      socketService.on('kitchen.order_ready', _handleOrderReady);
    });
  }

  void _handleOrderReady(dynamic data) async {
    if (mounted) {
      final player = AudioPlayer();
      await player.play(UrlSource('https://actions.google.com/sounds/v1/alarms/beep_short.ogg'));
      if (!mounted) return;
      
      final tableId = data != null && data['tableId'] != null ? data['tableId'] : 'Unknown';
      
      ScaffoldMessenger.of(context).showSnackBar(
        SnackBar(
          content: Row(
            children: [
              const Icon(Icons.check_circle_outline, color: Colors.white),
              const SizedBox(width: 12),
              Text('Table $tableId Order is Ready!', style: GoogleFonts.inter(fontWeight: FontWeight.bold, color: Colors.white)),
            ],
          ),
          backgroundColor: Colors.green.shade600,
          behavior: SnackBarBehavior.floating,
          shape: RoundedRectangleBorder(borderRadius: BorderRadius.circular(12)),
          margin: const EdgeInsets.all(20),
          duration: const Duration(seconds: 4),
        ),
      );
    }
  }

  @override
  void dispose() {
    socketService.off('kitchen.order_ready');
    super.dispose();
  }

  @override
  Widget build(BuildContext context) {
    final tablesState = ref.watch(tablesProvider);
    final ordersState = ref.watch(runningOrdersProvider);

    return Scaffold(
      backgroundColor: Theme.of(context).scaffoldBackgroundColor,
      body: SafeArea(
        child: _buildBodyContent(tablesState, ordersState),
      ),
      bottomNavigationBar: _buildBottomNav(),
    );
  }

  Widget _buildBodyContent(AsyncValue<List<dynamic>> tablesState, AsyncValue<List<dynamic>> ordersState) {
    switch (_bottomNavIndex) {
      case 0:
        return ResponsiveLayout(
          mobile: _buildDashboardMobile(tablesState, ordersState),
          tablet: _buildDashboardTablet(tablesState, ordersState),
          desktop: _buildDashboardDesktop(tablesState, ordersState),
        );
      case 1:
        return _buildTablesView(tablesState, title: 'Select Table for New Order');
      case 2:
        return const RunningOrdersScreen(isStandalone: false);
      case 3:
        return const ReservationsScreen();
      default:
        return const SizedBox();
    }
  }

  Widget _buildTablesView(AsyncValue<List<dynamic>> tablesState, {String title = 'Restaurant Floor Map'}) {
    return Padding(
      padding: const EdgeInsets.all(16.0),
      child: Column(
        crossAxisAlignment: CrossAxisAlignment.start,
        children: [
          Text(title, style: GoogleFonts.inter(color: (Theme.of(context).textTheme.bodyMedium?.color ?? Colors.black), fontSize: 24, fontWeight: FontWeight.w800)),
          const SizedBox(height: 16),
          Expanded(child: _buildLiveTableMap(tablesState)),
        ],
      ),
    );
  }

  Widget _buildDashboardMobile(AsyncValue<List<dynamic>> tablesState, AsyncValue<List<dynamic>> ordersState) {
    return Padding(
      padding: const EdgeInsets.all(16.0),
      child: CustomScrollView(
        slivers: [
          SliverToBoxAdapter(child: _buildHeader(isMobile: true)),
          const SliverToBoxAdapter(child: SizedBox(height: 32)),
          SliverToBoxAdapter(child: _buildKPICards(tablesState, isMobile: true)),
          const SliverToBoxAdapter(child: SizedBox(height: 32)),
          SliverToBoxAdapter(child: Text('Restaurant Floor Map', style: GoogleFonts.inter(color: (Theme.of(context).textTheme.bodyMedium?.color ?? Colors.black), fontSize: 20, fontWeight: FontWeight.w800))),
          const SliverToBoxAdapter(child: SizedBox(height: 16)),
          SliverToBoxAdapter(child: _buildLiveTableMap(tablesState)),
          const SliverToBoxAdapter(child: SizedBox(height: 32)),
          SliverToBoxAdapter(child: _buildQuickActions(context, isMobile: true)),
          const SliverToBoxAdapter(child: SizedBox(height: 32)),
          SliverToBoxAdapter(child: _buildKitchenStatusWidget(ordersState)),
          const SliverToBoxAdapter(child: SizedBox(height: 24)),
          SliverToBoxAdapter(child: _buildRecentOrdersTimeline(ordersState, isScrollable: false)),
        ],
      ),
    );
  }

  Widget _buildDashboardTablet(AsyncValue<List<dynamic>> tablesState, AsyncValue<List<dynamic>> ordersState) {
    return Padding(
      padding: const EdgeInsets.all(24.0),
      child: CustomScrollView(
        slivers: [
          SliverToBoxAdapter(child: _buildHeader()),
          const SliverToBoxAdapter(child: SizedBox(height: 32)),
          SliverToBoxAdapter(child: _buildKPICards(tablesState)),
          const SliverToBoxAdapter(child: SizedBox(height: 32)),
          SliverToBoxAdapter(child: Text('Restaurant Floor Map', style: GoogleFonts.inter(color: (Theme.of(context).textTheme.bodyMedium?.color ?? Colors.black), fontSize: 20, fontWeight: FontWeight.w800))),
          const SliverToBoxAdapter(child: SizedBox(height: 16)),
          SliverToBoxAdapter(
            child: SizedBox(height: 400, child: _buildLiveTableMap(tablesState)),
          ),
          const SliverToBoxAdapter(child: SizedBox(height: 32)),
          SliverToBoxAdapter(child: _buildQuickActions(context)),
          const SliverToBoxAdapter(child: SizedBox(height: 32)),
          SliverToBoxAdapter(
            child: SizedBox(
              height: 350,
              child: Row(
                children: [
                  Expanded(child: _buildKitchenStatusWidget(ordersState)),
                  const SizedBox(width: 24),
                  Expanded(child: _buildRecentOrdersTimeline(ordersState)),
                ],
              ),
            ),
          ),
        ],
      ),
    );
  }

  Widget _buildDashboardDesktop(AsyncValue<List<dynamic>> tablesState, AsyncValue<List<dynamic>> ordersState) {
    return Row(
      crossAxisAlignment: CrossAxisAlignment.stretch,
      children: [
        Expanded(
          flex: 7,
          child: Padding(
            padding: const EdgeInsets.all(32.0),
            child: Column(
              crossAxisAlignment: CrossAxisAlignment.start,
              children: [
                _buildHeader(),
                const SizedBox(height: 32),
                _buildKPICards(tablesState),
                const SizedBox(height: 32),
                Text('Restaurant Floor Map', style: GoogleFonts.inter(color: (Theme.of(context).textTheme.bodyMedium?.color ?? Colors.black), fontSize: 20, fontWeight: FontWeight.w800)),
                const SizedBox(height: 16),
                Expanded(child: _buildLiveTableMap(tablesState)),
                const SizedBox(height: 32),
                _buildQuickActions(context),
              ],
            ),
          ),
        ),
        Container(
          width: 400,
          decoration: BoxDecoration(
            color: Theme.of(context).cardTheme.color ?? Theme.of(context).colorScheme.surface,
            border: Border(left: BorderSide(color: Theme.of(context).dividerColor)),
            boxShadow: [
              BoxShadow(color: Colors.black.withValues(alpha: 0.02), blurRadius: 24, offset: const Offset(-4, 0))
            ]
          ),
          child: Column(
            children: [
              _buildKitchenStatusWidget(ordersState),
              Divider(color: Theme.of(context).dividerColor, height: 1),
              Expanded(child: _buildRecentOrdersTimeline(ordersState)),
            ],
          ),
        )
      ],
    );
  }

  // 1. Header (Premium Enterprise Upgrade)
  Widget _buildHeader({bool isMobile = false}) {
    final leftContent = Column(
      crossAxisAlignment: CrossAxisAlignment.start,
      children: [
        Text(
          'Good Evening, John 👋', 
          style: GoogleFonts.inter(color: (Theme.of(context).textTheme.bodyMedium?.color ?? Colors.black), fontSize: 26, fontWeight: FontWeight.w800, letterSpacing: -0.5),
        ),
        const SizedBox(height: 12),
        Consumer(
          builder: (context, ref, child) {
            final isShiftActive = _shiftStartTime.year > 2000;
            return InkWell(
              onTap: () {
                setState(() {
                  if (isShiftActive) {
                    _shiftStartTime = DateTime.fromMillisecondsSinceEpoch(0);
                  } else {
                    _shiftStartTime = DateTime.now();
                  }
                });
                ScaffoldMessenger.of(context).showSnackBar(SnackBar(content: Text(isShiftActive ? 'Shift Ended' : 'Shift Started', style: GoogleFonts.inter())));
              },
              borderRadius: BorderRadius.circular(16),
              child: Container(
                padding: const EdgeInsets.symmetric(horizontal: 20, vertical: 12),
                decoration: BoxDecoration(
                  color: isShiftActive ? Theme.of(context).colorScheme.primary.withValues(alpha: 0.1) : Theme.of(context).colorScheme.error.withValues(alpha: 0.1),
                  borderRadius: BorderRadius.circular(16),
                  border: Border.all(color: isShiftActive ? Theme.of(context).colorScheme.primary.withValues(alpha: 0.3) : Theme.of(context).colorScheme.error.withValues(alpha: 0.3), width: 1.5),
                ),
                child: Row(
                  mainAxisSize: MainAxisSize.min,
                  children: [
                    Icon(isShiftActive ? Icons.lock_open : Icons.lock_outline, color: isShiftActive ? Theme.of(context).colorScheme.primary : Theme.of(context).colorScheme.error),
                    const SizedBox(width: 8),
                    Text(
                      isShiftActive ? 'End Shift' : 'Start Shift',
                      style: GoogleFonts.inter(color: isShiftActive ? Theme.of(context).colorScheme.primary : Theme.of(context).colorScheme.error, fontWeight: FontWeight.bold),
                    ),
                  ],
                ),
              ),
            );
          }
        ),
        const SizedBox(height: 16),
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
        ),
      ],
    );

    final rightContent = Row(
      mainAxisAlignment: isMobile ? MainAxisAlignment.spaceBetween : MainAxisAlignment.end,
      children: [
        _buildIconButton(
          icon: Icons.notifications_outlined,
          badgeCount: null,
          onTap: () {
            ScaffoldMessenger.of(context).showSnackBar(
              SnackBar(
                content: Row(
                  children: [
                    Icon(Icons.info_outline, color: Colors.white),
                    const SizedBox(width: 12),
                    Text('No new notifications', style: GoogleFonts.inter(fontWeight: FontWeight.w600)),
                  ],
                ),
                backgroundColor: Theme.of(context).colorScheme.primary,
                behavior: SnackBarBehavior.floating,
                shape: RoundedRectangleBorder(borderRadius: BorderRadius.circular(12)),
                margin: const EdgeInsets.all(20),
                duration: const Duration(seconds: 2),
              ),
            );
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



  // 2. KPI Cards (Enterprise Upgrade)
  Widget _buildKPICards(AsyncValue<List<dynamic>> tablesState, {bool isMobile = false}) {
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
          SizedBox(width: double.infinity, child: reservedCard),
        ],
      );
    }

    return Row(
      children: [
        Expanded(child: availableCard),
        const SizedBox(width: 16),
        Expanded(child: occupiedCard),
        const SizedBox(width: 16),
        Expanded(child: reservedCard),
      ],
    );
  }

  // 3. Quick Actions (Enterprise Upgrade)
  Widget _buildQuickActions(BuildContext context, {bool isMobile = false}) {
    final actions = [
      _ActionButton(label: 'New Order', icon: Icons.add_circle_outline, backgroundColor: Theme.of(context).colorScheme.primary, textColor: Colors.white, onTap: () => setState(() => _bottomNavIndex = 1)),
      _ActionButton(label: 'Reservations', icon: Icons.book_online_outlined, backgroundColor: const Color(0xFFEFF6FF), textColor: Theme.of(context).colorScheme.secondary, onTap: () => setState(() => _bottomNavIndex = 3)),
      _ActionButton(label: 'Transfer', icon: Icons.swap_horiz_outlined, backgroundColor: const Color(0xFFF0FDF4), textColor: Theme.of(context).colorScheme.primary, onTap: () => _showTableTransferDialog(context)),
      _ActionButton(label: 'Orders', icon: Icons.receipt_long_outlined, backgroundColor: const Color(0xFFFEF2F2), textColor: Theme.of(context).colorScheme.error, onTap: () => setState(() => _bottomNavIndex = 2)),
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
                
                String statusText = status;
                String subtitle = '4 Seats'; // Dummy capacity for better UI layout
                
                switch (status) {
                  case 'Occupied': 
                    statusColor = AppColors.error; 
                    bgColor = AppColors.error.withValues(alpha: 0.1);
                    subtitle = 'Time: 45m';
                    break;
                  case 'Reserved': 
                    statusColor = AppColors.warning; 
                    bgColor = AppColors.warning.withValues(alpha: 0.1);
                    subtitle = 'Next: 7:30 PM';
                    break;
                  default: 
                    statusColor = AppColors.primary;
                    bgColor = Theme.of(context).cardTheme.color ?? Theme.of(context).colorScheme.surface;
                    statusText = 'Available';
                }

                return Material(
                  color: Colors.transparent,
                  child: InkWell(
                    onTap: () => Navigator.push(context, MaterialPageRoute(builder: (_) => WaiterOrderBuilderScreen(tableId: table['id'], tableName: table['name']))),
                    borderRadius: BorderRadius.circular(20),
                    child: Container(
                      decoration: BoxDecoration(
                        color: bgColor,
                        borderRadius: BorderRadius.circular(20),
                        border: Border.all(color: status == 'Available' ? Theme.of(context).dividerColor : statusColor.withValues(alpha: 0.3), width: 1.5),
                        boxShadow: status == 'Available' ? [
                          BoxShadow(color: Colors.black.withValues(alpha: 0.02), blurRadius: 10, offset: const Offset(0, 4))
                        ] : [
                          BoxShadow(color: statusColor.withValues(alpha: 0.15), blurRadius: 16, offset: const Offset(0, 8)),
                        ]
                      ),
                      child: Stack(
                        children: [
                          // Background Icon (Watermark effect)
                          Positioned(
                            bottom: -15,
                            right: -15,
                            child: Icon(Icons.table_restaurant, size: 90, color: statusColor.withValues(alpha: 0.05)),
                          ),
                          // Top Status Indicator & Status Text
                          Positioned(
                            top: 14, right: 14,
                            child: Container(
                              padding: const EdgeInsets.symmetric(horizontal: 10, vertical: 6),
                              decoration: BoxDecoration(
                                color: statusColor.withValues(alpha: 0.15),
                                borderRadius: BorderRadius.circular(20),
                                border: Border.all(color: statusColor.withValues(alpha: 0.3)),
                              ),
                              child: Row(
                                mainAxisSize: MainAxisSize.min,
                                children: [
                                  Container(
                                    width: 8, height: 8,
                                    decoration: BoxDecoration(
                                      color: statusColor, 
                                      shape: BoxShape.circle,
                                      boxShadow: [BoxShadow(color: statusColor.withValues(alpha: 0.6), blurRadius: 6)]
                                    ),
                                  ).animate(onPlay: (c) => status == 'Occupied' ? c.repeat(reverse: true) : null).fadeOut(duration: 1.seconds).fadeIn(),
                                  const SizedBox(width: 6),
                                  Text(statusText, style: GoogleFonts.inter(color: statusColor, fontSize: 11, fontWeight: FontWeight.bold)),
                                ],
                              ),
                            ),
                          ),
                          // Main Content
                          Padding(
                            padding: const EdgeInsets.all(20.0),
                            child: Column(
                              crossAxisAlignment: CrossAxisAlignment.start,
                              children: [
                                Container(
                                  padding: const EdgeInsets.all(12),
                                  decoration: BoxDecoration(
                                    color: Theme.of(context).scaffoldBackgroundColor.withValues(alpha: 0.6),
                                    borderRadius: BorderRadius.circular(14),
                                    border: Border.all(color: Theme.of(context).dividerColor.withValues(alpha: 0.5))
                                  ),
                                  child: Icon(Icons.chair_alt, color: statusColor, size: 24),
                                ),
                                const Spacer(),
                                Text(
                                  table['name'].toString().replaceAll('Table ', 'Table\n'), 
                                  style: GoogleFonts.inter(color: (Theme.of(context).textTheme.bodyMedium?.color ?? Colors.black), fontSize: 22, fontWeight: FontWeight.w800, height: 1.1)
                                ),
                                const SizedBox(height: 8),
                                Row(
                                  children: [
                                    Icon(status == 'Occupied' ? Icons.timer_outlined : Icons.people_alt_outlined, size: 16, color: Theme.of(context).textTheme.bodyMedium?.color?.withValues(alpha: 0.5)),
                                    const SizedBox(width: 6),
                                    Text(
                                      subtitle, 
                                      style: GoogleFonts.inter(color: Theme.of(context).textTheme.bodyMedium?.color?.withValues(alpha: 0.5), fontSize: 13, fontWeight: FontWeight.w600)
                                    ),
                                  ],
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

    return Padding(
      padding: const EdgeInsets.all(24.0),
      child: Column(
        crossAxisAlignment: CrossAxisAlignment.start,
        children: [
          Text('Kitchen Tracker', style: GoogleFonts.inter(color: (Theme.of(context).textTheme.bodyMedium?.color ?? Colors.black), fontSize: 20, fontWeight: FontWeight.w800)),
          const SizedBox(height: 24),
          _KitchenStatusProgressRow(label: 'Pending', count: pending, maxCount: maxCount, color: Colors.orange),
          const SizedBox(height: 16),
          _KitchenStatusProgressRow(label: 'Preparing', count: preparing, maxCount: maxCount, color: Theme.of(context).colorScheme.primary),
          const SizedBox(height: 16),
          _KitchenStatusProgressRow(label: 'Ready', count: ready, maxCount: maxCount, color: Theme.of(context).colorScheme.secondary),
          const SizedBox(height: 16),
          _KitchenStatusProgressRow(label: 'Served', count: served, maxCount: maxCount, color: (Theme.of(context).textTheme.bodyMedium?.color?.withValues(alpha: 0.6) ?? Colors.grey)),
        ],
      ),
    );
  }

  // 6. Recent Orders Timeline
  Widget _buildRecentOrdersTimeline(AsyncValue<List<dynamic>> ordersState, {bool isScrollable = true}) {
    return ordersState.when(
      data: (orders) {
        if (orders.isEmpty) {
          return Padding(
            padding: const EdgeInsets.all(24.0),
            child: Column(
              crossAxisAlignment: CrossAxisAlignment.start,
              children: [
                Text('Recent Orders', style: GoogleFonts.inter(color: (Theme.of(context).textTheme.bodyMedium?.color ?? Colors.black), fontSize: 20, fontWeight: FontWeight.w800)),
                const SizedBox(height: 16),
                isScrollable 
                  ? Expanded(
                      child: Center(
                        child: Text('No orders found.', style: GoogleFonts.inter(color: Colors.grey)),
                      ),
                    )
                  : Center(
                      child: Padding(
                        padding: const EdgeInsets.symmetric(vertical: 32.0),
                        child: Text('No orders found.', style: GoogleFonts.inter(color: Colors.grey)),
                      ),
                    ),
              ],
            ),
          );
        }

        final listView = ListView.builder(
          shrinkWrap: !isScrollable,
          physics: isScrollable ? const AlwaysScrollableScrollPhysics() : const NeverScrollableScrollPhysics(),
          itemCount: orders.length,
          itemBuilder: (context, index) {
            final order = orders[index];
            final status = order['status'] as String;
            Color color;
            switch (status) {
              case 'Pending': color = Colors.orange; break;
              case 'Preparing': color = Theme.of(context).colorScheme.primary; break;
              case 'Ready': color = Theme.of(context).colorScheme.secondary; break;
              default: color = (Theme.of(context).textTheme.bodyMedium?.color?.withValues(alpha: 0.6) ?? Colors.grey);
            }

            final tableId = order['order']?['tableId'] ?? 'Unknown';
            final shortId = order['id'].toString().length > 6 ? order['id'].toString().substring(0, 6) : order['id'].toString();

            return Container(
              margin: const EdgeInsets.only(bottom: 12),
              child: ClipRRect(
                borderRadius: BorderRadius.circular(16),
                child: BackdropFilter(
                  filter: ImageFilter.blur(sigmaX: 10, sigmaY: 10),
                  child: AnimatedContainer(
                    duration: const Duration(milliseconds: 300),
                    padding: const EdgeInsets.all(16),
                    decoration: BoxDecoration(
                      color: (Theme.of(context).cardTheme.color ?? Theme.of(context).colorScheme.surface).withValues(alpha: 0.7),
                      borderRadius: BorderRadius.circular(16),
                      border: Border.all(color: Colors.white.withValues(alpha: 0.1), width: 1.5),
                      boxShadow: [BoxShadow(color: Colors.black.withValues(alpha: 0.05), blurRadius: 10, offset: const Offset(0, 4))],
                    ),
                    child: Row(
                mainAxisAlignment: MainAxisAlignment.spaceBetween,
                children: [
                  Expanded(
                    child: Row(
                      children: [
                        Container(
                          padding: const EdgeInsets.all(10),
                          decoration: BoxDecoration(
                            color: Theme.of(context).scaffoldBackgroundColor,
                            borderRadius: BorderRadius.circular(12),
                          ),
                          child: Icon(Icons.receipt_long_outlined, color: (Theme.of(context).textTheme.bodyMedium?.color ?? Colors.black), size: 20),
                        ),
                        const SizedBox(width: 12),
                        Expanded(
                          child: Column(
                            crossAxisAlignment: CrossAxisAlignment.start,
                            children: [
                              Text(
                                '#ORD-$shortId',
                                style: GoogleFonts.inter(color: (Theme.of(context).textTheme.bodyMedium?.color ?? Colors.black), fontWeight: FontWeight.w800, fontSize: 16),
                                overflow: TextOverflow.ellipsis,
                              ),
                              const SizedBox(height: 4),
                              Text(
                                tableId,
                                style: GoogleFonts.inter(color: (Theme.of(context).textTheme.bodyMedium?.color?.withValues(alpha: 0.6) ?? Colors.grey), fontWeight: FontWeight.w600, fontSize: 14),
                                overflow: TextOverflow.ellipsis,
                              ),
                            ],
                          ),
                        ),
                      ],
                    ),
                  ),
                  const SizedBox(width: 12),
                  AnimatedSwitcher(
                    duration: const Duration(milliseconds: 300),
                    transitionBuilder: (child, anim) => ScaleTransition(scale: anim, child: child),
                    child: Container(
                      key: ValueKey(status),
                      padding: const EdgeInsets.symmetric(horizontal: 12, vertical: 6),
                      decoration: BoxDecoration(
                        color: color.withValues(alpha: 0.15),
                        borderRadius: BorderRadius.circular(20),
                        border: Border.all(color: color.withValues(alpha: 0.3)),
                      ),
                      child: Text(
                        status, 
                        style: GoogleFonts.inter(color: color, fontWeight: FontWeight.w700, fontSize: 12)
                      ),
                    ),
                  )
                ],
              ),
            )))).animate().fadeIn(delay: Duration(milliseconds: 50 * index)).slideX(begin: 0.1, end: 0);
          },
        );

        return Padding(
          padding: const EdgeInsets.all(24.0),
          child: Column(
            crossAxisAlignment: CrossAxisAlignment.start,
            children: [
              Text('Recent Orders', style: GoogleFonts.inter(color: (Theme.of(context).textTheme.bodyMedium?.color ?? Colors.black), fontSize: 20, fontWeight: FontWeight.w800)),
              const SizedBox(height: 16),
              isScrollable ? Expanded(child: listView) : listView,
            ],
          ),
        );
      },
      loading: () => const Center(child: CircularProgressIndicator()),
      error: (e, _) => Center(child: Text('Failed to load orders: $e')),
    );
  }

  // 7. Bottom Navigation (Enterprise Upgrade)
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
              _buildNavItem(0, 'Dashboard', Icons.dashboard_outlined),
              _buildNavItem(1, 'New Order', Icons.add_circle_outline),
              _buildNavItem(2, 'Orders', Icons.receipt_long_outlined),
              _buildNavItem(3, 'Reservations', Icons.book_online_outlined),
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
            color: isSelected ? Theme.of(context).colorScheme.primary.withValues(alpha: 0.05) : Colors.transparent,
          ),
          child: Column(
            mainAxisSize: MainAxisSize.min,
            children: [
              Icon(icon, color: isSelected ? Theme.of(context).colorScheme.primary : (Theme.of(context).textTheme.bodyMedium?.color?.withValues(alpha: 0.6) ?? Colors.grey), size: 28),
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

  void _showTableTransferDialog(BuildContext context) {
    ScaffoldMessenger.of(context).showSnackBar(
      SnackBar(
        content: Row(
          children: [
            Icon(Icons.info_outline, color: Colors.white),
            const SizedBox(width: 12),
            Expanded(child: Text('Tap on an Occupied table on the map to Transfer or Merge it.', style: GoogleFonts.inter(fontWeight: FontWeight.w600))),
          ],
        ),
        backgroundColor: Theme.of(context).colorScheme.secondary,
        behavior: SnackBarBehavior.floating,
        shape: RoundedRectangleBorder(borderRadius: BorderRadius.circular(12)),
        margin: const EdgeInsets.all(20),
      )
    );
  }

  void _showShiftSummaryDialog(BuildContext context) {
    showDialog(
      context: context,
      builder: (ctx) => AlertDialog(
        backgroundColor: Theme.of(context).cardTheme.color ?? Theme.of(context).colorScheme.surface,
        shape: RoundedRectangleBorder(borderRadius: BorderRadius.circular(24)),
        title: Text('My Performance (Today)', style: GoogleFonts.inter(fontWeight: FontWeight.w800, color: (Theme.of(context).textTheme.bodyMedium?.color ?? Colors.black))),
        content: SizedBox(
          width: 400,
          child: Consumer(
            builder: (context, ref, child) {
              final statsState = ref.watch(waiterStatsProvider);
              return statsState.when(
                data: (stats) {
                  return Column(
                    mainAxisSize: MainAxisSize.min,
                    crossAxisAlignment: CrossAxisAlignment.start,
                    children: [
                      Text('Orders Served: ${stats['ordersServed']}', style: GoogleFonts.inter(color: (Theme.of(context).textTheme.bodyMedium?.color ?? Colors.black), fontSize: 16)),
                      const SizedBox(height: 8),
                      Text('Tables Served: ${stats['tablesServed']}', style: GoogleFonts.inter(color: (Theme.of(context).textTheme.bodyMedium?.color ?? Colors.black), fontSize: 16)),
                      const SizedBox(height: 16),
                      Text('Sales Generated: ${AppCurrency.format((stats['salesGenerated'] ?? 0))}', style: GoogleFonts.inter(fontWeight: FontWeight.w800, color: Theme.of(context).colorScheme.primary, fontSize: 18)),
                    ],
                  );
                },
                loading: () => const Center(child: CircularProgressIndicator()),
                error: (e, _) => Text('Failed to load performance stats: $e', style: GoogleFonts.inter(color: Colors.red)),
              );
            },
          ),
        ),
        actions: [
          TextButton(
            onPressed: () => Navigator.pop(ctx),
            child: Text('Close', style: GoogleFonts.inter(color: (Theme.of(context).textTheme.bodyMedium?.color?.withValues(alpha: 0.6) ?? Colors.grey))),
          ),
        ],
      ),
    );
  }
}

// Sub-widgets


// Enterprise Metric Card
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

// Action Button
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
          padding: const EdgeInsets.symmetric(vertical: 16),
          decoration: BoxDecoration(
            borderRadius: BorderRadius.circular(16),
            border: Border.all(color: textColor.withValues(alpha: 0.1)),
          ),
          child: Column(
            mainAxisAlignment: MainAxisAlignment.center,
            children: [
              Icon(icon, color: textColor, size: 28),
              const SizedBox(height: 12),
              Text(label, style: GoogleFonts.inter(color: textColor, fontWeight: FontWeight.w700, fontSize: 14), textAlign: TextAlign.center),
            ],
          ),
        ),
      ),
    ).animate().fadeIn().scale();
  }
}

// Kitchen Status Row with Progress
class _KitchenStatusProgressRow extends StatelessWidget {
  final String label;
  final int count;
  final int maxCount;
  final Color color;

  const _KitchenStatusProgressRow({required this.label, required this.count, required this.maxCount, required this.color});

  @override
  Widget build(BuildContext context) {
    final double progress = (count / maxCount).clamp(0.0, 1.0);
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
