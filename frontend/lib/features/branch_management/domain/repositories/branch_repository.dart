import 'package:dio/dio.dart';
import 'package:flutter_riverpod/flutter_riverpod.dart';
import '../../../../core/network/dio_client.dart';

/// Provides a BranchRepository instance backed by the authenticated Dio client.
final branchRepositoryProvider = Provider<BranchRepository>((ref) {
  final dioClient = ref.read(dioClientProvider);
  return BranchRepository(dioClient.dio);
});

class BranchRepository {
  final Dio _dio;

  BranchRepository(this._dio);

  /// Fetch all branches for the current tenant.
  Future<List<dynamic>> fetchBranches() async {
    final response = await _dio.get('/admin/branches');
    return response.data['data'] as List<dynamic>;
  }

  /// Create a new branch. Returns created branch + generated credentials.
  Future<Map<String, dynamic>> createBranch({
    required String name,
    String? location,
    String? contact,
  }) async {
    final response = await _dio.post('/admin/branches', data: {
      'name': name,
      if (location != null && location.isNotEmpty) 'location': location,
      if (contact != null && contact.isNotEmpty) 'contact': contact,
    });
    return response.data as Map<String, dynamic>;
  }

  /// Update a branch's details or toggle active status.
  Future<Map<String, dynamic>> updateBranch(
    String id, {
    String? name,
    String? location,
    String? contact,
    bool? isActive,
  }) async {
    final response = await _dio.put('/admin/branches/$id', data: {
      'name': ?name,
      'location': ?location,
      'contact': ?contact,
      'isActive': ?isActive,
    });
    return response.data['data'] as Map<String, dynamic>;
  }

  /// Fetch today's KPI stats for a specific branch.
  Future<Map<String, dynamic>> fetchBranchStats(String branchId) async {
    final response = await _dio.get('/admin/branches/$branchId/stats');
    return response.data['data'] as Map<String, dynamic>;
  }
}
