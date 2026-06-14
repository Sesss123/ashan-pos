import 'package:flutter_riverpod/flutter_riverpod.dart';
import '../../../../core/realtime/socket_service.dart';
import '../../domain/repositories/branch_repository.dart';

// ─── Branches List Provider ──────────────────────────────────────────────────

class BranchListNotifier extends AsyncNotifier<List<dynamic>> {
  @override
  Future<List<dynamic>> build() async {
    return [];
  }

  /// Fetch all branches from the API.
  Future<void> fetchBranches() async {
    state = const AsyncValue.loading();
    try {
      final repo = ref.read(branchRepositoryProvider);
      final branches = await repo.fetchBranches();
      state = AsyncValue.data(branches);
    } catch (e, st) {
      state = AsyncValue.error(e, st);
    }
  }

  /// Start socket listeners so UI auto-updates on branch changes.
  void listenToSocket() {
    socketService.on('branch.created', (_) => fetchBranches());
    socketService.on('branch.updated', (_) => fetchBranches());
    socketService.on('branch.deleted', (_) => fetchBranches());

    ref.onDispose(() {
      socketService.off('branch.created');
      socketService.off('branch.updated');
      socketService.off('branch.deleted');
    });

    fetchBranches();
  }

  /// Create a new branch and refresh the list.
  Future<Map<String, dynamic>> createBranch({
    required String name,
    String? location,
    String? contact,
  }) async {
    final repo = ref.read(branchRepositoryProvider);
    final result = await repo.createBranch(
      name: name,
      location: location,
      contact: contact,
    );
    await fetchBranches(); // refresh list immediately
    return result;
  }

  /// Toggle a branch's active status.
  Future<void> toggleActive(String id, bool isActive) async {
    final repo = ref.read(branchRepositoryProvider);
    await repo.updateBranch(id, isActive: isActive);
    await fetchBranches();
  }
}

final branchListProvider =
    AsyncNotifierProvider<BranchListNotifier, List<dynamic>>(
  BranchListNotifier.new,
);

// ─── Selected Branch Provider ─────────────────────────────────────────────────

class SelectedBranchNotifier extends Notifier<Map<String, dynamic>?> {
  @override
  Map<String, dynamic>? build() => null;
  
  void setBranch(Map<String, dynamic>? branch) {
    state = branch;
  }
}

final selectedBranchProvider = NotifierProvider<SelectedBranchNotifier, Map<String, dynamic>?>(SelectedBranchNotifier.new);

// ─── Per-Branch Stats Provider ────────────────────────────────────────────────

/// Fetches today's KPI stats for a given branch ID.
final branchStatsProvider =
    FutureProvider.family<Map<String, dynamic>, String>((ref, branchId) async {
  final repo = ref.read(branchRepositoryProvider);
  return repo.fetchBranchStats(branchId);
});
