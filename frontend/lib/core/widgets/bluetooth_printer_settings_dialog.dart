import 'package:flutter/material.dart';
import 'package:google_fonts/google_fonts.dart';
import '../utils/bluetooth_printer_service.dart';

class BluetoothPrinterSettingsDialog extends StatefulWidget {
  const BluetoothPrinterSettingsDialog({super.key});

  static void show(BuildContext context) {
    showDialog(
      context: context,
      barrierColor: Colors.black.withValues(alpha: 0.5),
      builder: (context) => const BluetoothPrinterSettingsDialog(),
    );
  }

  @override
  State<BluetoothPrinterSettingsDialog> createState() => _BluetoothPrinterSettingsDialogState();
}

class _BluetoothPrinterSettingsDialogState extends State<BluetoothPrinterSettingsDialog> {
  final BluetoothPrinterService _service = BluetoothPrinterService.instance;

  @override
  void initState() {
    super.initState();
    _service.startScan();
  }

  @override
  Widget build(BuildContext context) {
    return Dialog(
      backgroundColor: Colors.transparent,
      child: Container(
        width: 400,
        decoration: BoxDecoration(
          color: Theme.of(context).cardTheme.color ?? Theme.of(context).colorScheme.surface,
          borderRadius: BorderRadius.circular(28),
          border: Border.all(color: Theme.of(context).dividerColor),
          boxShadow: [
            BoxShadow(
              color: Colors.black.withValues(alpha: 0.3),
              blurRadius: 30,
              offset: const Offset(0, 15),
            ),
          ],
        ),
        child: Padding(
          padding: const EdgeInsets.all(28),
          child: Column(
            mainAxisSize: MainAxisSize.min,
            crossAxisAlignment: CrossAxisAlignment.stretch,
            children: [
              // Title
              Row(
                mainAxisAlignment: MainAxisAlignment.spaceBetween,
                children: [
                  Row(
                    children: [
                      Icon(Icons.bluetooth, color: Theme.of(context).colorScheme.primary, size: 28),
                      const SizedBox(width: 12),
                      Text(
                        'Bluetooth Printers',
                        style: GoogleFonts.inter(
                          fontSize: 20,
                          fontWeight: FontWeight.w800,
                        ),
                      ),
                    ],
                  ),
                  IconButton(
                    icon: const Icon(Icons.close),
                    onPressed: () => Navigator.pop(context),
                  ),
                ],
              ),
              const SizedBox(height: 20),

              // Scanning indicators
              ValueListenableBuilder<bool>(
                valueListenable: _service.isScanning,
                builder: (context, isScanning, _) {
                  return Row(
                    mainAxisAlignment: MainAxisAlignment.spaceBetween,
                    children: [
                      Text(
                        isScanning ? 'Searching for devices...' : 'Paired & Discovered Devices',
                        style: GoogleFonts.inter(
                          fontSize: 14,
                          fontWeight: FontWeight.w600,
                          color: Theme.of(context).textTheme.bodyMedium?.color?.withValues(alpha: 0.6),
                        ),
                      ),
                      if (isScanning)
                        const SizedBox(
                          width: 16,
                          height: 16,
                          child: CircularProgressIndicator(strokeWidth: 2.5),
                        )
                      else
                        TextButton.icon(
                          onPressed: _service.startScan,
                          icon: const Icon(Icons.refresh, size: 16),
                          label: const Text('Scan'),
                          style: TextButton.styleFrom(
                            padding: const EdgeInsets.symmetric(horizontal: 12, vertical: 8),
                            textStyle: GoogleFonts.inter(fontWeight: FontWeight.w700),
                          ),
                        ),
                    ],
                  );
                },
              ),
              const SizedBox(height: 16),

              // Printer list
              Container(
                height: 200,
                decoration: BoxDecoration(
                  color: Theme.of(context).scaffoldBackgroundColor,
                  borderRadius: BorderRadius.circular(16),
                  border: Border.all(color: Theme.of(context).dividerColor),
                ),
                child: ValueListenableBuilder<List<BluetoothPrinter>>(
                  valueListenable: _service.discoveredPrinters,
                  builder: (context, printers, _) {
                    if (printers.isEmpty) {
                      return ValueListenableBuilder<bool>(
                        valueListenable: _service.isScanning,
                        builder: (context, isScanning, _) {
                          return Center(
                            child: Text(
                              isScanning ? 'Scanning...' : 'No devices found',
                              style: GoogleFonts.inter(
                                color: Theme.of(context).textTheme.bodyMedium?.color?.withValues(alpha: 0.5),
                                fontWeight: FontWeight.w600,
                              ),
                            ),
                          );
                        },
                      );
                    }

                    return ListView.separated(
                      padding: const EdgeInsets.all(8),
                      itemCount: printers.length,
                      separatorBuilder: (_, _) => Divider(color: Theme.of(context).dividerColor, height: 12),
                      itemBuilder: (context, index) {
                        final printer = printers[index];
                        return ListTile(
                          contentPadding: const EdgeInsets.symmetric(horizontal: 12, vertical: 4),
                          leading: CircleAvatar(
                            backgroundColor: printer.isConnected 
                                ? Theme.of(context).colorScheme.primary.withValues(alpha: 0.1) 
                                : Theme.of(context).dividerColor,
                            child: Icon(
                              Icons.print,
                              color: printer.isConnected 
                                  ? Theme.of(context).colorScheme.primary 
                                  : Theme.of(context).textTheme.bodyMedium?.color?.withValues(alpha: 0.6),
                            ),
                          ),
                          title: Text(
                            printer.name,
                            style: GoogleFonts.inter(fontWeight: FontWeight.w700, fontSize: 14),
                          ),
                          subtitle: Text(
                            printer.address,
                            style: GoogleFonts.inter(fontSize: 12, fontWeight: FontWeight.w600),
                          ),
                          trailing: ValueListenableBuilder<BluetoothPrinter?>(
                            valueListenable: _service.connectedPrinter,
                            builder: (context, connected, _) {
                              final isCurrent = connected?.id == printer.id;
                              return ElevatedButton(
                                onPressed: () async {
                                  if (isCurrent) {
                                    await _service.disconnect();
                                  } else {
                                    await _service.connect(printer);
                                  }
                                  setState(() {});
                                },
                                style: ElevatedButton.styleFrom(
                                  backgroundColor: isCurrent 
                                      ? Theme.of(context).colorScheme.error.withValues(alpha: 0.1)
                                      : Theme.of(context).colorScheme.primary,
                                  foregroundColor: isCurrent 
                                      ? Theme.of(context).colorScheme.error 
                                      : Colors.white,
                                  elevation: 0,
                                  padding: const EdgeInsets.symmetric(horizontal: 16, vertical: 8),
                                  shape: RoundedRectangleBorder(borderRadius: BorderRadius.circular(10)),
                                ),
                                child: Text(
                                  isCurrent ? 'Disconnect' : 'Connect',
                                  style: GoogleFonts.inter(fontWeight: FontWeight.w700, fontSize: 13),
                                ),
                              );
                            },
                          ),
                        );
                      },
                    );
                  },
                ),
              ),
              const SizedBox(height: 24),

              // Test print controls
              ValueListenableBuilder<BluetoothPrinter?>(
                valueListenable: _service.connectedPrinter,
                builder: (context, connected, _) {
                  final hasPrinter = connected != null;
                  return Row(
                    children: [
                      Expanded(
                        child: OutlinedButton.icon(
                          onPressed: hasPrinter 
                              ? () {
                                  _service.printReceipt({
                                    'id': 'test-print-123',
                                    'createdAt': DateTime.now().toIso8601String(),
                                    'type': 'Dine-In',
                                    'paymentMethod': 'Cash',
                                    'subtotal': 45.00,
                                    'discount': 5.00,
                                    'tax': 3.20,
                                    'total': 43.20,
                                    'items': [
                                      {
                                        'quantity': 2,
                                        'price': 15.00,
                                        'product': {'name': 'Mock Burger Extra Large'}
                                      },
                                      {
                                        'quantity': 1,
                                        'price': 15.00,
                                        'product': {'name': 'Spicy Pepperoni Pizza Slice'}
                                      }
                                    ]
                                  });
                                }
                              : null,
                          icon: const Icon(Icons.receipt),
                          label: const Text('Test Print'),
                          style: OutlinedButton.styleFrom(
                            padding: const EdgeInsets.symmetric(vertical: 16),
                            shape: RoundedRectangleBorder(borderRadius: BorderRadius.circular(12)),
                            side: BorderSide(
                              color: hasPrinter 
                                  ? Theme.of(context).colorScheme.primary 
                                  : Theme.of(context).dividerColor,
                            ),
                            foregroundColor: hasPrinter ? Theme.of(context).colorScheme.primary : Colors.grey,
                          ),
                        ),
                      ),
                    ],
                  );
                },
              ),
            ],
          ),
        ),
      ),
    );
  }
}
