import 'package:flutter/material.dart';
import 'package:flutter_riverpod/flutter_riverpod.dart';
import 'package:flutter_animate/flutter_animate.dart';
import 'package:google_fonts/google_fonts.dart';
import 'dart:ui';
import '../../../core/theme/theme_provider.dart';
import '../../../core/theme/app_colors.dart';
import '../../../core/providers/settings_provider.dart';
import 'providers/auth_provider.dart';

class LoginScreen extends ConsumerStatefulWidget {
  const LoginScreen({super.key});

  @override
  ConsumerState<LoginScreen> createState() => _LoginScreenState();
}

class _LoginScreenState extends ConsumerState<LoginScreen> {
  final _emailController    = TextEditingController();
  final _passwordController = TextEditingController();
  bool _isLoading     = false;
  bool _obscurePass   = true;

  // ─── Quick-login credentials ───────────────────────────────────────────────
  static const _roles = [
    {'label': 'Cashier',   'email': 'cashier@dubay.com',   'icon': Icons.point_of_sale},
    {'label': 'Waiter',    'email': 'waiter@dubay.com',    'icon': Icons.room_service_outlined},
    {'label': 'Kitchen',   'email': 'kitchen@dubay.com',   'icon': Icons.restaurant_menu},
  ];

  @override
  void dispose() {
    _emailController.dispose();
    _passwordController.dispose();
    super.dispose();
  }

  // ─── Login Logic ────────────────────────────────────────────────────────────
  Future<void> _login() async {
    final email    = _emailController.text.trim();
    final password = _passwordController.text.trim();

    if (email.isEmpty || password.isEmpty) {
      _showError('Please enter email and password!');
      return;
    }

    setState(() => _isLoading = true);

    final success = await ref.read(authProvider.notifier).login(email, password);

    if (mounted) {
      setState(() => _isLoading = false);
      if (!success) {
        final error = ref.read(authProvider).error;
        _showError(error ?? 'Login failed. Please check credentials.');
      }
      // If success is true, GoRouter automatically redirects us to the dashboard!
    }
  }

  void _showError(String message) {
    if (!mounted) {
      return;
    }
    ScaffoldMessenger.of(context).showSnackBar(
      SnackBar(
        content: Row(
          children: [
            const Icon(Icons.error_outline, color: Colors.white),
            const SizedBox(width: 12),
            Expanded(child: Text(message, style: GoogleFonts.inter(fontWeight: FontWeight.w600))),
          ],
        ),
        backgroundColor: AppColors.error,
        behavior: SnackBarBehavior.floating,
        shape: RoundedRectangleBorder(borderRadius: BorderRadius.circular(12)),
        margin: const EdgeInsets.all(20),
      ),
    );
  }

