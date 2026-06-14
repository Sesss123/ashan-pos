import 'package:flutter/material.dart';
import 'package:flutter_riverpod/flutter_riverpod.dart';
import '../../../core/theme/theme_provider.dart';
import '../../../core/theme/app_colors.dart';
/// A compact, animated dark/light mode toggle pill.
/// Drop-in anywhere: AppBars, top nav bars, settings panels.
class ThemeToggleWidget extends ConsumerWidget {
  /// If [compact] is true, renders only the icon button (no pill track).
  final bool compact;

  const ThemeToggleWidget({super.key, this.compact = false});

  @override
  Widget build(BuildContext context, WidgetRef ref) {
    final isDark     = Theme.of(context).brightness == Brightness.dark;
    final themeAsync = ref.watch(themeModeProvider);
    final brandAsync = ref.watch(brandThemeProvider);
    
    // While loading from SharedPreferences, keep the current system state
    if (themeAsync.isLoading || brandAsync.isLoading) return const SizedBox.shrink();

    final currentBrand = brandAsync.value ?? BrandTheme.uber;

    return Row(
      mainAxisSize: MainAxisSize.min,
      children: [
        _BrandThemeSelector(currentBrand: currentBrand, isDark: isDark, ref: ref),
        const SizedBox(width: 8),
        if (compact)
          _CompactToggle(isDark: isDark, ref: ref)
        else
          _PillToggle(isDark: isDark, ref: ref),
      ],
    );
  }
}

class _BrandThemeSelector extends StatelessWidget {
  final BrandTheme currentBrand;
  final bool isDark;
  final WidgetRef ref;

  const _BrandThemeSelector({required this.currentBrand, required this.isDark, required this.ref});

  @override
  Widget build(BuildContext context) {
    return PopupMenuButton<BrandTheme>(
      tooltip: 'Change Brand Theme',
      initialValue: currentBrand,
      offset: const Offset(0, 40),
      shape: RoundedRectangleBorder(borderRadius: BorderRadius.circular(12)),
      color: isDark ? const Color(0xFF1E293B) : Colors.white,
      onSelected: (brand) => ref.read(brandThemeProvider.notifier).setBrand(brand),
      icon: Icon(
        Icons.palette_outlined,
        color: isDark ? const Color(0xFF94A3B8) : const Color(0xFF64748B),
        size: 20,
      ),
      itemBuilder: (context) => [
        PopupMenuItem(
          value: BrandTheme.uber,
          child: Row(
            children: [
              Container(width: 16, height: 16, decoration: const BoxDecoration(color: Color(0xFF06C167), shape: BoxShape.circle)),
              const SizedBox(width: 8),
              const Text('Uber Green'),
              if (currentBrand == BrandTheme.uber) const Spacer(),
              if (currentBrand == BrandTheme.uber) const Icon(Icons.check, size: 16, color: Color(0xFF06C167)),
            ],
          ),
        ),
        PopupMenuItem(
          value: BrandTheme.premiumSoft,
          child: Row(
            children: [
              Container(width: 16, height: 16, decoration: const BoxDecoration(color: Color(0xFF8B5CF6), shape: BoxShape.circle)),
              const SizedBox(width: 8),
              const Text('Premium Soft'),
              if (currentBrand == BrandTheme.premiumSoft) const Spacer(),
              if (currentBrand == BrandTheme.premiumSoft) const Icon(Icons.check, size: 16, color: Color(0xFF8B5CF6)),
            ],
          ),
        ),
      ],
    );
  }
}

// ─────────────────────────────────────────────────────────────────────────────
// Compact version: a single icon button (for tight nav bars)
// ─────────────────────────────────────────────────────────────────────────────
class _CompactToggle extends StatelessWidget {
  final bool isDark;
  final WidgetRef ref;
  const _CompactToggle({required this.isDark, required this.ref});

