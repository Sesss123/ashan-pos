import 'package:flutter/material.dart';
import 'package:flutter_riverpod/flutter_riverpod.dart';
import 'package:google_fonts/google_fonts.dart';
import 'package:intl/intl.dart';

import '../../../core/network/dio_client.dart';
import '../../cashier/presentation/providers/cashier_providers.dart';

class ReservationsScreen extends ConsumerStatefulWidget {
  const ReservationsScreen({super.key});

  @override
  ConsumerState<ReservationsScreen> createState() => _ReservationsScreenState();
}

class _ReservationsScreenState extends ConsumerState<ReservationsScreen> {
  List<dynamic> _reservations = [];
  bool _isLoading = true;

  @override
  void initState() {
    super.initState();
    _fetchReservations();
  }

  Future<void> _fetchReservations() async {
    setState(() => _isLoading = true);
    try {
      final response = await ref.read(dioClientProvider).dio.get('/waiter/reservations/today');
      if (response.data['success']) {
        setState(() {
          _reservations = response.data['data'] as List<dynamic>;
        });
      }
    } catch (e) {
      if (mounted) ScaffoldMessenger.of(context).showSnackBar(SnackBar(content: Text('Failed to load reservations: $e')));
    } finally {
      if (mounted) setState(() => _isLoading = false);
    }
  }

  void _showCheckInDialog(dynamic reservation) {
    final tables = ref.read(tablesProvider).value ?? [];
    final availableTables = tables.where((t) => t['status'] == 'Available').toList();
    String? selectedTableId;

    showDialog(
      context: context,
      builder: (ctx) => StatefulBuilder(
        builder: (ctx, setDialogState) => AlertDialog(
          backgroundColor: Theme.of(context).cardTheme.color ?? Theme.of(context).colorScheme.surface,
          shape: RoundedRectangleBorder(borderRadius: BorderRadius.circular(24)),
          title: Text('Check-in ${reservation['customerName']}', style: GoogleFonts.inter(fontWeight: FontWeight.w800, color: (Theme.of(context).textTheme.bodyMedium?.color ?? Colors.black))),
          content: Column(
            mainAxisSize: MainAxisSize.min,
            crossAxisAlignment: CrossAxisAlignment.start,
            children: [
              Text('Guests: ${reservation['guests']}', style: GoogleFonts.inter(fontWeight: FontWeight.w600, color: (Theme.of(context).textTheme.bodyMedium?.color ?? Colors.black))),
              if (reservation['notes'] != null && reservation['notes'].toString().isNotEmpty)
                Padding(
                  padding: const EdgeInsets.only(top: 8),
                  child: Text('Notes: ${reservation['notes']}', style: GoogleFonts.inter(color: Colors.orange, fontWeight: FontWeight.w500)),
                ),
              const SizedBox(height: 16),
              if (availableTables.isEmpty)
                Text('No available tables!', style: GoogleFonts.inter(color: Theme.of(context).colorScheme.error))
              else
                DropdownButtonFormField<String>(
                  decoration: InputDecoration(
                    labelText: 'Assign Table',
                    filled: true,
                    fillColor: Theme.of(context).scaffoldBackgroundColor,
                    border: OutlineInputBorder(borderRadius: BorderRadius.circular(16), borderSide: BorderSide.none),
                  ),
                  items: availableTables.map((t) => DropdownMenuItem<String>(
                    value: t['id'] as String,
                    child: Text(t['name'] as String, style: GoogleFonts.inter(color: (Theme.of(context).textTheme.bodyMedium?.color ?? Colors.black))),
                  )).toList(),
                  onChanged: (val) => setDialogState(() => selectedTableId = val),
                ),
            ],
          ),
          actions: [
            TextButton(
              onPressed: () => Navigator.pop(ctx),
              child: Text('Cancel', style: GoogleFonts.inter(color: Colors.grey)),
            ),
            ElevatedButton(
              style: ElevatedButton.styleFrom(
                backgroundColor: Theme.of(context).colorScheme.primary,
                foregroundColor: Colors.white,
                shape: RoundedRectangleBorder(borderRadius: BorderRadius.circular(12)),
              ),
              onPressed: selectedTableId == null ? null : () async {
                try {
                  await ref.read(dioClientProvider).dio.post('/waiter/reservations/${reservation['id']}/check-in', data: {
                    'tableId': selectedTableId
                  });
                  ref.invalidate(tablesProvider);
                  if (!ctx.mounted) return;
                  Navigator.pop(ctx);
                  if (!mounted) return;
                  _fetchReservations();
                  ScaffoldMessenger.of(context).showSnackBar(const SnackBar(content: Text('Customer checked in successfully!')));
                } catch (e) {
                  if (!mounted) return;
                  ScaffoldMessenger.of(context).showSnackBar(SnackBar(content: Text('Failed to check in: $e')));
                }
              },
              child: Text('Confirm Check-in', style: GoogleFonts.inter(fontWeight: FontWeight.w700)),
            ),
          ],
        ),
      ),
    );
  }

