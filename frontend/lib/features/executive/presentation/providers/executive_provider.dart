import 'package:flutter_riverpod/flutter_riverpod.dart';

// MOCK: Since we don't have Dio configured with this exact endpoint yet
class ExecutiveState {
  final bool isLoading;
  final Map<String, dynamic> data;
  final String? error;

  ExecutiveState({this.isLoading = false, this.data = const {}, this.error});

  ExecutiveState copyWith({bool? isLoading, Map<String, dynamic>? data, String? error}) {
    return ExecutiveState(
      isLoading: isLoading ?? this.isLoading,
      data: data ?? this.data,
      error: error,
    );
  }
}

class ExecutiveNotifier extends StateNotifier<ExecutiveState> {
  ExecutiveNotifier() : super(ExecutiveState());

  Future<void> fetchGodView() async {
    state = state.copyWith(isLoading: true, error: null);
    try {
      // MOCK: Simulating backend call to ExecutiveDashboardService.getEnterpriseGodView()
      await Future.delayed(const Duration(seconds: 2)); // Simulate network latency
      
      final mockData = {
        'enterpriseRevenue': 124500.50,
        'activeBranches': 12,
        'liveOrders': 45,
        'insights': [
          {'title': 'Weekend Sales Surge Expected', 'impact': 'High', 'category': 'Revenue'},
          {'title': 'Low Stock: Mozzarella Cheese (Branch 02)', 'impact': 'Medium', 'category': 'Inventory'}
        ]
      };
      
      state = state.copyWith(isLoading: false, data: mockData);
    } catch (e) {
      state = state.copyWith(isLoading: false, error: e.toString());
    }
  }
}

final executiveProvider = StateNotifierProvider<ExecutiveNotifier, ExecutiveState>((ref) {
  return ExecutiveNotifier();
});
