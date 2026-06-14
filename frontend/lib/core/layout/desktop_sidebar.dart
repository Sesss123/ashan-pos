import 'package:flutter/material.dart';
import 'package:flutter_riverpod/flutter_riverpod.dart';
import '../theme/app_colors.dart';
import '../providers/settings_provider.dart';

class DesktopSidebar extends ConsumerWidget {
  const DesktopSidebar({super.key});

  @override
  Widget build(BuildContext context, WidgetRef ref) {
    final settingsAsync = ref.watch(settingsProvider);
    final appName = settingsAsync.value?.restaurantName ?? 'AshnPOS';
    final isDark = Theme.of(context).brightness == Brightness.dark;
    final textColor = isDark ? AppColors.textSecondaryDark : AppColors.textSecondaryLight;
    final hoverColor = isDark ? AppColors.surfaceHoverDark : AppColors.surfaceHoverLight;

    return Container(
      color: Theme.of(context).scaffoldBackgroundColor,
      padding: const EdgeInsets.all(16.0),
      child: Column(
        crossAxisAlignment: CrossAxisAlignment.start,
        children: [
          const SizedBox(height: 16),
          // Logo Area
          Row(
            children: [
              Container(
                width: 32,
                height: 32,
                decoration: BoxDecoration(
                  color: AppColors.primary,
                  borderRadius: BorderRadius.circular(8),
                ),
                child: const Icon(Icons.restaurant_menu, color: Colors.white, size: 18),
              ),
              const SizedBox(width: 12),
              Text(appName, style: Theme.of(context).textTheme.titleMedium),
            ],
          ),
          const SizedBox(height: 40),
          
          // Navigation Links
          _buildNavGroup('DASHBOARD', [
            _NavItem('Overview', Icons.space_dashboard_outlined, true),
            _NavItem('Live Orders', Icons.receipt_long_outlined, false),
            _NavItem('Kitchen KOT', Icons.soup_kitchen_outlined, false),
          ], textColor, hoverColor),
          
          const SizedBox(height: 24),
          _buildNavGroup('MANAGEMENT', [
            _NavItem('Inventory', Icons.inventory_2_outlined, false),
            _NavItem('Suppliers', Icons.local_shipping_outlined, false),
            _NavItem('Employees', Icons.people_outline, false),
          ], textColor, hoverColor),

          const Spacer(),
          // Bottom Settings Profile
          _buildSingleNavItem(_NavItem('Settings', Icons.settings_outlined, false), textColor, hoverColor),
          const SizedBox(height: 8),
          ListTile(
            contentPadding: EdgeInsets.zero,
            leading: const CircleAvatar(backgroundImage: NetworkImage('https://i.pravatar.cc/150?img=11')),
            title: const Text('Admin User', style: TextStyle(fontWeight: FontWeight.bold, fontSize: 14)),
            subtitle: Text('Super Admin', style: TextStyle(color: textColor, fontSize: 12)),
          )
        ],
      ),
    );
  }

  Widget _buildNavGroup(String title, List<_NavItem> items, Color textColor, Color hoverColor) {
    return Column(
      crossAxisAlignment: CrossAxisAlignment.start,
      children: [
        Text(title, style: TextStyle(fontSize: 12, fontWeight: FontWeight.bold, color: textColor, letterSpacing: 1.2)),
        const SizedBox(height: 12),
        ...items.map((item) => _buildSingleNavItem(item, textColor, hoverColor)),
      ],
    );
  }

  Widget _buildSingleNavItem(_NavItem item, Color textColor, Color hoverColor) {
    return Container(
      margin: const EdgeInsets.only(bottom: 4),
      decoration: BoxDecoration(
        color: item.isActive ? AppColors.primary.withValues(alpha: 0.1) : Colors.transparent,
        borderRadius: BorderRadius.circular(8),
      ),
      child: ListTile(
        dense: true,
        leading: Icon(item.icon, color: item.isActive ? AppColors.primary : textColor, size: 20),
        title: Text(item.title, style: TextStyle(
          color: item.isActive ? AppColors.primary : textColor,
          fontWeight: item.isActive ? FontWeight.bold : FontWeight.normal
        )),
        shape: RoundedRectangleBorder(borderRadius: BorderRadius.circular(8)),
        onTap: () {},
        hoverColor: hoverColor,
      ),
    );
  }
}

class _NavItem {
  final String title;
  final IconData icon;
  final bool isActive;
  _NavItem(this.title, this.icon, this.isActive);
}