  @override
  Widget build(BuildContext context) {
    return Tooltip(
      message: isDark ? 'Switch to Light Mode' : 'Switch to Dark Mode',
      child: GestureDetector(
        onTap: () => ref.read(themeModeProvider.notifier).toggle(),
        child: MouseRegion(
          cursor: SystemMouseCursors.click,
          child: AnimatedContainer(
          duration: const Duration(milliseconds: 250),
          width: 38, height: 38,
          decoration: BoxDecoration(
            color: isDark
                ? const Color(0xFF1E293B)
                : const Color(0xFFF1F5F9),
            borderRadius: BorderRadius.circular(12),
            border: Border.all(
              color: isDark
                  ? const Color(0xFF475569)
                  : const Color(0xFFE2E8F0),
              width: 1.5,
            ),
            boxShadow: isDark ? [
              BoxShadow(
                color: Colors.white.withValues(alpha: 0.05),
                blurRadius: 8, offset: const Offset(0, 2),
              )
            ] : null,
          ),
          child: AnimatedSwitcher(
            duration: const Duration(milliseconds: 300),
            transitionBuilder: (child, animation) =>
                ScaleTransition(scale: animation, child: child),
            child: Icon(
              isDark ? Icons.dark_mode : Icons.light_mode,
              key: ValueKey(isDark),
              size: 18,
              color: isDark
                  ? const Color(0xFF60A5FA) // Brighter blue
                  : const Color(0xFFF59E0B),
            ),
          ),
        ),
      ),
      ),
    );
  }
}

// ─────────────────────────────────────────────────────────────────────────────
// Full pill toggle (for the login screen / settings)
// ─────────────────────────────────────────────────────────────────────────────
class _PillToggle extends StatelessWidget {
  final bool isDark;
  final WidgetRef ref;
  const _PillToggle({required this.isDark, required this.ref});

  @override
  Widget build(BuildContext context) {
    return GestureDetector(
      onTap: () => ref.read(themeModeProvider.notifier).toggle(),
      child: Tooltip(
        message: isDark ? 'Switch to Light Mode' : 'Switch to Dark Mode',
        child: AnimatedContainer(
          duration: const Duration(milliseconds: 300),
          width: 68, height: 36,
          padding: const EdgeInsets.symmetric(horizontal: 4),
          decoration: BoxDecoration(
            color: isDark
                ? const Color(0xFF1E293B) // slightly lighter dark blue-grey
                : const Color(0xFFE2E8F0),
            borderRadius: BorderRadius.circular(20),
            border: Border.all(
              color: isDark
                  ? const Color(0xFF475569) // lighter border to pop
                  : const Color(0xFFCBD5E1),
              width: 1.5,
            ),
            boxShadow: [
              BoxShadow(
                color: isDark ? Colors.white.withValues(alpha: 0.05) : Colors.black.withValues(alpha: 0.15),
                blurRadius: 12, offset: const Offset(0, 4),
              ),
            ],
          ),
          child: Stack(
            alignment: Alignment.centerLeft,
            children: [
              // Track icons
              Row(
                mainAxisAlignment: MainAxisAlignment.spaceBetween,
                children: [
                  Icon(
                    Icons.light_mode, size: 16,
                    color: isDark
                        ? const Color(0xFF4B5563)
                        : const Color(0xFFF59E0B),
                  ),
                  Icon(
                    Icons.dark_mode, size: 16,
                    color: isDark
                        ? const Color(0xFF93C5FD)
                        : const Color(0xFF9CA3AF),
                  ),
                ],
              ),
              // Thumb
              AnimatedAlign(
                duration: const Duration(milliseconds: 250),
                curve: Curves.easeInOut,
                alignment: isDark ? Alignment.centerRight : Alignment.centerLeft,
                child: Container(
                  width: 28, height: 28,
                  decoration: BoxDecoration(
                    color: isDark ? const Color(0xFF2563EB) : Colors.white, // Pop with Primary Blue
                    shape: BoxShape.circle,
                    boxShadow: [
                      BoxShadow(
                        color: isDark ? const Color(0xFF2563EB).withValues(alpha: 0.4) : Colors.black.withValues(alpha: 0.2),
                        blurRadius: 8, offset: const Offset(0, 2),
                      ),
                    ],
                  ),
                  child: AnimatedSwitcher(
                    duration: const Duration(milliseconds: 300),
                    transitionBuilder: (child, animation) =>
                        ScaleTransition(scale: animation, child: child),
                    child: Icon(
                      isDark ? Icons.dark_mode : Icons.light_mode,
                      key: ValueKey(isDark),
                      size: 16,
                      color: isDark
                          ? Colors.white
                          : const Color(0xFFF59E0B),
                    ),
                  ),
                ),
              ),
            ],
          ),
        ),
      ),
    );
  }
}
