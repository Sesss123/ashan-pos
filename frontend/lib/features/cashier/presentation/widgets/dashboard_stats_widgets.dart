import 'package:flutter/material.dart';
import 'package:flutter_animate/flutter_animate.dart';
import 'package:google_fonts/google_fonts.dart';
// lucide_icons removed - using built-in Icons.*

// --- Theme Colors ---

class DashboardStatsWidgets extends StatelessWidget {
  const DashboardStatsWidgets({super.key});

  @override
  Widget build(BuildContext context) {
    return LayoutBuilder(
      builder: (context, constraints) {
        final isScrollable = constraints.maxWidth == double.infinity;
        
        return Row(
          mainAxisSize: MainAxisSize.min,
          children: [
            _buildStatCard(context, 'Orders Today', '142', Icons.receipt_long_outlined, Theme.of(context).colorScheme.primary, isScrollable, '+12%'),
            const SizedBox(width: 16),
            _buildStatCard(context, 'Open Orders', '8', Icons.access_time, Colors.orange, isScrollable, 'Urgent: 2'),
            const SizedBox(width: 16),
            _buildStatCard(context, 'Kitchen Pending', '3', Icons.local_fire_department_outlined, Theme.of(context).colorScheme.error, isScrollable, 'Action req.'),
          ],
        );
      }
    );
  }

  Widget _buildStatCard(BuildContext context, String title, String value, IconData icon, Color color, bool isScrollable, String subtitle) {
    final card = Container(
      width: isScrollable ? 240 : null,
      padding: const EdgeInsets.all(20),
      decoration: BoxDecoration(
        color: Theme.of(context).cardTheme.color ?? Theme.of(context).colorScheme.surface,
        borderRadius: BorderRadius.circular(16),
        border: Border.all(color: Theme.of(context).dividerColor),
        boxShadow: [BoxShadow(color: Colors.black.withValues(alpha: 0.03), blurRadius: 16, offset: const Offset(0, 8))],
      ),
      child: Row(
        crossAxisAlignment: CrossAxisAlignment.center,
        children: [
          Container(
            padding: const EdgeInsets.all(12),
            decoration: BoxDecoration(
              color: color.withValues(alpha: 0.1),
              borderRadius: BorderRadius.circular(14),
            ),
            child: Icon(icon, color: color, size: 28),
          ),
          const SizedBox(width: 16),
          Expanded(
            child: Column(
              crossAxisAlignment: CrossAxisAlignment.start,
              mainAxisSize: MainAxisSize.min,
              children: [
                Text(title, style: GoogleFonts.inter(fontSize: 13, color: (Theme.of(context).textTheme.bodyMedium?.color?.withValues(alpha: 0.6) ?? Colors.grey), fontWeight: FontWeight.w600), maxLines: 1, overflow: TextOverflow.ellipsis),
                const SizedBox(height: 4),
                Row(
                  crossAxisAlignment: CrossAxisAlignment.end,
                  children: [
                    Text(value, style: GoogleFonts.inter(fontSize: 26, fontWeight: FontWeight.w800, color: (Theme.of(context).textTheme.bodyMedium?.color ?? Colors.black)), maxLines: 1, overflow: TextOverflow.ellipsis),
                    const SizedBox(width: 8),
                    Padding(
                      padding: const EdgeInsets.only(bottom: 4),
                      child: Text(subtitle, style: GoogleFonts.inter(fontSize: 11, fontWeight: FontWeight.w700, color: color)),
                    ),
                  ],
                ),
              ],
            ),
          ),
        ],
      ),
    ).animate().fadeIn(duration: 400.ms).slideY(begin: 0.1, end: 0);

    return isScrollable ? card : Expanded(child: card);
  }
}
