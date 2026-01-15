/// App notification model
class AppNotification {
  final String id;
  final String type; // reminder, insight, alert, summary
  final String title;
  final String? teaser;
  final String? fullContent;
  final String status; // pending, sent, read
  final bool isRevealed;
  final DateTime? scheduledFor;
  final DateTime createdAt;

  AppNotification({
    required this.id,
    required this.type,
    required this.title,
    this.teaser,
    this.fullContent,
    required this.status,
    required this.isRevealed,
    this.scheduledFor,
    required this.createdAt,
  });

  factory AppNotification.fromJson(Map<String, dynamic> json) {
    return AppNotification(
      id: json['id'] ?? '',
      type: json['notification_type'] ?? json['notificationType'] ?? json['type'] ?? 'insight',
      title: json['title'] ?? '',
      teaser: json['teaser'] ?? json['preview'],
      fullContent: json['full_content'] ?? json['fullContent'] ?? json['content'],
      status: json['status'] ?? 'sent',
      isRevealed: json['is_revealed'] ?? json['isRevealed'] ?? false,
      scheduledFor: json['scheduled_for'] != null
          ? DateTime.parse(json['scheduled_for'])
          : null,
      createdAt: json['created_at'] != null
          ? DateTime.parse(json['created_at'])
          : DateTime.now(),
    );
  }

  String get displayContent => isRevealed ? (fullContent ?? teaser ?? '') : (teaser ?? title);

  String get typeIcon {
    switch (type) {
      case 'insight':
        return '💡';
      case 'reminder':
        return '⏰';
      case 'alert':
        return '⚠️';
      case 'summary':
        return '📊';
      default:
        return '📌';
    }
  }
}

/// Notification reveal result
class NotificationReveal {
  final String notificationId;
  final String fullContent;
  final String? category;
  final Map<String, dynamic>? metadata;

  NotificationReveal({
    required this.notificationId,
    required this.fullContent,
    this.category,
    this.metadata,
  });

  factory NotificationReveal.fromJson(Map<String, dynamic> json) {
    return NotificationReveal(
      notificationId: json['notification_id'] ?? json['notificationId'] ?? json['id'] ?? '',
      fullContent: json['full_content'] ?? json['fullContent'] ?? json['content'] ?? '',
      category: json['category'],
      metadata: json['metadata'] as Map<String, dynamic>?,
    );
  }
}
