import '../../../core/utils/app_currency.dart';
import 'package:flutter/material.dart';
import 'package:flutter_riverpod/flutter_riverpod.dart';
import 'providers/executive_provider.dart';
import '../../../../core/layout/adaptive_scaffold.dart';
import '../../../../core/layout/desktop_sidebar.dart';
import '../../../../core/widgets/premium_kpi_card.dart';
import '../../../../core/widgets/skeleton_loader.dart';

class ExecutiveDashboardScreen extends ConsumerStatefulWidget {
  const ExecutiveDashboardScreen({super.key});

  @override
  ConsumerState<ExecutiveDashboardScreen> createState() => _ExecutiveDashboardScreenState();
}

class _ExecutiveDashboardScreenState extends ConsumerState<ExecutiveDashboardScreen> {
  @override
  void initState() {
    super.initState();
    WidgetsBinding.instance.addPostFrameCallback((_) {
      ref.read(executiveProvider.notifier).fetchGodView();
    });
  }

  @override
  Widget build(BuildContext context) {
    final state = ref.watch(executiveProvider);

    return AdaptiveScaffold(
      sidebar: const DesktopSidebar(),
      topNav: _buildTopNav(context),
      body: state.isLoading && state.data.isEmpty
          ? _buildLoadingState()
          : state.error != null
              ? _buildErrorState(state.error!)
              : _buildDashboardContent(context, state.data),
    );
  }

  Widget _buildTopNav(BuildContext context) {
    return Container(
      height: 72,
      padding: const EdgeInsets.symmetric(horizontal: 32),
      decoration: BoxDecoration(
        color: Theme.of(context).scaffoldBackgroundColor,
      ),
      child: Row(
        children: [
          Text('Overview', style: Theme.of(context).textTheme.displayLarge?.copyWith(fontSize: 24)),
          const Spacer(),
          // Command Palette Search Mock
          Container(
            width: 300,
            height: 40,
            padding: const EdgeInsets.symmetric(horizontal: 16),
            decoration: BoxDecoration(
              color: Theme.of(context).brightness == Brightness.dark ? const Color(0xFF1E1E1E) : Colors.white,
              borderRadius: BorderRadius.circular(8),
              border: Border.all(color: Theme.of(context).dividerColor),
            ),
            child: Row(
              children: [
                const Icon(Icons.search, size: 18, color: Colors.grey),
                const SizedBox(width: 8),
                const Text('Search anything...', style: TextStyle(color: Colors.grey, fontSize: 14)),
                const Spacer(),
                Container(
                  padding: const EdgeInsets.symmetric(horizontal: 6, vertical: 2),
                  decoration: BoxDecoration(
                    color: Theme.of(context).scaffoldBackgroundColor,
                    borderRadius: BorderRadius.circular(4),
                  ),
                  child: const Text('⌘K', style: TextStyle(fontSize: 12, fontWeight: FontWeight.bold, color: Colors.grey)),
                )
              ],
            ),
          ),
          const SizedBox(width: 24),
          IconButton(icon: const Icon(Icons.notifications_none), onPressed: () {}),
        ],
      ),
    );
  }

