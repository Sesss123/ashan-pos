import 'package:flutter/material.dart';
import 'package:flutter_riverpod/flutter_riverpod.dart';
import 'package:google_fonts/google_fonts.dart';
import 'package:flutter_animate/flutter_animate.dart';
import 'providers/kitchen_providers.dart';
import 'widgets/kds_order_card.dart';
import 'kds_analytics_screen.dart';
import '../../auth/presentation/login_screen.dart';
import '../../../core/widgets/theme_toggle_widget.dart';
import '../../../core/network/dio_client.dart';
import '../../../core/widgets/responsive_layout.dart';

import '../../../core/widgets/skeleton_loader.dart';
class KdsDashboardScreen extends ConsumerStatefulWidget {
  const KdsDashboardScreen({super.key});

  @override
  ConsumerState<KdsDashboardScreen> createState() => _KdsDashboardScreenState();
}

class _KdsDashboardScreenState extends ConsumerState<KdsDashboardScreen> {
  List<String> _availableStations = [];

  @override
  void initState() {
    super.initState();
    _fetchCategories();
    // Start listening to web sockets
    WidgetsBinding.instance.addPostFrameCallback((_) {
      ref.read(kitchenQueueProvider.notifier).listenToSocket();
      ref.read(kitchenHistoryProvider.notifier).listenToSocket();
    });
  }

  Future<void> _fetchCategories() async {
    try {
      final dio = ref.read(dioClientProvider).dio;
      final response = await dio.get('/admin/categories'); // Adjust endpoint if needed
      if (response.data['success']) {
        final categories = response.data['data'] as List<dynamic>;
        setState(() {
          _availableStations = categories.map((c) => c['name'] as String).toList();
        });
      }
    } catch (e) {
      debugPrint('Failed to load categories for stations: $e');
    }
  }

  void _handleStatusChange(String orderId, String newStatus) {
    ref.read(kitchenQueueProvider.notifier).updateStatus(orderId, newStatus);
  }

  @override
  Widget build(BuildContext context) {
    final queueState = ref.watch(kitchenQueueProvider);
    final historyState = ref.watch(kitchenHistoryProvider);
    final selectedStation = ref.watch(selectedStationProvider);

    return Scaffold(
      backgroundColor: Theme.of(context).scaffoldBackgroundColor,
      body: SafeArea(
        child: Padding(
          padding: const EdgeInsets.all(24.0),
          child: Column(
            crossAxisAlignment: CrossAxisAlignment.start,
            children: [
              _buildHeader(selectedStation),
              const SizedBox(height: 32),
              Expanded(
                child: queueState.when(
                  loading: () {
                    final screenWidth = MediaQuery.of(context).size.width;
                    if (screenWidth < 1000) {
                      return const KDSSkeletonList();
                    }
                    return Row(
                      crossAxisAlignment: CrossAxisAlignment.start,
                      children: const [
                        Expanded(child: KDSSkeletonList()),
                        SizedBox(width: 24),
                        Expanded(child: KDSSkeletonList()),
                        SizedBox(width: 24),
                        Expanded(child: KDSSkeletonList()),
                      ],
                    );
                  },
                  error: (e, st) => Center(child: Text('Error loading queue: $e', style: GoogleFonts.inter(color: Colors.red))),
                  data: (orders) {
                    final newOrders = orders.where((o) => o['status'] == 'Pending').toList();
                    final preparingOrders = orders.where((o) => o['status'] == 'Preparing').toList();
                    final readyOrders = orders.where((o) => o['status'] == 'Ready').toList();
                    
                    final historyOrders = historyState.value ?? [];

                    final screenWidth = MediaQuery.of(context).size.width;
                    if (screenWidth < 1000) {
                      return DefaultTabController(
                        length: 4,
                        child: Column(
                          children: [
                            TabBar(
                              labelColor: Theme.of(context).colorScheme.primary,
                              unselectedLabelColor: Theme.of(context).textTheme.bodyMedium?.color?.withValues(alpha: 0.6),
                              indicatorColor: Theme.of(context).colorScheme.primary,
                              tabs: const [
                                Tab(text: 'NEW'),
                                Tab(text: 'PREP'),
                                Tab(text: 'READY'),
                                Tab(text: 'HISTORY'),
                              ],
                            ),
                            const SizedBox(height: 16),
                            Expanded(
                              child: TabBarView(
                                children: [
                                  _buildColumn(context, 'NEW ORDERS', newOrders, Colors.orange, selectedStation),
                                  _buildColumn(context, 'PREPARING', preparingOrders, Theme.of(context).colorScheme.primary, selectedStation),
                                  _buildColumn(context, 'READY', readyOrders, Colors.green, selectedStation),
                                  _buildColumn(context, 'HISTORY', historyOrders, Colors.grey, selectedStation),
                                ],
                              ),
                            ),
                          ],
                        ),
                      );
                    }

                    if (ResponsiveLayout.isMobile(context)) {
                      return DefaultTabController(
                        length: 4,
                        child: Column(
                          children: [
                            TabBar(
                              labelColor: Theme.of(context).colorScheme.primary,
                              unselectedLabelColor: Colors.grey,
                              indicatorColor: Theme.of(context).colorScheme.primary,
                              tabs: const [
                                Tab(text: 'NEW'),
                                Tab(text: 'PREP'),
                                Tab(text: 'READY'),
                                Tab(text: 'HISTORY'),
                              ],
                            ),
                            const SizedBox(height: 16),
                            Expanded(
                              child: TabBarView(
                                children: [
                                  _buildColumn(context, 'NEW ORDERS', newOrders, Colors.orange, selectedStation, isMobile: true),
                                  _buildColumn(context, 'PREPARING', preparingOrders, Theme.of(context).colorScheme.primary, selectedStation, isMobile: true),
                                  _buildColumn(context, 'READY', readyOrders, Colors.green, selectedStation, isMobile: true),
                                  _buildColumn(context, 'HISTORY', historyOrders, Colors.grey, selectedStation, isMobile: true),
                                ],
                              ),
                            ),
                          ],
                        ),
                      );
                    }

                    return Row(
                      crossAxisAlignment: CrossAxisAlignment.start,
                      children: [
                        Expanded(child: _buildColumn(context, 'NEW ORDERS', newOrders, Colors.orange, selectedStation)),
                        const SizedBox(width: 24),
                        Expanded(child: _buildColumn(context, 'PREPARING', preparingOrders, Theme.of(context).colorScheme.primary, selectedStation)),
                        const SizedBox(width: 24),
                        Expanded(child: _buildColumn(context, 'READY', readyOrders, Colors.green, selectedStation)),
                        const SizedBox(width: 24),
                        Expanded(child: _buildColumn(context, 'HISTORY', historyOrders, Colors.grey, selectedStation)),
                      ],
                    );
                  },
                ),
              ),
            ],
          ),
        ),
      ),
    );
  }

