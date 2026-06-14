import 'dart:async';
import 'package:flutter/material.dart';
import 'package:google_fonts/google_fonts.dart';
import 'dart:ui';

class KdsOrderCard extends StatefulWidget {
  final Map<String, dynamic> kitchenOrder;
  final String? selectedStation;
  final Function(String, String) onStatusChange;

  const KdsOrderCard({
    super.key,
    required this.kitchenOrder,
    this.selectedStation,
    required this.onStatusChange,
  });

  @override
  State<KdsOrderCard> createState() => _KdsOrderCardState();
}

class _KdsOrderCardState extends State<KdsOrderCard> {
  Timer? _timer;
  late Duration _elapsed;

  @override
  void initState() {
    super.initState();
    _calculateElapsed();
    _timer = Timer.periodic(const Duration(seconds: 1), (_) {
      if (mounted) {
        setState(() {
          _calculateElapsed();
        });
      }
    });
  }

  void _calculateElapsed() {
    final createdAt = DateTime.parse(widget.kitchenOrder['createdAt']).toLocal();
    var diff = DateTime.now().difference(createdAt);
    if (diff.isNegative) diff = Duration.zero; // Prevent negative timers if clocks slightly out of sync
    _elapsed = diff;
  }

  @override
  void dispose() {
    _timer?.cancel();
    super.dispose();
  }

  Color _getTimerColor() {
    if (_elapsed.inMinutes < 10) return Colors.green;
    if (_elapsed.inMinutes < 15) return Colors.orange;
    return Colors.red;
  }

  String _formatElapsed() {
    if (_elapsed.inDays > 0) {
      return "${_elapsed.inDays}d ${(_elapsed.inHours.remainder(24))}h";
    }
    String twoDigits(int n) => n.toString().padLeft(2, "0");
    String twoDigitMinutes = twoDigits(_elapsed.inMinutes.remainder(60));
    String twoDigitSeconds = twoDigits(_elapsed.inSeconds.remainder(60));
    
    if (_elapsed.inHours > 0) {
      return "${twoDigits(_elapsed.inHours)}:$twoDigitMinutes:$twoDigitSeconds";
    }
    return "$twoDigitMinutes:$twoDigitSeconds";
  }

