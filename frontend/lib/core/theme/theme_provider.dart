import 'package:flutter/material.dart';
import 'package:flutter_riverpod/flutter_riverpod.dart';
import 'package:shared_preferences/shared_preferences.dart';
import 'app_colors.dart';
// Key used to store the user's theme preference
const String _kThemeModeKey = 'theme_mode';

/// Riverpod provider that manages and persists the user's chosen ThemeMode.
/// Reads from SharedPreferences on startup and writes on every change.
class ThemeModeNotifier extends AsyncNotifier<ThemeMode> {
  @override
  Future<ThemeMode> build() async {
    final prefs = await SharedPreferences.getInstance();
    final saved = prefs.getString(_kThemeModeKey);
    return _fromString(saved);
  }

  /// Toggle between Light and Dark (System → Light → Dark → Light ...)
  Future<void> toggle() async {
    final current = state.value ?? ThemeMode.system;
    final next = current == ThemeMode.dark ? ThemeMode.light : ThemeMode.dark;
    await _save(next);
  }

  /// Set an explicit ThemeMode value
  Future<void> setMode(ThemeMode mode) async {
    await _save(mode);
  }

  Future<void> _save(ThemeMode mode) async {
    state = AsyncData(mode);
    final prefs = await SharedPreferences.getInstance();
    await prefs.setString(_kThemeModeKey, _toString(mode));
  }

  static ThemeMode _fromString(String? value) {
    switch (value) {
      case 'light': return ThemeMode.light;
      case 'dark':  return ThemeMode.dark;
      default:      return ThemeMode.dark; // Default: dark (Uber-style)
    }
  }

  static String _toString(ThemeMode mode) {
    switch (mode) {
      case ThemeMode.light: return 'light';
      case ThemeMode.dark:  return 'dark';
      default:              return 'system';
    }
  }
}

// --- Brand Theme Provider ---

const String _kBrandThemeKey = 'brand_theme_preference';

final brandThemeProvider = AsyncNotifierProvider<BrandThemeNotifier, BrandTheme>(() {
  return BrandThemeNotifier();
});

class BrandThemeNotifier extends AsyncNotifier<BrandTheme> {
  @override
  Future<BrandTheme> build() async {
    final prefs = await SharedPreferences.getInstance();
    final savedBrand = prefs.getString(_kBrandThemeKey);
    return _fromString(savedBrand);
  }

  Future<void> setBrand(BrandTheme brand) async {
    state = AsyncData(brand);
    final prefs = await SharedPreferences.getInstance();
    await prefs.setString(_kBrandThemeKey, _toString(brand));
  }

  static BrandTheme _fromString(String? value) {
    if (value == 'premiumSoft') return BrandTheme.premiumSoft;
    return BrandTheme.uber; // Default
  }

  static String _toString(BrandTheme brand) {
    if (brand == BrandTheme.premiumSoft) return 'premiumSoft';
    return 'uber';
  }
}

/// Global provider — use anywhere with ref.watch / ref.read
final themeModeProvider = AsyncNotifierProvider<ThemeModeNotifier, ThemeMode>(
  ThemeModeNotifier.new,
);
