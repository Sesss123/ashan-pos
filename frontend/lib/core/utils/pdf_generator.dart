import '../../core/utils/app_currency.dart';
import 'package:pdf/pdf.dart';
import 'package:pdf/widgets.dart' as pw;
import 'package:printing/printing.dart';
import 'package:intl/intl.dart';
import 'bluetooth_printer_service.dart';

class PdfGenerator {
  static Future<void> printReceipt(Map<String, dynamic> order) async {
    final connected = BluetoothPrinterService.instance.connectedPrinter.value;
    if (connected != null) {
      await BluetoothPrinterService.instance.printReceipt(order);
      return;
    }

    final pdf = pw.Document();

    // 80mm thermal printer format: roughly 72mm printable width -> approx 204 points.
    // Length is dynamic based on content.
    final pageFormat = PdfPageFormat.roll80;

    pdf.addPage(
      pw.Page(
        pageFormat: pageFormat,
        build: (pw.Context context) {
          return pw.Column(
            crossAxisAlignment: pw.CrossAxisAlignment.center,
            children: [
              pw.Text('DUBAY ERP', style: pw.TextStyle(fontSize: 18, fontWeight: pw.FontWeight.bold)),
              pw.SizedBox(height: 4),
              pw.Text('123 Main Street, City', style: const pw.TextStyle(fontSize: 10)),
              pw.Text('Tel: +1234567890', style: const pw.TextStyle(fontSize: 10)),
              pw.Divider(borderStyle: pw.BorderStyle.dashed),
              pw.SizedBox(height: 8),

              // Order Details
              pw.Row(
                mainAxisAlignment: pw.MainAxisAlignment.spaceBetween,
                children: [
                  pw.Text('Order: #${order['id']?.toString().substring(0, 6) ?? 'N/A'}', style: const pw.TextStyle(fontSize: 10)),
                  pw.Text(DateFormat('MM/dd/yy HH:mm').format(DateTime.parse(order['createdAt'] ?? DateTime.now().toIso8601String())), style: const pw.TextStyle(fontSize: 10)),
                ],
              ),
              pw.Row(
                mainAxisAlignment: pw.MainAxisAlignment.spaceBetween,
                children: [
                  pw.Text('Type: ${order['type'] ?? 'Dine-In'}', style: const pw.TextStyle(fontSize: 10)),
                  pw.Text('Cashier: Admin', style: const pw.TextStyle(fontSize: 10)),
                ],
              ),
              pw.SizedBox(height: 8),
              pw.Divider(borderStyle: pw.BorderStyle.dashed),
              pw.SizedBox(height: 8),

              // Items
              pw.Row(
                mainAxisAlignment: pw.MainAxisAlignment.spaceBetween,
                children: [
                  pw.Expanded(flex: 3, child: pw.Text('Item', style: pw.TextStyle(fontSize: 10, fontWeight: pw.FontWeight.bold))),
                  pw.Expanded(flex: 1, child: pw.Text('Qty', textAlign: pw.TextAlign.center, style: pw.TextStyle(fontSize: 10, fontWeight: pw.FontWeight.bold))),
                  pw.Expanded(flex: 1, child: pw.Text('Price', textAlign: pw.TextAlign.right, style: pw.TextStyle(fontSize: 10, fontWeight: pw.FontWeight.bold))),
                ],
              ),
              pw.SizedBox(height: 4),
              if (order['items'] != null)
                ...(order['items'] as List).map((item) {
                  return pw.Padding(
                    padding: const pw.EdgeInsets.only(bottom: 4),
                    child: pw.Row(
                      mainAxisAlignment: pw.MainAxisAlignment.spaceBetween,
                      crossAxisAlignment: pw.CrossAxisAlignment.start,
                      children: [
                        pw.Expanded(
                          flex: 3,
                          child: pw.Text(item['product']?['name'] ?? 'Unknown', style: const pw.TextStyle(fontSize: 10)),
                        ),
                        pw.Expanded(
                          flex: 1,
                          child: pw.Text('${item['quantity'] ?? 1}', textAlign: pw.TextAlign.center, style: const pw.TextStyle(fontSize: 10)),
                        ),
                        pw.Expanded(
                          flex: 1,
                          child: pw.Text('${((item['price'] ?? 0) * (item['quantity'] ?? 1)).toStringAsFixed(2)}', textAlign: pw.TextAlign.right, style: const pw.TextStyle(fontSize: 10)),
                        ),
                      ],
                    ),
                  );
                }),

              pw.SizedBox(height: 8),
              pw.Divider(borderStyle: pw.BorderStyle.dashed),
              pw.SizedBox(height: 8),

              // Totals
              pw.Row(
                mainAxisAlignment: pw.MainAxisAlignment.spaceBetween,
                children: [
                  pw.Text('Subtotal', style: const pw.TextStyle(fontSize: 10)),
                  pw.Text('${(order['subtotal'] ?? 0).toStringAsFixed(2)}', style: const pw.TextStyle(fontSize: 10)),
                ],
              ),
              pw.Row(
                mainAxisAlignment: pw.MainAxisAlignment.spaceBetween,
                children: [
                  pw.Text('Discount', style: const pw.TextStyle(fontSize: 10)),
                  pw.Text('${(order['discount'] ?? 0).toStringAsFixed(2)}', style: const pw.TextStyle(fontSize: 10)),
                ],
              ),
              pw.Row(
                mainAxisAlignment: pw.MainAxisAlignment.spaceBetween,
                children: [
                  pw.Text('Tax', style: const pw.TextStyle(fontSize: 10)),
                  pw.Text('${(order['tax'] ?? 0).toStringAsFixed(2)}', style: const pw.TextStyle(fontSize: 10)),
                ],
              ),
              pw.SizedBox(height: 4),
              pw.Row(
                mainAxisAlignment: pw.MainAxisAlignment.spaceBetween,
                children: [
                  pw.Text('TOTAL', style: pw.TextStyle(fontSize: 14, fontWeight: pw.FontWeight.bold)),
                  pw.Text(AppCurrency.format((order['total'] ?? 0)), style: pw.TextStyle(fontSize: 14, fontWeight: pw.FontWeight.bold)),
                ],
              ),

              pw.SizedBox(height: 16),
              pw.Text('Thank you for dining with us!', style: const pw.TextStyle(fontSize: 10)),
              pw.Text('Powered by Antigravity POS', style: const pw.TextStyle(fontSize: 8)),
              pw.SizedBox(height: 20),
            ],
          );
        },
      ),
    );

    await Printing.layoutPdf(
      onLayout: (PdfPageFormat format) async => pdf.save(),
      name: 'Receipt_${order['id'] ?? 'Unknown'}',
    );
  }
}
