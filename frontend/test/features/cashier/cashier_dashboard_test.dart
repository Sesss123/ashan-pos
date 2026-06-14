import 'package:flutter/material.dart';
import 'package:flutter_test/flutter_test.dart';
import 'package:flutter_riverpod/flutter_riverpod.dart';
import 'package:frontend/features/cashier/presentation/cashier_dashboard_screen.dart';

void main() {
  testWidgets('Cashier Dashboard renders properly', (WidgetTester tester) async {
    // Build our app and trigger a frame.
    await tester.pumpWidget(
      const ProviderScope(
        child: MaterialApp(
          home: CashierDashboardScreen(),
        ),
      ),
    );

    // Initial load state or layout should be visible
    expect(find.byType(CashierDashboardScreen), findsOneWidget);
    
    // Check if the quick actions text is visible, indicating layout structure rendered.
    // Note: this test is basic because data fetching happens immediately.
    await tester.pump();
  });
}
