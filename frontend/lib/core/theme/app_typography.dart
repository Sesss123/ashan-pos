import 'package:flutter/material.dart';

class AppTypography {
  // For standard dense tables, labels, and body text
  static const String bodyFontFamily = 'Inter';
  
  // For headers, KPI values, and large display text
  static const String displayFontFamily = 'Plus Jakarta Sans';

  static const TextStyle displayLarge = TextStyle(
    fontFamily: displayFontFamily,
    fontSize: 32,
    fontWeight: FontWeight.w700,
    letterSpacing: -1.0,
  );

  static const TextStyle titleMedium = TextStyle(
    fontFamily: displayFontFamily,
    fontSize: 18,
    fontWeight: FontWeight.w600,
  );

  static const TextStyle bodyRegular = TextStyle(
    fontFamily: bodyFontFamily,
    fontSize: 14,
    fontWeight: FontWeight.w400,
  );

  static const TextStyle labelSmall = TextStyle(
    fontFamily: bodyFontFamily,
    fontSize: 12,
    fontWeight: FontWeight.w500,
    letterSpacing: 0.5, // Uppercase tracking
  );
}
