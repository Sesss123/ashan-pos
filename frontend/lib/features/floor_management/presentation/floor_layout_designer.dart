import 'package:flutter/material.dart';
import 'package:flutter_riverpod/flutter_riverpod.dart';
import '../../waiter/presentation/providers/table_provider.dart';

class FloorLayoutDesigner extends ConsumerStatefulWidget {
  const FloorLayoutDesigner({super.key});

  @override
  ConsumerState<FloorLayoutDesigner> createState() => _FloorLayoutDesignerState();
}

class _FloorLayoutDesignerState extends ConsumerState<FloorLayoutDesigner> {
  final Map<String, Offset> _tablePositions = {};

  @override
  Widget build(BuildContext context) {
    final tableStateAsync = ref.watch(tableProvider);

    return Scaffold(
      appBar: AppBar(
        title: const Text('Floor Layout Designer'),
        actions: [
          ElevatedButton.icon(
            onPressed: () {},
            icon: const Icon(Icons.add_box),
            label: const Text('Add Table'),
          ),
          const SizedBox(width: 16),
          ElevatedButton.icon(
            onPressed: () {},
            icon: const Icon(Icons.save),
            label: const Text('Save Layout'),
          ),
          const SizedBox(width: 16),
        ],
      ),
      body: Row(
        children: [
          // Sidebar
          Container(
            width: 250,
            color: Colors.grey.shade100,
            child: ListView(
              padding: const EdgeInsets.all(16),
              children: [
                const Text('Floors', style: TextStyle(fontWeight: FontWeight.bold, fontSize: 18)),
                const SizedBox(height: 16),
                ListTile(
                  title: const Text('Ground Floor'),
                  tileColor: Colors.blue.withValues(alpha: 0.1),
                  shape: RoundedRectangleBorder(borderRadius: BorderRadius.circular(8)),
                ),
                const SizedBox(height: 8),
                ListTile(
                  title: const Text('Rooftop Area'),
                  shape: RoundedRectangleBorder(borderRadius: BorderRadius.circular(8)),
                ),
                const Divider(height: 32),
                ElevatedButton(onPressed: () {}, child: const Text('Add Floor')),
              ],
            ),
          ),
          // Canvas area
          Expanded(
            child: tableStateAsync.when(
              loading: () => const Center(child: CircularProgressIndicator()),
              error: (err, stack) => Center(child: Text('Error loading tables: $err')),
              data: (tables) => Stack(
                children: [
                  // Background Grid
                  Container(
                    decoration: const BoxDecoration(
                      image: DecorationImage(
                        image: AssetImage('assets/images/grid_pattern.png'), // Placeholder
                        repeat: ImageRepeat.repeat,
                      ),
                    ),
                  ),
                  // Draggable Tables
                  for (var table in tables)
                    Positioned(
                      left: _tablePositions[table.id]?.dx ?? (tables.indexOf(table) * 120.0 + 50.0),
                      top: _tablePositions[table.id]?.dy ?? 100.0,
                      child: Draggable(
                        feedback: _buildTableWidget(table, isDragging: true),
                        childWhenDragging: Opacity(
                          opacity: 0.3,
                          child: _buildTableWidget(table),
                        ),
                        onDragEnd: (details) {
                          setState(() {
                            // Adjust for appbar / sidebar offsets in real impl
                            _tablePositions[table.id] = details.offset;
                          });
                        },
                        child: _buildTableWidget(table),
                      ),
                    )
                ],
              ),
            ),
          ),
        ],
      ),
    );
  }

  Widget _buildTableWidget(DiningTable table, {bool isDragging = false}) {
    Color statusColor = Colors.green;
    if (table.status == 'Occupied') statusColor = Colors.red;
    if (table.status == 'Reserved') statusColor = Colors.orange;

    return Container(
      width: 100,
      height: 100,
      decoration: BoxDecoration(
        color: isDragging ? Colors.green.withValues(alpha: 0.8) : Colors.white,
        border: Border.all(color: statusColor, width: 2),
        borderRadius: BorderRadius.circular(12),
        boxShadow: const [BoxShadow(color: Colors.black12, blurRadius: 4)],
      ),
      child: Center(
        child: Column(
          mainAxisAlignment: MainAxisAlignment.center,
          children: [
            Text('T${table.number}', style: const TextStyle(fontWeight: FontWeight.bold, fontSize: 20)),
            Text('${table.capacity} Pax', style: const TextStyle(fontSize: 12, color: Colors.grey)),
            const SizedBox(height: 4),
            Text(table.status, style: TextStyle(fontSize: 10, color: statusColor, fontWeight: FontWeight.bold)),
          ],
        ),
      ),
    );
  }
}