  @override
  Widget build(BuildContext context) {
    return Padding(
      padding: const EdgeInsets.all(24.0),
      child: Column(
        crossAxisAlignment: CrossAxisAlignment.start,
        children: [
          Row(
            mainAxisAlignment: MainAxisAlignment.spaceBetween,
            children: [
              Text("Today's Reservations", style: GoogleFonts.inter(color: (Theme.of(context).textTheme.bodyMedium?.color ?? Colors.black), fontSize: 24, fontWeight: FontWeight.w800)),
              IconButton(
                icon: Icon(Icons.refresh, color: Theme.of(context).colorScheme.primary),
                onPressed: _fetchReservations,
              ),
            ],
          ),
          const SizedBox(height: 24),
          Expanded(
            child: _isLoading
                ? const Center(child: CircularProgressIndicator())
                : _reservations.isEmpty
                    ? Center(child: Text('No reservations for today.', style: GoogleFonts.inter(color: Colors.grey)))
                    : ListView.builder(
                        itemCount: _reservations.length,
                        itemBuilder: (context, index) {
                          final res = _reservations[index];
                          final timeStr = DateFormat.jm().format(DateTime.parse(res['date']));
                          final isCheckedIn = res['status'] == 'CheckedIn';
                          
                          return Container(
                            margin: const EdgeInsets.only(bottom: 12),
                            padding: const EdgeInsets.all(16),
                            decoration: BoxDecoration(
                              color: Theme.of(context).cardTheme.color ?? Theme.of(context).colorScheme.surface,
                              borderRadius: BorderRadius.circular(16),
                              border: Border.all(color: Theme.of(context).dividerColor),
                            ),
                            child: Row(
                              children: [
                                Container(
                                  padding: const EdgeInsets.all(12),
                                  decoration: BoxDecoration(
                                    color: isCheckedIn ? Colors.green.withValues(alpha: 0.1) : Theme.of(context).colorScheme.primary.withValues(alpha: 0.1),
                                    borderRadius: BorderRadius.circular(12),
                                  ),
                                  child: Text(
                                    timeStr,
                                    style: GoogleFonts.inter(
                                      color: isCheckedIn ? Colors.green : Theme.of(context).colorScheme.primary,
                                      fontWeight: FontWeight.w800,
                                    ),
                                  ),
                                ),
                                const SizedBox(width: 16),
                                Expanded(
                                  child: Column(
                                    crossAxisAlignment: CrossAxisAlignment.start,
                                    children: [
                                      Text(res['customerName'], style: GoogleFonts.inter(fontWeight: FontWeight.w800, fontSize: 16, color: (Theme.of(context).textTheme.bodyMedium?.color ?? Colors.black))),
                                      const SizedBox(height: 4),
                                      Text('${res['guests']} Guests${res['phone'] != null ? ' • ${res['phone']}' : ''}', style: GoogleFonts.inter(color: Colors.grey, fontSize: 14)),
                                      if (res['notes'] != null && res['notes'].toString().isNotEmpty) ...[
                                        const SizedBox(height: 4),
                                        Text('Notes: ${res['notes']}', style: GoogleFonts.inter(color: Colors.orange, fontSize: 13, fontStyle: FontStyle.italic)),
                                      ],
                                    ],
                                  ),
                                ),
                                if (isCheckedIn)
                                  Container(
                                    padding: const EdgeInsets.symmetric(horizontal: 12, vertical: 6),
                                    decoration: BoxDecoration(color: Colors.green.withValues(alpha: 0.1), borderRadius: BorderRadius.circular(20)),
                                    child: Text('Checked In', style: GoogleFonts.inter(color: Colors.green, fontWeight: FontWeight.w700, fontSize: 12)),
                                  )
                                else
                                  ElevatedButton(
                                    onPressed: () => _showCheckInDialog(res),
                                    style: ElevatedButton.styleFrom(
                                      backgroundColor: Theme.of(context).colorScheme.primary,
                                      foregroundColor: Colors.white,
                                      shape: RoundedRectangleBorder(borderRadius: BorderRadius.circular(12)),
                                    ),
                                    child: Text('Check-in', style: GoogleFonts.inter(fontWeight: FontWeight.w600)),
                                  ),
                              ],
                            ),
                          );
                        },
                      ),
          ),
        ],
      ),
    );
  }
}
