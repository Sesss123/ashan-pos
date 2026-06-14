import 'package:flutter_riverpod/flutter_riverpod.dart';
import '../../../../core/network/dio_client.dart';
import '../../../../core/realtime/socket_service.dart';

class DiningTable {
  final String id;
  final int number;
  final int capacity;
  final String status;

  DiningTable({
    required this.id,
    required this.number,
    required this.capacity,
    required this.status,
  });

  factory DiningTable.fromJson(Map<String, dynamic> json) {
    return DiningTable(
      id: json['id'].toString(),
      number: int.tryParse(json['name'].toString().replaceAll(RegExp(r'[^0-9]'), '')) ?? 0,
      capacity: json['capacity'] ?? 4,
      status: json['status'] ?? 'Available',
    );
  }
}

class TableNotifier extends AsyncNotifier<List<DiningTable>> {
  @override
  Future<List<DiningTable>> build() async {
    socketService.on('table.updated', (data) {
      ref.invalidateSelf();
    });

    ref.onDispose(() {
      socketService.off('table.updated');
    });

    return _fetchTables();
  }

  Future<List<DiningTable>> _fetchTables() async {
    final dio = ref.read(dioClientProvider).dio;
    final response = await dio.get('/pos/tables');
    final data = response.data['data'] as List<dynamic>;
    return data.map((json) => DiningTable.fromJson(json)).toList();
  }
}

final tableProvider = AsyncNotifierProvider<TableNotifier, List<DiningTable>>(() {
  return TableNotifier();
});