  @override
  Widget build(BuildContext context) {
    final isDark      = Theme.of(context).brightness == Brightness.dark;
    final themeAsync  = ref.watch(themeModeProvider);
    final currentMode = themeAsync.value ?? ThemeMode.dark;
    
    final settingsAsync = ref.watch(settingsProvider);
    final appName       = settingsAsync.value?.restaurantName ?? 'AshnPOS';

    // Use AppColors instead of hardcoded colors
    final bgColor      = isDark ? AppColors.backgroundDark : AppColors.backgroundLight;
    final cardColor    = isDark ? AppColors.surfaceDark : AppColors.surfaceLight;
    final borderColor  = isDark ? AppColors.borderDark : AppColors.borderLight;
    final textMain     = isDark ? AppColors.textPrimaryDark : AppColors.textPrimaryLight;
    final textMuted    = isDark ? AppColors.textSecondaryDark : AppColors.textSecondaryLight;
    final inputFill    = isDark ? const Color(0xFF111111) : const Color(0xFFF8FAFC);
    final primaryColor = isDark ? AppColors.primaryDark : AppColors.primary;

    return Scaffold(
      backgroundColor: bgColor,
      body: Stack(
        children: [
          // ── Animated Mesh Gradient Background ──────────────────────────────
          Positioned.fill(
            child: Stack(
              children: [
                Positioned(
                  top: -100, left: -100,
                  child: Container(
                    width: 500, height: 500,
                    decoration: BoxDecoration(
                      shape: BoxShape.circle,
                      gradient: RadialGradient(colors: [primaryColor.withValues(alpha: isDark ? 0.3 : 0.15), Colors.transparent]),
                    ),
                  ).animate(onPlay: (c) => c.repeat(reverse: true))
                   .moveX(begin: -50, end: 100, duration: 10.seconds, curve: Curves.easeInOut)
                   .moveY(begin: -50, end: 100, duration: 15.seconds, curve: Curves.easeInOut),
                ),
                Positioned(
                  bottom: -150, right: -100,
                  child: Container(
                    width: 600, height: 600,
                    decoration: BoxDecoration(
                      shape: BoxShape.circle,
                      gradient: RadialGradient(colors: [Colors.blueAccent.withValues(alpha: isDark ? 0.25 : 0.1), Colors.transparent]),
                    ),
                  ).animate(onPlay: (c) => c.repeat(reverse: true))
                   .moveX(begin: 100, end: -50, duration: 12.seconds, curve: Curves.easeInOut)
                   .moveY(begin: 100, end: -50, duration: 18.seconds, curve: Curves.easeInOut),
                ),
                Positioned(
                  top: 200, right: -200,
                  child: Container(
                    width: 400, height: 400,
                    decoration: BoxDecoration(
                      shape: BoxShape.circle,
                      gradient: RadialGradient(colors: [Colors.purpleAccent.withValues(alpha: isDark ? 0.2 : 0.1), Colors.transparent]),
                    ),
                  ).animate(onPlay: (c) => c.repeat(reverse: true))
                   .moveX(begin: -50, end: 50, duration: 8.seconds, curve: Curves.easeInOut),
                ),
              ],
            ),
          ),

          // ── Main Card ─────────────────────────────────────────────────────
          Center(
            child: SingleChildScrollView(
              padding: const EdgeInsets.symmetric(horizontal: 24, vertical: 80),
              child: ConstrainedBox(
                constraints: const BoxConstraints(maxWidth: 420),
                child: ClipRRect(
                  borderRadius: BorderRadius.circular(28),
                  child: BackdropFilter(
                    filter: ImageFilter.blur(sigmaX: 30, sigmaY: 30),
                    child: Container(
                      padding: const EdgeInsets.all(40),
                      decoration: BoxDecoration(
                        color: isDark ? Colors.black.withValues(alpha: 0.4) : Colors.white.withValues(alpha: 0.6),
                        borderRadius: BorderRadius.circular(28),
                        border: Border.all(color: Colors.white.withValues(alpha: isDark ? 0.1 : 0.4), width: 1.5),
                        boxShadow: [
                          BoxShadow(
                            color: Colors.black.withValues(alpha: 0.1),
                            blurRadius: 40, offset: const Offset(0, 20),
                          ),
                        ],
                      ),
                  child: Column(
                    mainAxisSize: MainAxisSize.min,
                    crossAxisAlignment: CrossAxisAlignment.stretch,
                    children: [
                      // Logo
                      _buildLogo(isDark, primaryColor, appName)
                          .animate().fadeIn(duration: 500.ms).slideY(begin: -0.2, end: 0),

                      const SizedBox(height: 32),

                      // Quick Role Selector
                      _buildRoleGrid(primaryColor, cardColor, borderColor, textMain, textMuted)
                          .animate().fadeIn(delay: 150.ms, duration: 400.ms),

                      const SizedBox(height: 28),

                      // Email field
                      _buildTextField(
                        controller: _emailController,
                        hint: 'Email Address',
                        icon: Icons.alternate_email,
                        inputFill: inputFill,
                        borderColor: borderColor,
                        textMain: textMain,
                        textMuted: textMuted,
                        isDark: isDark,
                      ).animate().fadeIn(delay: 200.ms, duration: 400.ms),

                      const SizedBox(height: 16),

                      // Password field
                      _buildTextField(
                        controller: _passwordController,
                        hint: 'Password',
                        icon: Icons.lock_outline,
                        obscure: _obscurePass,
                        suffix: IconButton(
                          icon: Icon(
                            _obscurePass ? Icons.visibility_off_outlined : Icons.visibility_outlined,
                            color: textMuted, size: 20,
                          ),
                          onPressed: () => setState(() => _obscurePass = !_obscurePass),
                        ),
                        inputFill: inputFill,
                        borderColor: borderColor,
                        textMain: textMain,
                        textMuted: textMuted,
                        isDark: isDark,
                      ).animate().fadeIn(delay: 250.ms, duration: 400.ms),

                      const SizedBox(height: 28),

                      // Login Button
                      _buildLoginButton(primaryColor)
                          .animate().fadeIn(delay: 300.ms, duration: 400.ms),

                      const SizedBox(height: 20),

                      // Hint
                      Text(
                        'Default password: password123',
                        textAlign: TextAlign.center,
                        style: GoogleFonts.inter(
                          color: textMuted, fontSize: 12, fontWeight: FontWeight.w500,
                        ),
                      ),
                    ],
                  ),
                  ).animate().fadeIn(duration: 600.ms).scale(begin: const Offset(0.97, 0.97), end: const Offset(1, 1)),
                  ),
                ),
              ),
            ),
          ),

          // ── Theme Toggle ───────────────────────────────────────────────────
          Positioned(
            top: 16, right: 16,
            child: SafeArea(
              child: _ThemeToggleButton(
                isDark: isDark,
                currentMode: currentMode,
                onToggle: () => ref.read(themeModeProvider.notifier).toggle(),
              ).animate().fadeIn(duration: 600.ms),
            ),
          ),
        ],
      ),
    );
  }

