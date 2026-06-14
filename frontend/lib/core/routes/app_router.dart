import 'package:go_router/go_router.dart';
import 'package:flutter_riverpod/flutter_riverpod.dart';
import '../../features/auth/presentation/login_screen.dart';
import '../../features/cashier/presentation/cashier_dashboard_screen.dart';
import '../../features/kitchen/presentation/kds_dashboard_screen.dart';
import '../../features/waiter/presentation/waiter_dashboard_screen.dart';
import '../../features/executive/presentation/executive_dashboard_screen.dart';
import '../../features/auth/presentation/providers/auth_provider.dart';
import '../../main.dart';

final goRouterProvider = Provider<GoRouter>((ref) {
  final authState = ref.watch(authProvider);

  return GoRouter(
    navigatorKey: navigatorKey,
    initialLocation: '/login',
    redirect: (context, state) {
      if (authState.isLoading) return null; // wait until auth state is loaded

      final isGoingToLogin = state.matchedLocation == '/login';
      final isLoggedIn = authState.isAuthenticated;
      final role = authState.role;

      // If not logged in and not going to login, redirect to login
      if (!isLoggedIn && !isGoingToLogin) {
        return '/login';
      }

      // If logged in and going to login, redirect to their respective dashboard
      if (isLoggedIn && isGoingToLogin) {
        switch (role) {
          case 'Cashier':
          case 'Admin':
            return '/cashier';
          case 'Waiter':
            return '/waiter';
          case 'Kitchen':
            return '/kitchen';
          case 'Executive':
            return '/executive';
          default:
            return '/login'; // Unknown role fallback
        }
      }

      // If logged in and navigating to a restricted route, check role authorization
      if (isLoggedIn) {
        final path = state.matchedLocation;
        if (path.startsWith('/cashier') && role != 'Cashier' && role != 'Admin') return _fallbackForRole(role);
        if (path.startsWith('/waiter') && role != 'Waiter' && role != 'Admin') return _fallbackForRole(role);
        if (path.startsWith('/kitchen') && role != 'Kitchen' && role != 'Admin') return _fallbackForRole(role);
        if (path.startsWith('/executive') && role != 'Executive' && role != 'Admin') return _fallbackForRole(role);
      }

      return null; // No redirect needed
    },
    routes: [
      GoRoute(
        path: '/login',
        builder: (context, state) => const LoginScreen(),
      ),
      GoRoute(
        path: '/cashier',
        builder: (context, state) => const CashierDashboardScreen(),
      ),
      GoRoute(
        path: '/kitchen',
        builder: (context, state) => const KdsDashboardScreen(),
      ),
      GoRoute(
        path: '/waiter',
        builder: (context, state) => const WaiterDashboardScreen(),
      ),
      GoRoute(
        path: '/executive',
        builder: (context, state) => const ExecutiveDashboardScreen(),
      ),
    ],
  );
});

String _fallbackForRole(String? role) {
  switch (role) {
    case 'Cashier':
    case 'Admin':
      return '/cashier';
    case 'Waiter':
      return '/waiter';
    case 'Kitchen':
      return '/kitchen';
    case 'Executive':
      return '/executive';
    default:
      return '/login';
  }
}
