import 'package:flutter/material.dart';
import 'package:flutter_test/flutter_test.dart';
import 'package:flutter_riverpod/flutter_riverpod.dart';
import 'package:frontend/features/auth/presentation/login_screen.dart';
import 'package:frontend/core/widgets/virtual_receipt_dialog.dart';
import 'package:frontend/core/widgets/bluetooth_printer_settings_dialog.dart';

void main() {
  group('Enterprise Auth Module Tests', () {
    testWidgets('LoginScreen renders UI elements correctly', (WidgetTester tester) async {
      await tester.pumpWidget(
        const ProviderScope(
          child: MaterialApp(
            home: LoginScreen(),
          ),
        ),
      );

      // Verify that login page titles exist
      expect(find.text('ASHN POS'), findsOneWidget);
      expect(find.text('Enterprise ERP System'), findsOneWidget);

      // Verify role selection pills exist
      expect(find.text('Cashier'), findsOneWidget);
      expect(find.text('Waiter'), findsOneWidget);
      expect(find.text('Kitchen'), findsOneWidget);

      // Verify login fields and button exist
      expect(find.byType(TextField), findsNWidgets(2)); // username & password
      expect(find.text('Sign In to Terminal'), findsOneWidget);
    });
  });

  group('Bluetooth Printing Simulation Tests', () {
    testWidgets('VirtualReceiptDialog renders receipt details correctly', (WidgetTester tester) async {
      final mockOrder = {
        'id': 'ORD-987654',
        'createdAt': '2026-06-08T12:00:00Z',
        'type': 'Dine-In',
        'paymentMethod': 'Card',
        'subtotal': 30.00,
        'discount': 5.00,
        'tax': 2.00,
        'total': 27.00,
        'items': [
          {
            'quantity': 1,
            'price': 20.00,
            'product': {'name': 'Gourmet Beef Burger'}
          },
          {
            'quantity': 2,
            'price': 5.00,
            'product': {'name': 'French Fries Large'}
          }
        ]
      };

      await tester.pumpWidget(
        MaterialApp(
          home: Scaffold(
            body: Builder(
              builder: (context) {
                return ElevatedButton(
                  onPressed: () => VirtualReceiptDialog.show(context, mockOrder),
                  child: const Text('Show Receipt'),
                );
              },
            ),
          ),
        ),
      );

      // Tap to show the simulated receipt
      await tester.tap(find.text('Show Receipt'));
      await tester.pumpAndSettle();

      // Verify receipt text fields exist
      expect(find.text('ASHN ENTERPRISE ERP'), findsOneWidget);
      expect(find.text('Type: Dine-In'), findsOneWidget);
      expect(find.text('Method: Card'), findsOneWidget);
      expect(find.text('Gourmet Beef Burger'), findsOneWidget);
      expect(find.text('French Fries Large'), findsOneWidget);
      expect(find.text('TOTAL:'), findsOneWidget);
      expect(find.text('\$27.00'), findsOneWidget);
      expect(find.text('Simulated print complete'), findsOneWidget);
    });

    testWidgets('BluetoothPrinterSettingsDialog scanning list renders successfully', (WidgetTester tester) async {
      await tester.pumpWidget(
        MaterialApp(
          home: Scaffold(
            body: Builder(
              builder: (context) {
                return ElevatedButton(
                  onPressed: () => BluetoothPrinterSettingsDialog.show(context),
                  child: const Text('Configure Bluetooth'),
                );
              },
            ),
          ),
        ),
      );

      // Tap configure bluetooth settings
      await tester.tap(find.text('Configure Bluetooth'));
      await tester.pump();

      // Verify title is shown
      expect(find.text('Bluetooth Printers'), findsOneWidget);
      expect(find.text('Searching for devices...'), findsOneWidget);

      // Let mock delay complete
      await tester.pump(const Duration(seconds: 2));
      await tester.pumpAndSettle();

      // Discovered devices list rendering
      expect(find.text('XP-80 Thermal Printer'), findsOneWidget);
      expect(find.text('Star POS Printer'), findsOneWidget);
      expect(find.text('Mobile Mini Printer'), findsOneWidget);
      expect(find.text('Connect'), findsNWidgets(3));
    });
  });
}
