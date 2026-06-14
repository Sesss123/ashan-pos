import 'package:flutter/material.dart';
import 'package:google_fonts/google_fonts.dart';

class POSTheme {
  // Brand colors
  static const Color primaryColor = Color(0xFFFF5722); // Vibrant Orange
  static const Color primaryDark = Color(0xFFD84315);
  static const Color accentColor = Color(0xFFFFC107); // Warm Amber
  
  // Backgrounds
  static const Color bgDark = Color(0xFF0F0F13); // Sleek deep space/dark bg
  static const Color bgDarkCard = Color(0xFF1E1E26); // Card background
  
  // Glassmorphism default values
  static const Color glassBg = Color(0x1FFFFFFF);
  static const Color glassBorder = Color(0x33FFFFFF);
  
  static ThemeData get darkTheme {
    return ThemeData(
      useMaterial3: true,
      brightness: Brightness.dark,
      primaryColor: primaryColor,
      colorScheme: const ColorScheme.dark(
        primary: primaryColor,
        secondary: accentColor,
        surface: bgDarkCard,
        error: Color(0xFFCF6679),
        onPrimary: Colors.white,
        onSecondary: Color(0xFF1E1E26),
        onSurface: Colors.white,
      ),
      scaffoldBackgroundColor: bgDark,
      cardColor: bgDarkCard,
      textTheme: GoogleFonts.interTextTheme(ThemeData.dark().textTheme).copyWith(
        titleLarge: GoogleFonts.inter(
          fontSize: 22,
          fontWeight: FontWeight.bold,
          color: Colors.white,
        ),
        titleMedium: GoogleFonts.inter(
          fontSize: 16,
          fontWeight: FontWeight.w600,
          color: Colors.white,
        ),
        bodyLarge: GoogleFonts.inter(
          fontSize: 15,
          color: Colors.white70,
        ),
        bodyMedium: GoogleFonts.inter(
          fontSize: 13,
          color: Colors.white60,
        ),
      ),
      inputDecorationTheme: InputDecorationTheme(
        filled: true,
        fillColor: Colors.white.withValues(alpha: 0.05),
        hintStyle: const TextStyle(color: Colors.white38),
        labelStyle: const TextStyle(color: Colors.white70),
        border: OutlineInputBorder(
          borderRadius: BorderRadius.circular(12),
          borderSide: BorderSide(color: Colors.white.withValues(alpha: 0.1)),
        ),
        enabledBorder: OutlineInputBorder(
          borderRadius: BorderRadius.circular(12),
          borderSide: BorderSide(color: Colors.white.withValues(alpha: 0.1)),
        ),
        focusedBorder: OutlineInputBorder(
          borderRadius: BorderRadius.circular(12),
          borderSide: const BorderSide(color: primaryColor, width: 2),
        ),
      ),
      elevatedButtonTheme: ElevatedButtonThemeData(
        style: ElevatedButton.styleFrom(
          backgroundColor: primaryColor,
          foregroundColor: Colors.white,
          elevation: 0,
          padding: const EdgeInsets.symmetric(vertical: 16, horizontal: 24),
          shape: RoundedRectangleBorder(
            borderRadius: BorderRadius.circular(12),
          ),
          textStyle: GoogleFonts.inter(
            fontSize: 16,
            fontWeight: FontWeight.bold,
          ),
        ),
      ),
    );
  }

  // Common gradients for backgrounds
  static const LinearGradient premiumGradient = LinearGradient(
    colors: [
      Color(0xFF1E1B2A), // Dark Purple/Navy
      Color(0xFF0F0E17), // Deep Black
    ],
    begin: Alignment.topLeft,
    end: Alignment.bottomRight,
  );

  static const LinearGradient orangeGradient = LinearGradient(
    colors: [
      Color(0xFFFF5722),
      Color(0xFFFF9800),
    ],
    begin: Alignment.topLeft,
    end: Alignment.bottomRight,
  );
}
