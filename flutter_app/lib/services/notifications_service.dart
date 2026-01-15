import 'api_client.dart';
import '../models/notification_models.dart';

/// Service for notifications
class NotificationsService {
  final ApiClient _client;

  NotificationsService(this._client);

  /// Get user notifications
  Future<ApiResponse<List<AppNotification>>> getNotifications({
    int limit = 20,
  }) async {
    return _client.get<List<AppNotification>>(
      '/notifications',
      queryParams: {'limit': limit},
      fromJson: (json) =>
          (json as List).map((e) => AppNotification.fromJson(e)).toList(),
    );
  }

  /// Reveal notification insight
  Future<ApiResponse<NotificationReveal>> revealNotification(String id) async {
    return _client.get<NotificationReveal>(
      '/notifications/$id/reveal',
      fromJson: (json) => NotificationReveal.fromJson(json),
    );
  }
}
