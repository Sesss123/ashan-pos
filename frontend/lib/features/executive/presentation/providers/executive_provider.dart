import 'package:flutter_riverpod/flutter_riverpod.dart';
import '../../../../core/network/dio_client.dart';
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

class ExecutiveNotifier extends Notifier<ExecutiveState> {
  @override
  ExecutiveState build() => ExecutiveState();

  Future<void> fetchGodView() async {
    state = state.copyWith(isLoading: true, error: null);
    try {
      final dio = ref.read(dioClientProvider).dio;
      final res = await dio.get('/executive/dashboard'); // Real API endpoint
      
      state = state.copyWith(isLoading: false, data: res.data as Map<String, dynamic>);
    } catch (e) {
      state = state.copyWith(isLoading: false, error: e.toString());
    }
  }
}

final executiveProvider = NotifierProvider<ExecutiveNotifier, ExecutiveState>(() {
  return ExecutiveNotifier();
});
