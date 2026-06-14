import 'package:flutter/material.dart';
import 'package:flutter_test/flutter_test.dart';
import 'package:flutter_riverpod/flutter_riverpod.dart';

import 'package:frontend/main.dart';
import 'package:frontend/features/auth/presentation/login_screen.dart';

void main() {
  testWidgets('App launches and shows Login Screen', (WidgetTester tester) async {
    // Build our app and trigger a frame.
    // Wrap with ProviderScope because MyApp uses Riverpod
    await tester.pumpWidget(const ProviderScope(child: MyApp()));

    // Wait for any animations or routing to complete
    await tester.pumpAndSettle();

    // Verify that the LoginScreen is rendered
    expect(find.byType(LoginScreen), findsOneWidget);

    // Verify that key elements of the login screen are present
    expect(find.text('AshnPOS Operations'), findsOneWidget);
    expect(find.text('SIGN IN TO TERMINAL'), findsOneWidget);
    expect(find.byIcon(Icons.email_outlined), findsOneWidget);
    expect(find.byIcon(Icons.lock_outline), findsOneWidget);
  });
}