  Widget _buildHeader(String? selectedStation) {
    return Row(
      mainAxisAlignment: MainAxisAlignment.spaceBetween,
      children: [
        Column(
          crossAxisAlignment: CrossAxisAlignment.start,
          children: [
            Text(
              'Kitchen Display System', 
              style: GoogleFonts.inter(color: (Theme.of(context).textTheme.bodyMedium?.color ?? Colors.black), fontSize: 26, fontWeight: FontWeight.w800, letterSpacing: -0.5),
            ),
            const SizedBox(height: 8),
            Row(
              children: [
                Container(
                  width: 8, height: 8, 
                  decoration: BoxDecoration(color: Theme.of(context).colorScheme.primary, shape: BoxShape.circle)
                ).animate(onPlay: (c) => c.repeat(reverse: true)).fadeOut(duration: 1.seconds).fadeIn(duration: 1.seconds),
                const SizedBox(width: 8),
                Text(
                  'Live Updates Active', 
                  style: GoogleFonts.inter(color: Theme.of(context).colorScheme.primary, fontSize: 14, fontWeight: FontWeight.w700),
                ),
              ],
            ),
          ],
        ),
        Row(
          children: [
            Container(
              padding: const EdgeInsets.symmetric(horizontal: 16, vertical: 4),
              decoration: BoxDecoration(
                color: Theme.of(context).cardTheme.color ?? Theme.of(context).colorScheme.surface,
                borderRadius: BorderRadius.circular(16),
                border: Border.all(color: Theme.of(context).dividerColor),
                boxShadow: [BoxShadow(color: Colors.black.withValues(alpha: 0.02), blurRadius: 8, offset: const Offset(0, 2))],
              ),
              child: DropdownButtonHideUnderline(
                child: DropdownButton<String>(
                  value: selectedStation,
                  hint: Text('All Stations', style: GoogleFonts.inter(fontWeight: FontWeight.w600, color: (Theme.of(context).textTheme.bodyMedium?.color ?? Colors.black))),
                  icon: const Icon(Icons.filter_list),
                  items: [
                    const DropdownMenuItem(value: null, child: Text('All Stations')),
                    ..._availableStations.map((s) => DropdownMenuItem(value: s, child: Text(s))),
                  ],
                  onChanged: (val) => ref.read(selectedStationProvider.notifier).setStation(val),
                ),
              ),
            ),
            const SizedBox(width: 12),
            _buildIconButton(
              icon: Icons.analytics_outlined,
              onTap: () => Navigator.push(context, MaterialPageRoute(builder: (_) => const KdsAnalyticsScreen())),
            ),
            const SizedBox(width: 12),
            const ThemeToggleWidget(compact: true),
            const SizedBox(width: 12),
            _buildIconButton(
              icon: Icons.logout_outlined,
              onTap: () => Navigator.pushReplacement(context, MaterialPageRoute(builder: (_) => const LoginScreen())),
            ),
          ],
        )
      ],
    ).animate().fadeIn(duration: 400.ms).slideY(begin: -0.05, end: 0);
  }

