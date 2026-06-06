import 'package:flutter/material.dart';

class FloorLayoutDesigner extends StatefulWidget {
  const FloorLayoutDesigner({super.key});

  @override
  State<FloorLayoutDesigner> createState() => _FloorLayoutDesignerState();
}

class _FloorLayoutDesignerState extends State<FloorLayoutDesigner> {
  // Mock Tables for drag-and-drop
  final List<Offset> _tables = [
    const Offset(100, 100),
    const Offset(300, 100),
    const Offset(200, 300),
  ];

  @override
  Widget build(BuildContext context) {
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
                  tileColor: Colors.blue.withOpacity(0.1),
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
            child: Stack(
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
                for (int i = 0; i < _tables.length; i++)
                  Positioned(
                    left: _tables[i].dx,
                    top: _tables[i].dy,
                    child: Draggable(
                      feedback: _buildTableWidget(i, isDragging: true),
                      childWhenDragging: Opacity(
                        opacity: 0.3,
                        child: _buildTableWidget(i),
                      ),
                      onDragEnd: (details) {
                        setState(() {
                          // Adjust for appbar / sidebar offsets in real impl
                          _tables[i] = details.offset;
                        });
                      },
                      child: _buildTableWidget(i),
                    ),
                  )
              ],
            ),
          ),
        ],
      ),
    );
  }

  Widget _buildTableWidget(int index, {bool isDragging = false}) {
    return Container(
      width: 100,
      height: 100,
      decoration: BoxDecoration(
        color: isDragging ? Colors.green.withOpacity(0.8) : Colors.white,
        border: Border.all(color: Colors.blue, width: 2),
        borderRadius: BorderRadius.circular(12),
        boxShadow: const [BoxShadow(color: Colors.black12, blurRadius: 4)],
      ),
      child: Center(
        child: Column(
          mainAxisAlignment: MainAxisAlignment.center,
          children: [
            Text('T${index + 1}', style: const TextStyle(fontWeight: FontWeight.bold, fontSize: 20)),
            const Text('4 Pax', style: TextStyle(fontSize: 12, color: Colors.grey)),
          ],
        ),
      ),
    );
  }
}