  @override
  Widget build(BuildContext context) {
    final order = widget.kitchenOrder['order'];
    if (order == null) return const SizedBox();

    final status = widget.kitchenOrder['status'];
    final table = order['table'];
    final items = (order['items'] as List<dynamic>?) ?? [];

    // Filter items by station
    final filteredItems = widget.selectedStation == null || widget.selectedStation!.isEmpty
        ? items
        : items.where((item) {
            final category = item['product']?['category']?['name'];
            return category == widget.selectedStation;
          }).toList();

    // If a station is selected and this order has no items for it, don't show the card
    if (filteredItems.isEmpty && widget.selectedStation != null && widget.selectedStation!.isNotEmpty) {
      return const SizedBox();
    }

    return Container(
      margin: const EdgeInsets.only(bottom: 16),
      decoration: BoxDecoration(
        color: Theme.of(context).cardTheme.color ?? Theme.of(context).colorScheme.surface,
        borderRadius: BorderRadius.circular(16),
        border: Border.all(color: Theme.of(context).dividerColor),
        boxShadow: [
          BoxShadow(
            color: Colors.black.withValues(alpha: 0.05),
            blurRadius: 10,
            offset: const Offset(0, 4),
          )
        ],
      ),
      child: Column(
        crossAxisAlignment: CrossAxisAlignment.stretch,
        children: [
          // Header
          Container(
            padding: const EdgeInsets.symmetric(horizontal: 16, vertical: 12),
            decoration: BoxDecoration(
              color: status == 'Pending' 
                  ? Colors.blue.withValues(alpha: 0.1) 
                  : status == 'Preparing' 
                      ? Colors.orange.withValues(alpha: 0.1) 
                      : Colors.green.withValues(alpha: 0.1),
              borderRadius: const BorderRadius.vertical(top: Radius.circular(16)),
            ),
            child: Row(
              mainAxisAlignment: MainAxisAlignment.spaceBetween,
              children: [
                Column(
                  crossAxisAlignment: CrossAxisAlignment.start,
                  children: [
                    Text(
                      '#${order['id'].toString().substring(0, 5).toUpperCase()}',
                      style: GoogleFonts.inter(fontWeight: FontWeight.w800, fontSize: 18, color: (Theme.of(context).textTheme.bodyMedium?.color ?? Colors.black)),
                    ),
                    if (table != null)
                      Text(
                        '${table['name']} • ${order['type']}',
                        style: GoogleFonts.inter(color: Colors.grey[600], fontSize: 14, fontWeight: FontWeight.w600),
                      )
                    else
                      Text(
                        order['type'],
                        style: GoogleFonts.inter(color: Colors.grey[600], fontSize: 14, fontWeight: FontWeight.w600),
                      ),
                  ],
                ),
                Container(
                  padding: const EdgeInsets.symmetric(horizontal: 12, vertical: 6),
                  decoration: BoxDecoration(
                    color: _getTimerColor().withValues(alpha: 0.1),
                    borderRadius: BorderRadius.circular(20),
                    border: Border.all(color: _getTimerColor().withValues(alpha: 0.5)),
                  ),
                  child: Text(
                    _formatElapsed(),
                    style: GoogleFonts.inter(
                      color: _getTimerColor(),
                      fontWeight: FontWeight.w800,
                      fontSize: 16,
                    ),
                  ),
                ),
              ],
            ),
          ),
          
          // Items
          Padding(
            padding: const EdgeInsets.all(16),
            child: Column(
              crossAxisAlignment: CrossAxisAlignment.start,
              children: filteredItems.map((item) {
                final product = item['product'];
                return Padding(
                  padding: const EdgeInsets.only(bottom: 12),
                  child: Row(
                    crossAxisAlignment: CrossAxisAlignment.start,
                    children: [
                      Container(
                        padding: const EdgeInsets.all(6),
                        decoration: BoxDecoration(
                          color: Theme.of(context).colorScheme.primary.withValues(alpha: 0.1),
                          borderRadius: BorderRadius.circular(8),
                        ),
                        child: Text(
                          '${item['quantity']}x',
                          style: GoogleFonts.inter(fontWeight: FontWeight.w800, color: Theme.of(context).colorScheme.primary),
                        ),
                      ),
                      const SizedBox(width: 12),
                      Expanded(
                        child: Column(
                          crossAxisAlignment: CrossAxisAlignment.start,
                          children: [
                            Text(
                              product['name'],
                              style: GoogleFonts.inter(fontWeight: FontWeight.w700, fontSize: 16, color: (Theme.of(context).textTheme.bodyMedium?.color ?? Colors.black)),
                            ),
                            if (item['notes'] != null && item['notes'].toString().isNotEmpty)
                              Padding(
                                padding: const EdgeInsets.only(top: 4),
                                child: Text(
                                  'Notes: ${item['notes']}',
                                  style: GoogleFonts.inter(color: Colors.red[400], fontSize: 14, fontStyle: FontStyle.italic, fontWeight: FontWeight.w600),
                                ),
                              ),
                            const SizedBox(height: 8),
                            InkWell(
                              onTap: () => _showRecipeDialog(context, product),
                              borderRadius: BorderRadius.circular(8),
                              child: Container(
                                padding: const EdgeInsets.symmetric(horizontal: 12, vertical: 6),
                                decoration: BoxDecoration(
                                  color: Theme.of(context).colorScheme.secondary.withValues(alpha: 0.1),
                                  borderRadius: BorderRadius.circular(8),
                                  border: Border.all(color: Theme.of(context).colorScheme.secondary.withValues(alpha: 0.3)),
                                ),
                                child: Row(
                                  mainAxisSize: MainAxisSize.min,
                                  children: [
                                    Icon(Icons.menu_book, size: 16, color: Theme.of(context).colorScheme.secondary),
                                    const SizedBox(width: 6),
                                    Text('View Recipe', style: GoogleFonts.inter(fontSize: 12, fontWeight: FontWeight.w700, color: Theme.of(context).colorScheme.secondary)),
                                  ],
                                ),
                              ),
                            ),
                          ],
                        ),
                      ),
                    ],
                  ),
                );
              }).toList(),
            ),
          ),

          // Action Button
          if (status == 'Pending' || status == 'Preparing')
            Padding(
              padding: const EdgeInsets.all(16).copyWith(top: 0),
              child: ElevatedButton(
                onPressed: () {
                  final nextStatus = status == 'Pending' ? 'Preparing' : 'Ready';
                  widget.onStatusChange(widget.kitchenOrder['id'], nextStatus);
                },
                style: ElevatedButton.styleFrom(
                  backgroundColor: status == 'Pending' ? Colors.blue : Colors.green,
                  foregroundColor: Colors.white,
                  padding: const EdgeInsets.symmetric(vertical: 16),
                  shape: RoundedRectangleBorder(borderRadius: BorderRadius.circular(12)),
                ),
                child: Text(
                  status == 'Pending' ? 'START PREPARING' : 'MARK READY',
                  style: GoogleFonts.inter(fontWeight: FontWeight.w800, fontSize: 16, letterSpacing: 1),
                ),
              ),
            ),
        ],
      ),
    );
  }