  // ─── Logo Widget ────────────────────────────────────────────────────────────
  Widget _buildLogo(bool isDark, Color primaryColor, String appName) {
    return Column(
      children: [
        Container(
          width: 72, height: 72,
          decoration: BoxDecoration(
            gradient: LinearGradient(
              colors: [primaryColor, primaryColor.withValues(alpha: 0.7)],
              begin: Alignment.topLeft, end: Alignment.bottomRight,
            ),
            borderRadius: BorderRadius.circular(20),
            boxShadow: [
              BoxShadow(
                color: primaryColor.withValues(alpha: 0.35),
                blurRadius: 20, offset: const Offset(0, 8),
              ),
            ],
          ),
          child: const Icon(Icons.restaurant, color: Colors.white, size: 36),
        ),
        const SizedBox(height: 20),
        Text(
          appName,
          style: GoogleFonts.inter(
            fontSize: 30, fontWeight: FontWeight.w800,
            color: isDark ? Colors.white : const Color(0xFF0F172A),
          ),
        ),
        const SizedBox(height: 6),
        Text(
          'Operations Portal',
          style: GoogleFonts.inter(
            fontSize: 14, fontWeight: FontWeight.w500,
            color: isDark ? const Color(0xFF9CA3AF) : const Color(0xFF64748B),
          ),
        ),
      ],
    );
  }

  // ─── Quick Role Selector ────────────────────────────────────────────────────
  Widget _buildRoleGrid(Color primary, Color card, Color border, Color textMain, Color textMuted) {
    return Column(
      crossAxisAlignment: CrossAxisAlignment.start,
      children: [
        Text(
          'Quick Select Role',
          style: GoogleFonts.inter(
            fontSize: 12, fontWeight: FontWeight.w700,
            color: textMuted, letterSpacing: 0.5,
          ),
        ),
        const SizedBox(height: 10),
        Row(
          children: _roles.map((role) {
            final isSelected = _emailController.text == role['email'];
            return Expanded(
              child: GestureDetector(
                onTap: () {
                  setState(() => _emailController.text = role['email'] as String);
                },
                child: AnimatedContainer(
                  duration: const Duration(milliseconds: 200),
                  margin: const EdgeInsets.only(right: 8),
                  padding: const EdgeInsets.symmetric(vertical: 12),
                  decoration: BoxDecoration(
                    color: isSelected ? primary.withValues(alpha: 0.12) : Colors.transparent,
                    borderRadius: BorderRadius.circular(14),
                    border: Border.all(
                      color: isSelected ? primary : border,
                      width: isSelected ? 1.5 : 1,
                    ),
                  ),
                  child: Column(
                    children: [
                      Icon(
                        role['icon'] as IconData,
                        color: isSelected ? primary : textMuted,
                        size: 22,
                      ),
                      const SizedBox(height: 5),
                      Text(
                        role['label'] as String,
                        style: GoogleFonts.inter(
                          fontSize: 10, fontWeight: FontWeight.w700,
                          color: isSelected ? primary : textMuted,
                        ),
                      ),
                    ],
                  ),
                ),
              ),
            );
          }).toList(),
        ),
      ],
    );
  }

