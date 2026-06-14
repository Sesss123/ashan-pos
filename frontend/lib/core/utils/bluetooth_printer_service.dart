import 'dart:async';
import 'package:flutter/foundation.dart';

class BluetoothPrinter {
  final String id;
  final String name;
  final String address;
  final bool isConnected;

  BluetoothPrinter({
    required this.id,
    required this.name,
    required this.address,
    this.isConnected = false,
  });

  BluetoothPrinter copyWith({bool? isConnected}) {
    return BluetoothPrinter(
      id: id,
      name: name,
      address: address,
      isConnected: isConnected ?? this.isConnected,
    );
  }
}

class BluetoothPrinterService {
  // Singleton pattern
  BluetoothPrinterService._internal();
  static final BluetoothPrinterService instance = BluetoothPrinterService._internal();

  factory BluetoothPrinterService() => instance;

  final ValueNotifier<List<BluetoothPrinter>> discoveredPrinters = ValueNotifier([]);
  final ValueNotifier<BluetoothPrinter?> connectedPrinter = ValueNotifier(null);
  final ValueNotifier<bool> isScanning = ValueNotifier(false);

  // Notifier to trigger the on-screen simulated receipt dialog in the UI
  final ValueNotifier<Map<String, dynamic>?> printSimulationTrigger = ValueNotifier(null);

  Future<void> startScan() async {
    if (isScanning.value) return;
    isScanning.value = true;
    discoveredPrinters.value = [];

    // Simulate scanning discovery delay
    await Future.delayed(const Duration(seconds: 1));
    discoveredPrinters.value = [
      BluetoothPrinter(id: '1', name: 'XP-80 Thermal Printer', address: '00:11:22:33:44:55'),
      BluetoothPrinter(id: '2', name: 'Star POS Printer', address: 'AA:BB:CC:DD:EE:FF'),
      BluetoothPrinter(id: '3', name: 'Mobile Mini Printer', address: '12:34:56:78:90:AB'),
    ];
    isScanning.value = false;
  }

  Future<void> stopScan() async {
    isScanning.value = false;
  }

  Future<bool> connect(BluetoothPrinter printer) async {
    // Simulate connection delay
    await Future.delayed(const Duration(milliseconds: 500));
    final connected = printer.copyWith(isConnected: true);
    connectedPrinter.value = connected;

    // Update list to show connected state
    discoveredPrinters.value = discoveredPrinters.value.map((p) {
      if (p.id == printer.id) return connected;
      return p.copyWith(isConnected: false);
    }).toList();

    return true;
  }

  Future<void> disconnect() async {
    if (connectedPrinter.value == null) return;
    
    // Update list to reset connected state
    discoveredPrinters.value = discoveredPrinters.value.map((p) {
      return p.copyWith(isConnected: false);
    }).toList();

    connectedPrinter.value = null;
  }

  Future<void> printReceipt(Map<String, dynamic> orderJson) async {
    // Forward the print job data to the on-screen simulation listener
    printSimulationTrigger.value = orderJson;
    
    // Reset trigger immediately so the same order can be reprinted
    Future.microtask(() {
      printSimulationTrigger.value = null;
    });
  }
}
