import 'package:socket_io_client/socket_io_client.dart' as socket_io;
import 'package:flutter/foundation.dart';
import 'package:shared_preferences/shared_preferences.dart';
import 'package:flutter_dotenv/flutter_dotenv.dart';
import 'dart:convert';

class SocketService {
  socket_io.Socket? _socket;
  static final SocketService _instance = SocketService._internal();
  final Map<String, List<Function(dynamic)>> _listeners = {};

  factory SocketService() {
    return _instance;
  }

  SocketService._internal();

  void connect(String token) {
    final String url = dotenv.env['SOCKET_URL'] ?? 'http://127.0.0.1:5000';

    _socket?.disconnect();
    _socket?.dispose();

    _socket = socket_io.io(url, <String, dynamic>{
      'transports': ['websocket', 'polling'],
      'autoConnect': true,
      'auth': {'token': token},
    });

    _socket!.onConnect((_) {
      debugPrint('[Real-Time] Connected to ERP Backend: ${_socket!.id}');
      _syncOfflineQueue();
    });

    _socket!.onDisconnect((_) {
      debugPrint('[Real-Time] Disconnected');
    });

    _socket!.onConnectError((err) {
      debugPrint('[Real-Time] Connection Error: $err');
    });

    // Re-attach all saved listeners to the new socket instance
    _listeners.forEach((event, callbacks) {
      for (var cb in callbacks) {
        _socket!.on(event, cb);
      }
    });
  }

  Future<void> _syncOfflineQueue() async {
    if (_socket == null) return;
    
    final prefs = await SharedPreferences.getInstance();
    List<String> queue = prefs.getStringList('offline_socket_queue') ?? [];
    
    if (queue.isEmpty) return;

    debugPrint('[Real-Time] Syncing ${queue.length} offline events...');
    for (String item in queue) {
      final decoded = jsonDecode(item);
      _socket!.emit(decoded['event'], decoded['data']);
    }
    
    // Clear queue after syncing
    await prefs.remove('offline_socket_queue');
    debugPrint('[Real-Time] Offline sync completed.');
  }

  void disconnect() {
    _socket?.disconnect();
  }

  void emit(String event, dynamic data) async {
    if (_socket != null && _socket!.connected) {
      _socket!.emit(event, data);
    } else {
      debugPrint('[Real-Time] Offline. Queuing event: $event');
      final prefs = await SharedPreferences.getInstance();
      List<String> queue = prefs.getStringList('offline_socket_queue') ?? [];
      queue.add(jsonEncode({'event': event, 'data': data}));
      await prefs.setStringList('offline_socket_queue', queue);
    }
  }

  void on(String event, Function(dynamic) callback) {
    if (!_listeners.containsKey(event)) {
      _listeners[event] = [];
    }
    _listeners[event]!.add(callback);
    _socket?.on(event, callback);
  }

  void off(String event) {
    _listeners.remove(event);
    _socket?.off(event);
  }
}

final socketService = SocketService();