  // ─── Input Field ────────────────────────────────────────────────────────────
  Widget _buildTextField({
    required TextEditingController controller,
    required String hint,
    required IconData icon,
    bool obscure = false,
    Widget? suffix,
    required Color inputFill,
    required Color borderColor,
    required Color textMain,
    required Color textMuted,
    required bool isDark,
  }) {
    return TextField(
      controller: controller,
      obscureText: obscure,
      style: GoogleFonts.inter(
        color: textMain, fontWeight: FontWeight.w600, fontSize: 15,
      ),
      decoration: InputDecoration(
        hintText: hint,
        hintStyle: GoogleFonts.inter(color: textMuted, fontWeight: FontWeight.w500),
        prefixIcon: Icon(icon, color: textMuted, size: 20),
        suffixIcon: suffix,
        filled: true,
        fillColor: inputFill,
        border: OutlineInputBorder(
          borderRadius: BorderRadius.circular(16),
          borderSide: BorderSide(color: borderColor),
        ),
        enabledBorder: OutlineInputBorder(
          borderRadius: BorderRadius.circular(16),
          borderSide: BorderSide(color: borderColor),
        ),
        focusedBorder: OutlineInputBorder(
          borderRadius: BorderRadius.circular(16),
          borderSide: const BorderSide(color: Color(0xFF2563EB), width: 2),
        ),
        contentPadding: const EdgeInsets.symmetric(vertical: 18, horizontal: 16),
      ),
    );
  }

  // ─── Login Button ────────────────────────────────────────────────────────────
  Widget _buildLoginButton(Color primary) {
    return SizedBox(
      height: 56,
      child: ElevatedButton(
        onPressed: _isLoading ? null : _login,
        style: ElevatedButton.styleFrom(
          backgroundColor: primary,
          foregroundColor: Colors.white,
          elevation: 0,
          shape: RoundedRectangleBorder(borderRadius: BorderRadius.circular(16)),
          disabledBackgroundColor: primary.withValues(alpha: 0.5),
        ),
        child: _isLoading
            ? const SizedBox(
                width: 22, height: 22,
                child: CircularProgressIndicator(color: Colors.white, strokeWidth: 2.5),
              )
            : Text(
                'Sign In',
                style: GoogleFonts.inter(
                  fontSize: 16, fontWeight: FontWeight.w800, letterSpacing: 0.5,
                ),
              ),
      ),
    );
  }
}

// ─────────────────────────────────────────────────────────────────────────────
// Uber-style floating theme toggle
// ─────────────────────────────────────────────────────────────────────────────
class _ThemeToggleButton extends StatelessWidget {
  final bool isDark;
  final ThemeMode currentMode;
  final VoidCallback onToggle;

  const _ThemeToggleButton({
    required this.isDark,
    required this.currentMode,
    required this.onToggle,
  });

  @override
  Widget build(BuildContext context) {
    return GestureDetector(
      onTap: onToggle,
      child: AnimatedContainer(
        duration: const Duration(milliseconds: 300),
        width: 68, height: 36,
        padding: const EdgeInsets.symmetric(horizontal: 4),
        decoration: BoxDecoration(
          color: isDark ? const Color(0xFF1F2937) : const Color(0xFFE2E8F0),
          borderRadius: BorderRadius.circular(20),
          border: Border.all(
            color: isDark ? const Color(0xFF374151) : const Color(0xFFCBD5E1),
          ),
          boxShadow: [
            BoxShadow(
              color: Colors.black.withValues(alpha: 0.15),
              blurRadius: 8, offset: const Offset(0, 2),
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
                Icon(Icons.light_mode, size: 16, color: isDark ? const Color(0xFF4B5563) : const Color(0xFFF59E0B)),
                Icon(Icons.dark_mode,  size: 16, color: isDark ? const Color(0xFF93C5FD) : const Color(0xFF9CA3AF)),
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
                  color: isDark ? const Color(0xFF1E3A5F) : Colors.white,
                  shape: BoxShape.circle,
                  boxShadow: [
                    BoxShadow(
                      color: Colors.black.withValues(alpha: 0.2),
                      blurRadius: 4, offset: const Offset(0, 1),
                    ),
                  ],
                ),
                child: Icon(
                  isDark ? Icons.dark_mode : Icons.light_mode,
                  size: 16,
                  color: isDark ? const Color(0xFF93C5FD) : const Color(0xFFF59E0B),
                ),
              ),
            ),
          ],
        ),
      ),
    );
  }
}
