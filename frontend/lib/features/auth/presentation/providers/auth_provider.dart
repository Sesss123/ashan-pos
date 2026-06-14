import 'package:flutter_riverpod/flutter_riverpod.dart';
import '../../domain/repositories/auth_repository.dart';
import '../../../../core/realtime/socket_provider.dart';

class AuthState {
  final bool isLoading;
  final bool isAuthenticated;
  final String? role;
  final String? error;

  AuthState({
    this.isLoading = true, // initially loading while we check storage
    this.isAuthenticated = false,
    this.role,
    this.error,
  });

  AuthState copyWith({
    bool? isLoading,
    bool? isAuthenticated,
    String? role,
    String? error,
  }) {
    return AuthState(
      isLoading: isLoading ?? this.isLoading,
      isAuthenticated: isAuthenticated ?? this.isAuthenticated,
      role: role ?? this.role,
      error: error,
    );
  }
}

class AuthNotifier extends Notifier<AuthState> {
  @override
  AuthState build() {
    _checkInitialAuth();
    return AuthState(isLoading: true);
  }

  Future<void> _checkInitialAuth() async {
    final repo = ref.read(authRepositoryProvider);
    final token = await repo.getToken();
    final role = await repo.getRole();
    
    if (token != null && role != null) {
      // Connect socket
      ref.read(socketServiceProvider).connect(token);
      state = AuthState(isLoading: false, isAuthenticated: true, role: role);
    } else {
      state = AuthState(isLoading: false, isAuthenticated: false);
    }
  }

  Future<bool> login(String email, String password) async {
    state = state.copyWith(isLoading: true, error: null);
    try {
      final repo = ref.read(authRepositoryProvider);
      final data = await repo.login(email, password);
      
      final token = data['accessToken'] ?? data['data']?['token'];
      final refreshToken = data['refreshToken'] ?? data['data']?['refreshToken'];
      final user = data['user'] ?? data['data']?['user'];
      final role = user['role'];

      await repo.saveTokens(token, refreshToken);
      await repo.saveRole(role);

      ref.read(socketServiceProvider).connect(token);

      state = AuthState(isLoading: false, isAuthenticated: true, role: role);
      return true;
    } catch (e) {
      state = AuthState(isLoading: false, isAuthenticated: false, error: e.toString());
      return false;
    }
  }

  Future<void> logout() async {
    final repo = ref.read(authRepositoryProvider);
    await repo.clearAll();
    ref.read(socketServiceProvider).disconnect();
    state = AuthState(isLoading: false, isAuthenticated: false);
  }
}

final authProvider = NotifierProvider<AuthNotifier, AuthState>(AuthNotifier.new);
