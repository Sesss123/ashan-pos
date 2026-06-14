import 'package:flutter/material.dart';

enum BrandTheme { uber, premiumSoft }

abstract class BrandColors {
  Color get primary;
  Color get primaryDark;
  Color get secondary;
  Color get secondaryDark;
  Color get success;
  Color get successDark;
  Color get warning;
  Color get warningDark;
  Color get error;
  Color get errorDark;

  Color get backgroundDark;
  Color get surfaceDark;
  Color get surfaceHoverDark;
  Color get borderDark;
  Color get textPrimaryDark;
  Color get textSecondaryDark;

  Color get backgroundLight;
  Color get surfaceLight;
  Color get surfaceHoverLight;
  Color get borderLight;
  Color get textPrimaryLight;
  Color get textSecondaryLight;
}

class UberColors implements BrandColors {
  @override Color get primary => const Color(0xFF06C167);
  @override Color get primaryDark => const Color(0xFF06C167);
  @override Color get secondary => const Color(0xFF2563EB);
  @override Color get secondaryDark => const Color(0xFF3B82F6);
  @override Color get success => const Color(0xFF06C167);
  @override Color get successDark => const Color(0xFF06C167);
  @override Color get warning => const Color(0xFFF5A623);
  @override Color get warningDark => const Color(0xFFF5A623);
  @override Color get error => const Color(0xFFE22134);
  @override Color get errorDark => const Color(0xFFE22134);

  @override Color get backgroundDark => const Color(0xFF000000);
  @override Color get surfaceDark => const Color(0xFF141414);
  @override Color get surfaceHoverDark => const Color(0xFF222222);
  @override Color get borderDark => const Color(0xFF333333);
  @override Color get textPrimaryDark => const Color(0xFFFFFFFF);
  @override Color get textSecondaryDark => const Color(0xFFAAAAAA);

  @override Color get backgroundLight => const Color(0xFFFFFFFF);
  @override Color get surfaceLight => const Color(0xFFFFFFFF);
  @override Color get surfaceHoverLight => const Color(0xFFF3F4F6);
  @override Color get borderLight => const Color(0xFFE5E7EB);
  @override Color get textPrimaryLight => const Color(0xFF111827);
  @override Color get textSecondaryLight => const Color(0xFF6B7280);
}

class PremiumSoftColors implements BrandColors {
  // Premium Soft: Elegant Lavender & Soft Blush palette
  @override Color get primary => const Color(0xFF8B5CF6); // Soft Violet
  @override Color get primaryDark => const Color(0xFFA78BFA); 
  @override Color get secondary => const Color(0xFFF472B6); // Soft Blush Pink
  @override Color get secondaryDark => const Color(0xFFF9A8D4);
  @override Color get success => const Color(0xFF10B981);
  @override Color get successDark => const Color(0xFF34D399);
  @override Color get warning => const Color(0xFFF59E0B);
  @override Color get warningDark => const Color(0xFFFBBF24);
  @override Color get error => const Color(0xFFF43F5E);
  @override Color get errorDark => const Color(0xFFFB7185);

  @override Color get backgroundDark => const Color(0xFF12121A); // Deep elegant dark
  @override Color get surfaceDark => const Color(0xFF1C1C26); // Soft dark surface
  @override Color get surfaceHoverDark => const Color(0xFF282836);
  @override Color get borderDark => const Color(0xFF333344);
  @override Color get textPrimaryDark => const Color(0xFFF8FAFC);
  @override Color get textSecondaryDark => const Color(0xFF94A3B8);

  @override Color get backgroundLight => const Color(0xFFFDFDFE); // Very soft white with a hint of warmth
  @override Color get surfaceLight => const Color(0xFFFFFFFF);
  @override Color get surfaceHoverLight => const Color(0xFFF1F5F9);
  @override Color get borderLight => const Color(0xFFE2E8F0);
  @override Color get textPrimaryLight => const Color(0xFF1E293B); 
  @override Color get textSecondaryLight => const Color(0xFF64748B); 
}

// Temporary fallback to not break all existing AppColors.primary calls instantly.
// These will be removed once everything uses Theme.of(context).
class AppColors {
  static const Color primary = Color(0xFF06C167);
  static const Color primaryDark = Color(0xFF06C167);
  
  static const Color secondary = Color(0xFF2563EB);
  static const Color secondaryDark = Color(0xFF3B82F6);
  
  static const Color success = Color(0xFF06C167);
  static const Color successDark = Color(0xFF06C167);
  
  static const Color warning = Color(0xFFF5A623);
  static const Color warningDark = Color(0xFFF5A623);
  
  static const Color error = Color(0xFFE22134);
  static const Color errorDark = Color(0xFFE22134);

  static const Color backgroundDark = Color(0xFF000000);
  static const Color surfaceDark = Color(0xFF141414);
  static const Color surfaceHoverDark = Color(0xFF222222);
  static const Color borderDark = Color(0xFF333333);
  static const Color textPrimaryDark = Color(0xFFFFFFFF);
  static const Color textSecondaryDark = Color(0xFFAAAAAA);

  static const Color backgroundLight = Color(0xFFFFFFFF);
  static const Color surfaceLight = Color(0xFFFFFFFF);
  static const Color surfaceHoverLight = Color(0xFFF3F4F6);
  static const Color borderLight = Color(0xFFE5E7EB);
  static const Color textPrimaryLight = Color(0xFF111827);
  static const Color textSecondaryLight = Color(0xFF6B7280);
}
