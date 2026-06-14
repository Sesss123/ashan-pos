import 'package:flutter_riverpod/flutter_riverpod.dart';
import '../realtime/socket_service.dart';
import '../domain/repositories/settings_repository.dart';

class SystemSettings {
  final String restaurantName;
  final String currencySymbol;
  final double taxRate;
  final double serviceChargeRate;
  final String themeMode;

  SystemSettings({
    this.restaurantName = 'AshnPOS',
    this.currencySymbol = '\$',
    this.taxRate = 0.0,
    this.serviceChargeRate = 0.0,
    this.themeMode = 'dark',
  });

  factory SystemSettings.fromJson(Map<String, dynamic> json) {
    return SystemSettings(
      restaurantName: json['restaurant_name'] ?? 'AshnPOS',
      currencySymbol: json['restaurant_currency'] ?? '\$',
      taxRate: double.tryParse(json['tax_rate']?.toString() ?? '0.0') ?? 0.0,
      serviceChargeRate: double.tryParse(json['service_charge_rate']?.toString() ?? '0.0') ?? 0.0,
      themeMode: json['theme_mode'] ?? 'dark',
    );
  }
}

class SettingsNotifier extends Notifier<AsyncValue<SystemSettings>> {
  
  @override
  AsyncValue<SystemSettings> build() {
    Future.microtask(() {
      fetchSettings();
      _listenToSocket();
    });
    return const AsyncValue.loading();
  }

  Future<void> fetchSettings() async {
    try {
      final repo = ref.read(settingsRepositoryProvider);
      final data = await repo.fetchPublicSettings();
      state = AsyncValue.data(SystemSettings.fromJson(data));
    } catch (e) {
      // If error, preserve existing state if data exists, or fallback
      if (!state.hasValue) {
        state = AsyncValue.data(SystemSettings());
      }
    }
  }

  void _listenToSocket() {
    socketService.on('settings.updated', (data) {
      if (data != null && data is Map<String, dynamic>) {
        state = AsyncValue.data(SystemSettings.fromJson(data));
      } else {
        fetchSettings(); // Re-fetch if payload is empty
      }
    });
  }
}

final settingsProvider = NotifierProvider<SettingsNotifier, AsyncValue<SystemSettings>>(() {
  return SettingsNotifier();
});
