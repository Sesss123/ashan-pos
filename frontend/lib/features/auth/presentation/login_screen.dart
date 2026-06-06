import 'package:flutter/material.dart';
import 'package:flutter_riverpod/flutter_riverpod.dart';
import '../../cashier/presentation/cashier_dashboard_screen.dart';
import '../../waiter/presentation/waiter_dashboard_screen.dart';
import '../../kitchen/presentation/kitchen_dashboard_screen.dart';

class LoginScreen extends ConsumerStatefulWidget {
  const LoginScreen({super.key});

  @override
  ConsumerState<LoginScreen> createState() => _LoginScreenState();
}

class _LoginScreenState extends ConsumerState<LoginScreen> {
  String _selectedRole = 'Cashier';

  void _login() {
    // Basic mock routing based on Role
    Widget targetScreen;
    switch (_selectedRole) {
      case 'Cashier':
        targetScreen = const CashierDashboardScreen();
        break;
      case 'Waiter':
        targetScreen = const WaiterDashboardScreen();
        break;
      case 'Kitchen':
        targetScreen = const KitchenDashboardScreen();
        break;
      default:
        targetScreen = const CashierDashboardScreen();
    }

    Navigator.pushReplacement(
      context,
      MaterialPageRoute(builder: (context) => targetScreen),
    );
  }

  @override
  Widget build(BuildContext context) {
    return Scaffold(
      body: Center(
        child: SizedBox(
          width: 400,
          child: Card(
            padding: const EdgeInsets.all(32),
            child: Column(
              mainAxisSize: MainAxisSize.min,
              children: [
                const Icon(Icons.restaurant, size: 64, color: Colors.blue),
                const SizedBox(height: 24),
                const Text('AshnPOS Operations', style: TextStyle(fontSize: 24, fontWeight: FontWeight.bold)),
                const SizedBox(height: 8),
                const Text('Select your operational role to login.', style: TextStyle(color: Colors.grey)),
                const SizedBox(height: 32),
                DropdownButtonFormField<String>(
                  value: _selectedRole,
                  decoration: const InputDecoration(labelText: 'Role'),
                  items: const [
                    DropdownMenuItem(value: 'Cashier', child: Text('Cashier')),
                    DropdownMenuItem(value: 'Waiter', child: Text('Waiter')),
                    DropdownMenuItem(value: 'Kitchen', child: Text('Kitchen Staff')),
                    DropdownMenuItem(value: 'Admin', child: Text('Admin (Blocked)')),
                  ],
                  onChanged: (val) {
                    if (val == 'Admin') {
                      ScaffoldMessenger.of(context).showSnackBar(
                        const SnackBar(content: Text('Management features belong to Web Admin Dashboard.')),
                      );
                      setState(() => _selectedRole = 'Cashier');
                    } else {
                      setState(() => _selectedRole = val!);
                    }
                  },
                ),
                const SizedBox(height: 24),
                ElevatedButton(
                  onPressed: _login,
                  style: ElevatedButton.styleFrom(minimumSize: const Size.fromHeight(50)),
                  child: const Text('Login'),
                )
              ],
            ),
          ),
        ),
      ),
    );
  }
}
