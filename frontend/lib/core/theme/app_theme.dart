import 'package:flutter/material.dart';
import 'package:google_fonts/google_fonts.dart';
import 'app_colors.dart';

class AppTheme {
  static BrandColors _getColors(BrandTheme brand) {
    if (brand == BrandTheme.premiumSoft) return PremiumSoftColors();
    return UberColors();
  }

  static ThemeData getTheme(BrandTheme brand, Brightness brightness) {
    final colors = _getColors(brand);
    final isDark = brightness == Brightness.dark;

    return ThemeData(
      useMaterial3: true,
      brightness: brightness,
      colorScheme: isDark
          ? ColorScheme.dark(
              primary: colors.primaryDark,
              secondary: colors.secondaryDark,
              surface: colors.surfaceDark,
              error: colors.errorDark,
              onPrimary: Colors.black,
              onSecondary: Colors.black,
              onSurface: colors.textPrimaryDark,
              onError: Colors.black,
            )
          : ColorScheme.light(
              primary: colors.primary,
              secondary: colors.secondary,
              surface: colors.surfaceLight,
              error: colors.error,
              onPrimary: Colors.white,
              onSecondary: Colors.white,
              onSurface: colors.textPrimaryLight,
              onError: Colors.white,
            ),
      scaffoldBackgroundColor: isDark ? colors.backgroundDark : colors.backgroundLight,
      dividerColor: isDark ? colors.borderDark : colors.borderLight,
      textTheme: GoogleFonts.interTextTheme(isDark ? ThemeData.dark().textTheme : ThemeData.light().textTheme).apply(
        bodyColor: isDark ? colors.textPrimaryDark : colors.textPrimaryLight,
        displayColor: isDark ? colors.textPrimaryDark : colors.textPrimaryLight,
      ),
      appBarTheme: AppBarTheme(
        backgroundColor: isDark ? colors.backgroundDark : colors.backgroundLight,
        foregroundColor: isDark ? colors.textPrimaryDark : colors.textPrimaryLight,
        elevation: 0,
        centerTitle: false,
        titleTextStyle: GoogleFonts.inter(fontSize: 18, fontWeight: FontWeight.w600, color: isDark ? colors.textPrimaryDark : colors.textPrimaryLight),
      ),
      cardTheme: CardThemeData(
        color: isDark ? colors.surfaceDark : colors.surfaceLight,
        elevation: 0,
        shape: RoundedRectangleBorder(
          borderRadius: BorderRadius.circular(brand == BrandTheme.premiumSoft ? 32 : 24),
          side: isDark ? BorderSide.none : BorderSide(color: colors.borderLight),
        ),
      ),
      dividerTheme: DividerThemeData(
        color: isDark ? colors.borderDark : colors.borderLight,
        thickness: 1,
      ),
      elevatedButtonTheme: ElevatedButtonThemeData(
        style: ElevatedButton.styleFrom(
          backgroundColor: isDark ? colors.primaryDark : colors.primary,
          foregroundColor: isDark ? Colors.black : Colors.white,
          elevation: brand == BrandTheme.premiumSoft ? 2 : 0,
          shadowColor: brand == BrandTheme.premiumSoft ? colors.primary.withValues(alpha: 0.3) : null,
          padding: const EdgeInsets.symmetric(horizontal: 24, vertical: 16),
          shape: RoundedRectangleBorder(borderRadius: BorderRadius.circular(brand == BrandTheme.premiumSoft ? 24 : 16)),
          textStyle: GoogleFonts.inter(fontWeight: brand == BrandTheme.premiumSoft ? FontWeight.w500 : FontWeight.w600),
        ),
      ),
    );
  }

  // Deprecated static accessors for compatibility during transition
  static ThemeData get darkTheme => getTheme(BrandTheme.uber, Brightness.dark);
  static ThemeData get lightTheme => getTheme(BrandTheme.uber, Brightness.light);
}
