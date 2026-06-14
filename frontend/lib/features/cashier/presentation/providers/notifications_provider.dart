import 'package:flutter_riverpod/flutter_riverpod.dart';
import '../../../../core/realtime/socket_provider.dart';

class NotificationModel {
  final String id;
  final String title;
  final String message;
  final DateTime createdAt;
  bool isRead;

  NotificationModel({
    required this.id,
    required this.title,
    required this.message,
    required this.createdAt,
    this.isRead = false,
  });
}

class NotificationsNotifier extends Notifier<List<NotificationModel>> {
  @override
  List<NotificationModel> build() {
    final socket = ref.watch(socketServiceProvider);
    
    socket.on('notification.created', (data) {
      final title = data['title'] ?? 'New Notification';
      final message = data['message'] ?? 'You have a new message.';
      
      state = [
        NotificationModel(
          id: DateTime.now().millisecondsSinceEpoch.toString(),
          title: title,
          message: message,
          createdAt: DateTime.now(),
        ),
        ...state,
      ];
    });

    socket.on('kitchen.order_ready', (data) {
      final orderId = data['orderId'] ?? 'Unknown';
      state = [
        NotificationModel(
          id: DateTime.now().millisecondsSinceEpoch.toString(),
          title: 'Order Ready',
          message: 'Order #$orderId is ready to be served.',
          createdAt: DateTime.now(),
        ),
        ...state,
      ];
    });
    
    return [];
  }

  void markAllAsRead() {
    state = state.map((n) {
      n.isRead = true;
      return n;
    }).toList();
  }
}

final notificationsProvider = NotifierProvider<NotificationsNotifier, List<NotificationModel>>(() {
  return NotificationsNotifier();
});

final unreadNotificationsCountProvider = Provider<int>((ref) {
  final notifications = ref.watch(notificationsProvider);
  return notifications.where((n) => !n.isRead).length;
});
