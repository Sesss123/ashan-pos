import 'package:flutter/material.dart';
import 'package:flutter_riverpod/flutter_riverpod.dart';
import 'package:google_fonts/google_fonts.dart';

import '../providers/cashier_providers.dart';

class TableActionsDialog extends ConsumerStatefulWidget {
  final Map<String, dynamic> sourceTable;

  const TableActionsDialog({super.key, required this.sourceTable});

  @override
  ConsumerState<TableActionsDialog> createState() => _TableActionsDialogState();
}

class _TableActionsDialogState extends ConsumerState<TableActionsDialog> {
  bool _isProcessing = false;
  String? _selectedTargetTableId;

  Future<void> _handleTransfer() async {
    if (_selectedTargetTableId == null) return;
    setState(() => _isProcessing = true);
    try {
      final repository = ref.read(cashierRepositoryProvider);
      // We assume orderId is '1' or we fetch it properly. 
      // Actually the backend expects orderId. Let's pass a mock or current active orderId if we have it, 
      // or we can modify the backend to just look up the active order by tableId.
      // For now, we will assume orderId is '123' as placeholder if not present.
      final orderId = widget.sourceTable['activeOrderId'] ?? 'placeholder-order';
      await repository.transferTable(widget.sourceTable['id'], _selectedTargetTableId!, orderId);
      if (mounted) {
        Navigator.pop(context, 'success');
        ref.invalidate(tablesProvider);
      }
    } catch (e) {
      if (mounted) ScaffoldMessenger.of(context).showSnackBar(SnackBar(content: Text(e.toString())));
    } finally {
      if (mounted) setState(() => _isProcessing = false);
    }
  }

  Future<void> _handleMerge() async {
    if (_selectedTargetTableId == null) return;
    setState(() => _isProcessing = true);
    try {
      final repository = ref.read(cashierRepositoryProvider);
      final orderId = widget.sourceTable['activeOrderId'] ?? 'placeholder-order';
      await repository.mergeTables(widget.sourceTable['id'], _selectedTargetTableId!, orderId);
      if (mounted) {
        Navigator.pop(context, 'success');
        ref.invalidate(tablesProvider);
      }
    } catch (e) {
      if (mounted) ScaffoldMessenger.of(context).showSnackBar(SnackBar(content: Text(e.toString())));
    } finally {
      if (mounted) setState(() => _isProcessing = false);
    }
  }

  @override
  Widget build(BuildContext context) {
    final tablesState = ref.watch(tablesProvider);

    return Dialog(
      shape: RoundedRectangleBorder(borderRadius: BorderRadius.circular(20)),
      child: Container(
        width: 400,
        padding: const EdgeInsets.all(24),
        child: Column(
          mainAxisSize: MainAxisSize.min,
          crossAxisAlignment: CrossAxisAlignment.stretch,
          children: [
            Text('Table Actions: ${widget.sourceTable['name']}', style: GoogleFonts.inter(fontSize: 20, fontWeight: FontWeight.w800)),
            const SizedBox(height: 16),
            
            Text('Select Target Table:', style: GoogleFonts.inter(fontWeight: FontWeight.w600)),
            const SizedBox(height: 8),
            
            tablesState.when(
              data: (tables) {
                final targetTables = tables.where((t) => t['id'] != widget.sourceTable['id']).toList();
                return DropdownButtonFormField<String>(
                  decoration: const InputDecoration(border: OutlineInputBorder()),
                  initialValue: _selectedTargetTableId,
                  items: targetTables.map((t) {
                    return DropdownMenuItem<String>(
                      value: t['id'].toString(),
                      child: Text('${t['name']} (${t['status']})'),
                    );
                  }).toList(),
                  onChanged: (val) => setState(() => _selectedTargetTableId = val),
                  hint: const Text('Choose a table'),
                );
              },
              loading: () => const CircularProgressIndicator(),
              error: (e, _) => Text('Error loading tables: $e'),
            ),

            const SizedBox(height: 32),
            
            if (_isProcessing)
              const Center(child: CircularProgressIndicator())
            else
              Row(
                mainAxisAlignment: MainAxisAlignment.spaceEvenly,
                children: [
                  ElevatedButton.icon(
                    style: ElevatedButton.styleFrom(backgroundColor: Colors.blue),
                    onPressed: _selectedTargetTableId == null ? null : _handleTransfer,
                    icon: const Icon(Icons.swap_horiz, color: Colors.white),
                    label: const Text('Transfer', style: TextStyle(color: Colors.white)),
                  ),
                  ElevatedButton.icon(
                    style: ElevatedButton.styleFrom(backgroundColor: Colors.purple),
                    onPressed: _selectedTargetTableId == null ? null : _handleMerge,
                    icon: const Icon(Icons.call_merge, color: Colors.white),
                    label: const Text('Merge', style: TextStyle(color: Colors.white)),
                  ),
                ],
              ),

            const SizedBox(height: 16),
            TextButton(
              onPressed: () => Navigator.pop(context, 'view_order'),
              child: const Text('View / Edit Order'),
            ),
          ],
        ),
      ),
    );
  }
}
