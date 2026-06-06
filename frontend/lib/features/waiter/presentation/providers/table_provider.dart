import 'package:flutter_riverpod/flutter_riverpod.dart';

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
}

class TableNotifier extends StateNotifier<List<DiningTable>> {
  TableNotifier() : super([
    DiningTable(id: 't1', number: 1, capacity: 4, status: 'Available'),
    DiningTable(id: 't2', number: 2, capacity: 2, status: 'Occupied'),
    DiningTable(id: 't3', number: 3, capacity: 6, status: 'Available'),
    DiningTable(id: 't4', number: 4, capacity: 4, status: 'Reserved'),
  ]);

  // Method to be called by Socket.IO listener
  void updateTableStatus(String tableId, String newStatus) {
    state = [
      for (final table in state)
        if (table.id == tableId)
          DiningTable(
            id: table.id,
            number: table.number,
            capacity: table.capacity,
            status: newStatus,
          )
        else
          table,
    ];
  }
}

final tableProvider = StateNotifierProvider<TableNotifier, List<DiningTable>>((ref) {
  return TableNotifier();
});
