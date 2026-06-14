import 'package:flutter_riverpod/flutter_riverpod.dart';
import '../network/dio_client.dart';
import '../realtime/socket_provider.dart';
import '../utils/app_currency.dart';

class CurrencyNotifier extends Notifier<String> {
  @override
  String build() {
    final socketService = ref.watch(socketServiceProvider);
    
    socketService.on('settings.updated', (data) {
      if (data != null && data is Map<String, dynamic> && data['restaurant_currency'] != null) {
        state = data['restaurant_currency'];
        AppCurrency.symbol = state;
      }
    });

    fetchSettings();
    return '\$';
  }

  Future<void> fetchSettings() async {
    try {
      final dio = ref.read(dioClientProvider).dio;
      final response = await dio.get('/settings/public');
      if (response.data['success'] == true && response.data['data'] != null) {
        final settings = response.data['data'];
        if (settings['restaurant_currency'] != null) {
          state = settings['restaurant_currency'];
          AppCurrency.symbol = state;
        }
      }
    } catch (e) {
      // Ignored
    }
  }

  String format(double amount) {
    final isRupee = state.toLowerCase() == 'rs' || state.toLowerCase() == 'lkr';
    final space = isRupee ? ' ' : '';
    return '$state$space${amount.toStringAsFixed(2)}';
  }
}

final currencyProvider = NotifierProvider<CurrencyNotifier, String>(() {
  return CurrencyNotifier();
});