  void _showRecipeDialog(BuildContext context, dynamic product) {
    showDialog(
      context: context,
      builder: (context) {
        return BackdropFilter(
          filter: ImageFilter.blur(sigmaX: 10, sigmaY: 10),
          child: Dialog(
            backgroundColor: Colors.transparent,
            elevation: 0,
            child: Container(
              padding: const EdgeInsets.all(24),
              decoration: BoxDecoration(
                color: (Theme.of(context).cardTheme.color ?? Theme.of(context).colorScheme.surface).withValues(alpha: 0.8),
                borderRadius: BorderRadius.circular(24),
                border: Border.all(color: Colors.white.withValues(alpha: 0.2)),
                boxShadow: [
                  BoxShadow(color: Colors.black.withValues(alpha: 0.1), blurRadius: 20)
                ]
              ),
              child: Column(
                mainAxisSize: MainAxisSize.min,
                crossAxisAlignment: CrossAxisAlignment.start,
                children: [
                  Row(
                    mainAxisAlignment: MainAxisAlignment.spaceBetween,
                    children: [
                      Expanded(child: Text(product['name'] ?? 'Unknown Item', style: GoogleFonts.inter(fontSize: 24, fontWeight: FontWeight.bold, color: Theme.of(context).textTheme.bodyMedium?.color ?? Colors.black))),
                      IconButton(icon: const Icon(Icons.close), onPressed: () => Navigator.pop(context))
                    ]
                  ),
                  const SizedBox(height: 16),
                  Text('Preparation Instructions:', style: GoogleFonts.inter(fontWeight: FontWeight.w600, color: Colors.grey[600])),
                  const SizedBox(height: 8),
                  Text(product['recipe'] ?? product['description'] ?? 'No special instructions or recipe available.', style: GoogleFonts.inter(fontSize: 16, color: Theme.of(context).textTheme.bodyMedium?.color ?? Colors.black)),
                  const SizedBox(height: 24),
                  Align(
                    alignment: Alignment.centerRight,
                    child: ElevatedButton(
                      onPressed: () => Navigator.pop(context),
                      style: ElevatedButton.styleFrom(
                        shape: RoundedRectangleBorder(borderRadius: BorderRadius.circular(12))
                      ),
                      child: const Text('Close')
                    )
                  )
                ]
              )
            )
          )
        );
      }
    );
  }
}
