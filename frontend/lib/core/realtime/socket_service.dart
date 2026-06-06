import 'package:socket_io_client/socket_io_client.dart' as IO;
import 'package:flutter/foundation.dart';

class SocketService {
  late IO.Socket _socket;
  static final SocketService _instance = SocketService._internal();

  factory SocketService() {
    return _instance;
  }

  SocketService._internal();

  void connect(String token) {
    const String url = String.fromEnvironment('API_URL', defaultValue: 'http://10.0.2.2:3000');

    _socket = IO.io(url, <String, dynamic>{
      'transports': ['websocket'],
      'autoConnect': true,
      'auth': {'token': token},
    });

    _socket.onConnect((_) {
      debugPrint('[Real-Time] Connected to ERP Backend: ${_socket.id}');
    });

    _socket.onDisconnect((_) {
      debugPrint('[Real-Time] Disconnected');
    });

    _socket.onConnectError((err) {
      debugPrint('[Real-Time] Connection Error: $err');
    });
  }

  void disconnect() {
    _socket.disconnect();
  }

  void emit(String event, dynamic data) {
    if (_socket.connected) {
      _socket.emit(event, data);
    } else {
      // Future Enhancement: Add to local SQLite/Hive queue for Offline Sync
      debugPrint('[Real-Time] Offline. Cannot emit $event');
    }
  }

  void on(String event, Function(dynamic) callback) {
    _socket.on(event, callback);
  }

  void off(String event) {
    _socket.off(event);
  }
}

final socketService = SocketService();
