import 'package:flutter/material.dart';
import 'package:flutter_riverpod/flutter_riverpod.dart';
import 'package:google_fonts/google_fonts.dart';

import 'providers/kitchen_providers.dart';

class KdsAnalyticsScreen extends ConsumerWidget {
  const KdsAnalyticsScreen({super.key});

  @override
  Widget build(BuildContext context, WidgetRef ref) {
    final analyticsState = ref.watch(kitchenAnalyticsProvider);

    return Scaffold(
      backgroundColor: Theme.of(context).scaffoldBackgroundColor,
      appBar: AppBar(
        backgroundColor: Theme.of(context).cardTheme.color ?? Theme.of(context).colorScheme.surface,
        elevation: 0,
        centerTitle: false,
        iconTheme: IconThemeData(color: (Theme.of(context).textTheme.bodyMedium?.color ?? Colors.black)),
        title: Text('Kitchen Analytics', style: GoogleFonts.inter(fontWeight: FontWeight.w800, color: (Theme.of(context).textTheme.bodyMedium?.color ?? Colors.black))),
      ),
      body: analyticsState.when(
        loading: () => const Center(child: CircularProgressIndicator()),
        error: (e, st) => Center(child: Text('Error loading analytics: $e', style: GoogleFonts.inter(color: Colors.red))),
        data: (stats) {
          return Padding(
            padding: const EdgeInsets.all(24.0),
            child: Column(
              crossAxisAlignment: CrossAxisAlignment.start,
              children: [
                Text(
                  "Today's Kitchen Performance",
                  style: GoogleFonts.inter(fontWeight: FontWeight.w800, fontSize: 24, color: (Theme.of(context).textTheme.bodyMedium?.color ?? Colors.black)),
                ),
                const SizedBox(height: 24),
                Row(
                  children: [
                    _buildStatCard(context, 'Total Orders', stats['totalOrders'].toString(), Icons.receipt_long, Colors.blue),
                    const SizedBox(width: 16),
                    _buildStatCard(context, 'Completed', stats['completedOrders'].toString(), Icons.check_circle, Colors.green),
                    const SizedBox(width: 16),
                    _buildStatCard(context, 'Pending', stats['pendingOrders'].toString(), Icons.hourglass_empty, Colors.orange),
                    const SizedBox(width: 16),
                    _buildStatCard(context, 'Preparing', stats['preparingOrders'].toString(), Icons.soup_kitchen, Colors.purple),
                  ],
                ),
                const SizedBox(height: 32),
                Container(
                  padding: const EdgeInsets.all(24),
                  decoration: BoxDecoration(
                    color: Theme.of(context).cardTheme.color ?? Theme.of(context).colorScheme.surface,
                    borderRadius: BorderRadius.circular(16),
                    border: Border.all(color: Theme.of(context).dividerColor),
                  ),
                  child: Column(
                    crossAxisAlignment: CrossAxisAlignment.start,
                    children: [
                      Text('Efficiency Metrics', style: GoogleFonts.inter(fontWeight: FontWeight.w800, fontSize: 18, color: (Theme.of(context).textTheme.bodyMedium?.color ?? Colors.black))),
                      const SizedBox(height: 16),
                      Text(
                        'This section will display Average Prep Time and Delayed Orders charts in the future updates (Phase 2).',
                        style: GoogleFonts.inter(color: Colors.grey, fontStyle: FontStyle.italic),
                      ),
                    ],
                  ),
                ),
              ],
            ),
          );
        },
      ),
    );
  }

  Widget _buildStatCard(BuildContext context, String title, String value, IconData icon, Color color) {
    return Expanded(
      child: Container(
        padding: const EdgeInsets.all(20),
        decoration: BoxDecoration(
          color: Theme.of(context).cardTheme.color ?? Theme.of(context).colorScheme.surface,
          borderRadius: BorderRadius.circular(16),
          border: Border.all(color: Theme.of(context).dividerColor),
        ),
        child: Column(
          crossAxisAlignment: CrossAxisAlignment.start,
          children: [
            Row(
              children: [
                Container(
                  padding: const EdgeInsets.all(8),
                  decoration: BoxDecoration(color: color.withValues(alpha: 0.1), borderRadius: BorderRadius.circular(8)),
                  child: Icon(icon, color: color, size: 20),
                ),
                const SizedBox(width: 12),
                Expanded(child: Text(title, style: GoogleFonts.inter(color: Colors.grey[600], fontWeight: FontWeight.w600))),
              ],
            ),
            const SizedBox(height: 16),
            Text(value, style: GoogleFonts.inter(fontWeight: FontWeight.w800, fontSize: 32, color: (Theme.of(context).textTheme.bodyMedium?.color ?? Colors.black))),
          ],
        ),
      ),
    );
  }
}
