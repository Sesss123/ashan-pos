import 'dart:async';
import 'package:flutter/foundation.dart';
import 'package:hive/hive.dart';
import 'package:dio/dio.dart';
import 'dio_client.dart'; // Ensure correct import path

class OfflineSyncService {
  static final OfflineSyncService instance = OfflineSyncService._internal();
  OfflineSyncService._internal();

  Timer? _syncTimer;
  bool _isSyncing = false;
  late Box _offlineBox;

  Future<void> initialize() async {
    _offlineBox = Hive.box('offline_orders');
    _startPeriodicSync();
  }

  void _startPeriodicSync() {
    // Attempt sync every 30 seconds
    _syncTimer = Timer.periodic(const Duration(seconds: 30), (_) {
      syncOrders();
    });
  }

  /// Save a failed order to local Hive box
  Future<void> queueFailedOrder(Map<String, dynamic> orderPayload) async {
    final timestamp = DateTime.now().toIso8601String();
    orderPayload['_localTimestamp'] = timestamp;
    await _offlineBox.add(orderPayload);
    debugPrint('[OfflineSyncService] Order queued locally. Total queued: ${_offlineBox.length}');
  }

  /// Attempt to send all locally queued orders to the backend
  Future<void> syncOrders() async {
    if (_isSyncing || _offlineBox.isEmpty) return;

    _isSyncing = true;
    final keysToSync = _offlineBox.keys.toList();

    try {
      // Test connection first using a lightweight request
      // We assume DioClient has a simple health or ping endpoint, or we just try sending
      final dio = DioClient.instance;

      for (var key in keysToSync) {
        final orderPayload = _offlineBox.get(key) as Map<dynamic, dynamic>;
        // Clean payload
        final cleanPayload = Map<String, dynamic>.from(orderPayload);
        cleanPayload.remove('_localTimestamp');

        try {
          final response = await dio.post('/orders', data: cleanPayload);
          if (response.statusCode == 200 || response.statusCode == 201) {
            // Success! Remove from offline queue
            await _offlineBox.delete(key);
            debugPrint('[OfflineSyncService] Successfully synced order key $key');
          }
        } on DioException catch (e) {
          // If it's a 4xx error (e.g. bad request), it might never succeed, but we keep it simple here
          // If it's a network error, stop syncing for now
          if (e.type == DioExceptionType.connectionTimeout || e.type == DioExceptionType.connectionError) {
            debugPrint('[OfflineSyncService] Network still down. Stopping sync.');
            break;
          } else {
             debugPrint('[OfflineSyncService] Order sync failed for key $key: ${e.message}');
          }
        }
      }
    } catch (e) {
      debugPrint('[OfflineSyncService] Error during sync loop: $e');
    } finally {
      _isSyncing = false;
    }
  }

  void dispose() {
    _syncTimer?.cancel();
  }
}
