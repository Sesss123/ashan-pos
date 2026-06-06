import 'package:flutter/material.dart';
import '../theme/app_colors.dart';

class AdaptiveScaffold extends StatelessWidget {
  final Widget body;
  final Widget? sidebar;
  final Widget? topNav;

  const AdaptiveScaffold({
    super.key,
    required this.body,
    this.sidebar,
    this.topNav,
  });

  @override
  Widget build(BuildContext context) {
    final width = MediaQuery.of(context).size.width;
    final isDesktop = width >= 1024;
    final isTablet = width >= 768 && width < 1024;

    return Scaffold(
      backgroundColor: Theme.of(context).scaffoldBackgroundColor,
      body: Row(
        children: [
          if (isDesktop && sidebar != null)
            SizedBox(
              width: 260,
              child: sidebar!,
            ),
          if (isTablet && sidebar != null)
            SizedBox(
              width: 80, // Navigation Rail size
              child: sidebar!, // Assuming sidebar handles its own condensed state
            ),
          Expanded(
            child: Column(
              children: [
                if (topNav != null) topNav!,
                Expanded(
                  child: ClipRRect(
                    borderRadius: isDesktop ? const BorderRadius.only(topLeft: Radius.circular(24)) : BorderRadius.zero,
                    child: Container(
                      color: Theme.of(context).brightness == Brightness.dark 
                          ? AppColors.surfaceDark 
                          : AppColors.surfaceLight,
                      child: body,
                    ),
                  ),
                ),
              ],
            ),
          ),
        ],
      ),
      bottomNavigationBar: (!isDesktop && !isTablet)
          ? BottomNavigationBar(
              items: const [
                BottomNavigationBarItem(icon: Icon(Icons.dashboard), label: 'Home'),
                BottomNavigationBarItem(icon: Icon(Icons.receipt), label: 'Orders'),
                BottomNavigationBarItem(icon: Icon(Icons.settings), label: 'Settings'),
              ],
            )
          : null,
    );
  }
}
