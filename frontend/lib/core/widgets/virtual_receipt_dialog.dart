import '../../core/utils/app_currency.dart';
import 'package:flutter/material.dart';
import 'package:google_fonts/google_fonts.dart';
import 'package:intl/intl.dart';

class VirtualReceiptDialog extends StatelessWidget {
  final Map<String, dynamic> order;

  const VirtualReceiptDialog({super.key, required this.order});

  static void show(BuildContext context, Map<String, dynamic> order) {
    showDialog(
      context: context,
      barrierColor: Colors.black.withValues(alpha: 0.6),
      builder: (context) => VirtualReceiptDialog(order: order),
    );
  }

  @override
  Widget build(BuildContext context) {
    final items = order['items'] as List? ?? [];
    final id = order['id']?.toString() ?? 'N/A';
    final shortId = id.length > 6 ? id.substring(0, 6) : id;
    final dateStr = order['createdAt'] ?? DateTime.now().toIso8601String();
    final date = DateTime.tryParse(dateStr) ?? DateTime.now();
    final type = order['type'] ?? 'Dine-In';
    final method = order['paymentMethod'] ?? 'Cash';
    
    final subtotal = (order['subtotal'] ?? 0).toDouble();
    final discount = (order['discount'] ?? 0).toDouble();
    final tax = (order['tax'] ?? 0).toDouble();
    final total = (order['total'] ?? 0).toDouble();

    return Dialog(
      backgroundColor: Colors.transparent,
      elevation: 0,
      child: Center(
        child: Container(
          width: 320,
          decoration: BoxDecoration(
            color: Colors.white,
            borderRadius: BorderRadius.circular(16),
            boxShadow: [
              BoxShadow(
                color: Colors.black.withValues(alpha: 0.25),
                blurRadius: 30,
                offset: const Offset(0, 15),
              ),
            ],
          ),
          child: Column(
            mainAxisSize: MainAxisSize.min,
            children: [
              // Virtual Thermal Paper Container
              Padding(
                padding: const EdgeInsets.symmetric(horizontal: 20, vertical: 24),
                child: Column(
                  children: [
                    // Torn paper top indicator (dashed)
                    Container(
                      height: 4,
                      width: double.infinity,
                      decoration: const BoxDecoration(
                        border: Border(
                          top: BorderSide(color: Colors.grey, width: 2, style: BorderStyle.solid),
                        ),
                      ),
                    ),
                    const SizedBox(height: 12),
                    
                    // Logo/Header
                    Text(
                      'ASHN ENTERPRISE ERP',
                      style: GoogleFonts.courierPrime(
                        fontSize: 16,
                        fontWeight: FontWeight.bold,
                        color: Colors.black87,
                      ),
                      textAlign: TextAlign.center,
                    ),
                    Text(
                      '123 Enterprise Avenue, Colombo\nTel: +94 77 123 4567',
                      style: GoogleFonts.courierPrime(fontSize: 11, color: Colors.black54),
                      textAlign: TextAlign.center,
                    ),
                    const SizedBox(height: 12),
                    Text(
                      '- - - - - - - - - - - - - - - -',
                      style: GoogleFonts.courierPrime(fontSize: 12, color: Colors.black38),
                    ),
                    
                    // Metadata
                    Row(
                      mainAxisAlignment: MainAxisAlignment.spaceBetween,
                      children: [
                        Text('Order: #$shortId', style: GoogleFonts.courierPrime(fontSize: 11, color: Colors.black87)),
                        Text(DateFormat('MM/dd/yy HH:mm').format(date), style: GoogleFonts.courierPrime(fontSize: 11, color: Colors.black87)),
                      ],
                    ),
                    Row(
                      mainAxisAlignment: MainAxisAlignment.spaceBetween,
                      children: [
                        Text('Type: $type', style: GoogleFonts.courierPrime(fontSize: 11, color: Colors.black87)),
                        Text('Method: $method', style: GoogleFonts.courierPrime(fontSize: 11, color: Colors.black87)),
                      ],
                    ),
                    Text(
                      '- - - - - - - - - - - - - - - -',
                      style: GoogleFonts.courierPrime(fontSize: 12, color: Colors.black38),
                    ),
                    
                    // Items list
                    ListView.builder(
                      shrinkWrap: true,
                      physics: const NeverScrollableScrollPhysics(),
                      itemCount: items.length,
                      itemBuilder: (context, index) {
                        final item = items[index];
                        final name = item['product']?['name'] ?? 'Unknown Item';
                        final qty = item['quantity'] ?? 1;
                        final price = (item['price'] ?? 0).toDouble();
                        final lineTotal = price * qty;
                        
                        return Padding(
                          padding: const EdgeInsets.symmetric(vertical: 2),
                          child: Row(
                            crossAxisAlignment: CrossAxisAlignment.start,
                            children: [
                              Text('${qty}x ', style: GoogleFonts.courierPrime(fontSize: 12, fontWeight: FontWeight.bold, color: Colors.black87)),
                              Expanded(
                                child: Text(name, style: GoogleFonts.courierPrime(fontSize: 12, color: Colors.black87)),
                              ),
                              Text(AppCurrency.format(lineTotal), style: GoogleFonts.courierPrime(fontSize: 12, color: Colors.black87)),
                            ],
                          ),
                        );
                      },
                    ),
                    Text(
                      '- - - - - - - - - - - - - - - -',
                      style: GoogleFonts.courierPrime(fontSize: 12, color: Colors.black38),
                    ),
                    
                    // Totals
                    Row(
                      mainAxisAlignment: MainAxisAlignment.spaceBetween,
                      children: [
                        Text('Subtotal:', style: GoogleFonts.courierPrime(fontSize: 12, color: Colors.black87)),
                        Text(AppCurrency.format(subtotal), style: GoogleFonts.courierPrime(fontSize: 12, color: Colors.black87)),
                      ],
                    ),
                    if (discount > 0)
                      Row(
                        mainAxisAlignment: MainAxisAlignment.spaceBetween,
                        children: [
                          Text('Discount:', style: GoogleFonts.courierPrime(fontSize: 12, color: Colors.black87)),
                          Text('-${AppCurrency.format(discount)}', style: GoogleFonts.courierPrime(fontSize: 12, color: Colors.black87)),
                        ],
                      ),
                    Row(
                      mainAxisAlignment: MainAxisAlignment.spaceBetween,
                      children: [
                        Text('Tax (VAT):', style: GoogleFonts.courierPrime(fontSize: 12, color: Colors.black87)),
                        Text(AppCurrency.format(tax), style: GoogleFonts.courierPrime(fontSize: 12, color: Colors.black87)),
                      ],
                    ),
                    Text(
                      '- - - - - - - - - - - - - - - -',
                      style: GoogleFonts.courierPrime(fontSize: 12, color: Colors.black38),
                    ),
                    
                    // Grand total
                    Row(
                      mainAxisAlignment: MainAxisAlignment.spaceBetween,
                      children: [
                        Text('TOTAL:', style: GoogleFonts.courierPrime(fontSize: 14, fontWeight: FontWeight.bold, color: Colors.black87)),
                        Text(AppCurrency.format(total), style: GoogleFonts.courierPrime(fontSize: 14, fontWeight: FontWeight.bold, color: Colors.black87)),
                      ],
                    ),
                    
                    const SizedBox(height: 16),
                    Text(
                      'Thank you for dining with us!',
                      style: GoogleFonts.courierPrime(fontSize: 10, color: Colors.black54),
                      textAlign: TextAlign.center,
                    ),
                    Text(
                      'Powered by Ashn POS',
                      style: GoogleFonts.courierPrime(fontSize: 8, color: Colors.black38),
                      textAlign: TextAlign.center,
                    ),
                    const SizedBox(height: 12),
                    
                    // Torn paper bottom indicator (dashed)
                    Container(
                      height: 4,
                      width: double.infinity,
                      decoration: const BoxDecoration(
                        border: Border(
                          bottom: BorderSide(color: Colors.grey, width: 2, style: BorderStyle.solid),
                        ),
                      ),
                    ),
                  ],
                ),
              ),
              
              // Close button section
              Container(
                width: double.infinity,
                decoration: const BoxDecoration(
                  color: Colors.black,
                  borderRadius: BorderRadius.only(
                    bottomLeft: Radius.circular(16),
                    bottomRight: Radius.circular(16),
                  ),
                ),
                child: TextButton.icon(
                  onPressed: () => Navigator.pop(context),
                  icon: const Icon(Icons.close, color: Colors.white),
                  label: Text(
                    'Close',
                    style: GoogleFonts.inter(color: Colors.white, fontWeight: FontWeight.w700),
                  ),
                  style: TextButton.styleFrom(padding: const EdgeInsets.all(16)),
                ),
              ),
            ],
          ),
        ),
      ),
    );
  }
}
