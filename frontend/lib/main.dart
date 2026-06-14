import 'package:flutter/material.dart';
import 'package:flutter_riverpod/flutter_riverpod.dart';
import 'dart:ui';
import 'core/theme/app_theme.dart';
import 'core/theme/app_colors.dart';
import 'core/theme/theme_provider.dart';
import 'core/realtime/socket_provider.dart';
import 'core/utils/bluetooth_printer_service.dart';
import 'core/widgets/virtual_receipt_dialog.dart';
import 'core/providers/settings_provider.dart';
import 'package:hive_flutter/hive_flutter.dart';
import 'package:flutter_dotenv/flutter_dotenv.dart';

import 'core/network/offline_sync_service.dart';
import 'core/widgets/error_boundary.dart';
import 'core/routes/app_router.dart';

final GlobalKey<NavigatorState> navigatorKey = GlobalKey<NavigatorState>();

void main() async {
  WidgetsFlutterBinding.ensureInitialized();
  await dotenv.load(fileName: ".env");
  await Hive.initFlutter();
  await Hive.openBox('offline_orders');
  await Hive.openBox('menu_cache');
  
  await OfflineSyncService.instance.initialize();

  // Global Crash Logging (Production Hardening)
  FlutterError.onError = (FlutterErrorDetails details) {
    FlutterError.presentError(details);
    debugPrint('[Global Crash Logger] FlutterError: ${details.exception}');
    // Here we would normally send to Sentry or Crashlytics
  };

  PlatformDispatcher.instance.onError = (error, stack) {
    debugPrint('[Global Crash Logger] Async Error: $error');
    // Send to external logging service
    return true;
  };

  runApp(
    const ProviderScope(
      child: MyApp(),
    ),
  );
}

class MyApp extends ConsumerWidget {
  const MyApp({super.key});

  @override
  Widget build(BuildContext context, WidgetRef ref) {
    ref.watch(realTimeSyncProvider); // Global Real-Time Sync

    // Watch the persisted theme mode — falls back to dark while loading
    final themeMode = ref.watch(themeModeProvider).value ?? ThemeMode.dark;
    final brandTheme = ref.watch(brandThemeProvider).value ?? BrandTheme.uber;

    final settingsAsync = ref.watch(settingsProvider);
    final appName = settingsAsync.value?.restaurantName ?? 'AshnPOS Operations';

    return MaterialApp.router(
      title: appName,
      routerConfig: ref.watch(goRouterProvider),
      theme: AppTheme.getTheme(brandTheme, Brightness.light),
      darkTheme: AppTheme.getTheme(brandTheme, Brightness.dark),
      themeMode: themeMode,   // ← driven by user preference
      debugShowCheckedModeBanner: false,
      builder: (context, child) {
        return ErrorBoundary(
          child: PrinterSimulationWrapper(child: child!),
        );
      },
    );
  }
}

class PrinterSimulationWrapper extends StatefulWidget {
  final Widget child;
  const PrinterSimulationWrapper({super.key, required this.child});

  @override
  State<PrinterSimulationWrapper> createState() => _PrinterSimulationWrapperState();
}

class _PrinterSimulationWrapperState extends State<PrinterSimulationWrapper> {
  @override
  void initState() {
    super.initState();
    BluetoothPrinterService.instance.printSimulationTrigger.addListener(_onPrintTriggered);
  }

  @override
  void dispose() {
    BluetoothPrinterService.instance.printSimulationTrigger.removeListener(_onPrintTriggered);
    super.dispose();
  }

  void _onPrintTriggered() {
    final order = BluetoothPrinterService.instance.printSimulationTrigger.value;
    if (order != null) {
      final context = navigatorKey.currentContext;
      if (context != null) {
        VirtualReceiptDialog.show(context, order);
      }
    }
  }

  @override
  Widget build(BuildContext context) {
    return widget.child;
  }
}