  Widget _buildIconButton({required IconData icon, required VoidCallback onTap}) {
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
          child: Padding(
            padding: const EdgeInsets.all(12.0),
            child: Icon(icon, color: (Theme.of(context).textTheme.bodyMedium?.color ?? Colors.black), size: 24),
          ),
        ),
      ),
    );
  }

  Widget _buildColumn(BuildContext context, String title, List<dynamic> orders, Color color, String? selectedStation, {bool isMobile = false}) {
    final isDark = Theme.of(context).brightness == Brightness.dark;

    Widget container = Container(
        decoration: BoxDecoration(
          color: Theme.of(context).cardTheme.color ?? Theme.of(context).colorScheme.surface,
          borderRadius: BorderRadius.circular(24),
          border: Border.all(color: color.withValues(alpha: 0.3), width: 1.5),
          boxShadow: [
            BoxShadow(
              color: color.withValues(alpha: 0.05),
              blurRadius: 20,
              offset: const Offset(0, 8),
            )
          ],
          gradient: LinearGradient(
            begin: Alignment.topCenter,
            end: Alignment.bottomCenter,
            colors: [
              color.withValues(alpha: isDark ? 0.08 : 0.03),
              Theme.of(context).cardTheme.color ?? Theme.of(context).colorScheme.surface,
            ],
          ),
        ),
        child: Column(
          children: [
            Container(
              padding: const EdgeInsets.symmetric(vertical: 20, horizontal: 16),
              decoration: BoxDecoration(
                border: Border(bottom: BorderSide(color: color.withValues(alpha: 0.2))),
              ),
              child: Row(
                mainAxisAlignment: MainAxisAlignment.spaceBetween,
                children: [
                  Row(
                    children: [
                      Container(
                        padding: const EdgeInsets.all(8),
                        decoration: BoxDecoration(
                          color: color.withValues(alpha: 0.15),
                          borderRadius: BorderRadius.circular(12),
                        ),
                        child: Icon(Icons.receipt_long, color: color, size: 20),
                      ),
                      const SizedBox(width: 12),
                      Text(
                        title,
                        style: GoogleFonts.inter(color: (Theme.of(context).textTheme.bodyMedium?.color ?? Colors.black), fontWeight: FontWeight.w800, fontSize: 16, letterSpacing: 0.5),
                      ),
                    ],
                  ),
                  Container(
                    padding: const EdgeInsets.symmetric(horizontal: 12, vertical: 6),
                    decoration: BoxDecoration(color: color, borderRadius: BorderRadius.circular(20), boxShadow: [BoxShadow(color: color.withValues(alpha: 0.4), blurRadius: 4)]),
                    child: Text(
                      orders.length.toString(),
                      style: GoogleFonts.inter(color: Colors.white, fontWeight: FontWeight.w800, fontSize: 14),
                    ),
                  ),
                ],
              ),
            ),
            Expanded(
              child: ListView.builder(
                padding: const EdgeInsets.all(16),
                itemCount: orders.length,
                itemBuilder: (context, index) {
                  return Padding(
                    padding: const EdgeInsets.only(bottom: 12),
                    child: KdsOrderCard(
                      kitchenOrder: orders[index],
                      selectedStation: selectedStation,
                      onStatusChange: _handleStatusChange,
                    ).animate().fadeIn(delay: Duration(milliseconds: 50 * index)).slideY(begin: 0.1, end: 0),
                  );
                },
              ),
            ),
          ],
        ),
      ).animate().fadeIn().scale(curve: Curves.easeOutQuart);
      
    return isMobile ? container : container;
  }
}