  Widget _buildDashboardContent(BuildContext context, Map<String, dynamic> data) {
    return SingleChildScrollView(
      padding: const EdgeInsets.all(32.0),
      child: Column(
        crossAxisAlignment: CrossAxisAlignment.start,
        children: [
          SizedBox(
            height: 160,
            child: Row(
              children: [
                Expanded(child: PremiumKpiCard(
                  title: 'Total Revenue', 
                  value: AppCurrency.format(data['enterpriseRevenue'] ?? '0.00'), 
                  trend: '+12.5%', 
                  isPositive: true, 
                  icon: Icons.attach_money
                )),
                const SizedBox(width: 24),
                Expanded(child: PremiumKpiCard(
                  title: 'Active Branches', 
                  value: '${data['activeBranches'] ?? 0}', 
                  trend: '+2', 
                  isPositive: true, 
                  icon: Icons.storefront
                )),
                const SizedBox(width: 24),
                Expanded(child: PremiumKpiCard(
                  title: 'Live Orders', 
                  value: '${data['liveOrders'] ?? 0}', 
                  trend: '-5.2%', 
                  isPositive: false, 
                  icon: Icons.receipt_long
                )),
                const SizedBox(width: 24),
                const Expanded(child: PremiumKpiCard(
                  title: 'Productivity Score', 
                  value: '94.2', 
                  trend: '+1.1%', 
                  isPositive: true, 
                  icon: Icons.bolt
                )),
              ],
            ),
          ),
          const SizedBox(height: 40),
          
          Text('AI Business Insights', style: Theme.of(context).textTheme.titleMedium),
          const SizedBox(height: 16),
          _buildInsightsGrid(data['insights'] ?? []),
        ],
      ),
    );
  }

  Widget _buildInsightsGrid(List<dynamic> insights) {
    return GridView.builder(
      shrinkWrap: true,
      physics: const NeverScrollableScrollPhysics(),
      gridDelegate: const SliverGridDelegateWithFixedCrossAxisCount(
        crossAxisCount: 2,
        crossAxisSpacing: 24,
        mainAxisSpacing: 24,
        childAspectRatio: 3,
      ),
      itemCount: insights.length,
      itemBuilder: (context, index) {
        final insight = insights[index];
        return Container(
          padding: const EdgeInsets.all(24),
          decoration: BoxDecoration(
            color: Theme.of(context).cardTheme.color,
            borderRadius: BorderRadius.circular(16),
            border: Border.all(color: Theme.of(context).dividerColor),
          ),
          child: Row(
            children: [
              Container(
                width: 48,
                height: 48,
                decoration: BoxDecoration(
                  color: Colors.purple.withValues(alpha: 0.1),
                  borderRadius: BorderRadius.circular(12),
                ),
                child: const Icon(Icons.auto_awesome, color: Colors.purple),
              ),
              const SizedBox(width: 16),
              Expanded(
                child: Column(
                  crossAxisAlignment: CrossAxisAlignment.start,
                  mainAxisAlignment: MainAxisAlignment.center,
                  children: [
                    Text(insight['title'], style: const TextStyle(fontWeight: FontWeight.bold, fontSize: 16)),
                    const SizedBox(height: 4),
                    Text(insight['description'] ?? 'AI predicted insight.', style: const TextStyle(color: Colors.grey, fontSize: 13), maxLines: 2, overflow: TextOverflow.ellipsis),
                  ],
                ),
              )
            ],
          ),
        );
      },
    );
  }

  Widget _buildLoadingState() {
    return Padding(
      padding: const EdgeInsets.all(32.0),
      child: Column(
        children: [
          Row(
            children: List.generate(4, (index) => const Expanded(child: Padding(
              padding: EdgeInsets.only(right: 24.0),
              child: SkeletonLoader(width: double.infinity, height: 160, borderRadius: 16),
            ))),
          ),
          const SizedBox(height: 40),
          Row(
            children: List.generate(2, (index) => const Expanded(child: Padding(
              padding: EdgeInsets.only(right: 24.0),
              child: SkeletonLoader(width: double.infinity, height: 120, borderRadius: 16),
            ))),
          ),
        ],
      ),
    );
  }

  Widget _buildErrorState(String error) {
    return Center(
      child: Column(
        mainAxisAlignment: MainAxisAlignment.center,
        children: [
          const Icon(Icons.error_outline, size: 64, color: Colors.redAccent),
          const SizedBox(height: 16),
          Text('Failed to load Dashboard', style: Theme.of(context).textTheme.titleMedium),
          const SizedBox(height: 8),
          Text(error, style: const TextStyle(color: Colors.grey)),
        ],
      ),
    );
  }
}
