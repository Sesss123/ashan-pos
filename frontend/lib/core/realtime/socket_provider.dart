import 'package:flutter_riverpod/flutter_riverpod.dart';
import 'socket_service.dart';

final socketServiceProvider = Provider<SocketService>((ref) {
  final service = SocketService();
  
  ref.onDispose(() {
    service.disconnect();
  });
  
  return service;
});

// Example Provider to listen to live Kitchen Updates
final liveKitchenQueueProvider = StreamProvider<dynamic>((ref) {
  final socket = ref.watch(socketServiceProvider);
  // Implementation will push events to a StreamController
  // which this provider yields.
  return const Stream.empty();
});
