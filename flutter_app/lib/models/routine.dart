class Routine {
  final String id;
  final String routineName;
  final String routineType;
  final String? description;
  final List<String> scheduleTimes;
  final List<int> scheduleDays;
  final String frequency;
  final bool notificationEnabled;
  final String? notificationTitle;
  final String? notificationBody;
  final DateTime? lastNotificationSent;
  final DateTime createdAt;

  Routine({
    required this.id,
    required this.routineName,
    required this.routineType,
    this.description,
    required this.scheduleTimes,
    required this.scheduleDays,
    required this.frequency,
    required this.notificationEnabled,
    this.notificationTitle,
    this.notificationBody,
    this.lastNotificationSent,
    required this.createdAt,
  });

  factory Routine.fromJson(Map<String, dynamic> json) {
    return Routine(
      id: json['id'] as String,
      routineName: json['routine_name'] as String,
      routineType: json['routine_type'] as String,
      description: json['description'] as String?,
      scheduleTimes: List<String>.from(json['schedule_times'] as List),
      scheduleDays: List<int>.from(json['schedule_days'] as List),
      frequency: json['frequency'] as String,
      notificationEnabled: json['notification_enabled'] as bool,
      notificationTitle: json['notification_title'] as String?,
      notificationBody: json['notification_body'] as String?,
      lastNotificationSent: json['last_notification_sent'] != null
          ? DateTime.parse(json['last_notification_sent'] as String)
          : null,
      createdAt: DateTime.parse(json['created_at'] as String),
    );
  }

  Map<String, dynamic> toJson() {
    return {
      'routine_name': routineName,
      'routine_type': routineType,
      'description': description,
      'schedule_times': scheduleTimes,
      'schedule_days': scheduleDays,
      'frequency': frequency,
      'notification_enabled': notificationEnabled,
      'notification_title': notificationTitle,
      'notification_body': notificationBody,
    };
  }

  String getScheduleDisplay() {
    if (frequency == 'daily') {
      return 'Daily at ${scheduleTimes.join(", ")}';
    } else if (scheduleDays.length == 7) {
      return 'Every day at ${scheduleTimes.join(", ")}';
    } else {
      final days = scheduleDays.map((d) => _getDayName(d)).join(', ');
      return '$days at ${scheduleTimes.join(", ")}';
    }
  }

  String _getDayName(int day) {
    const days = ['Mon', 'Tue', 'Wed', 'Thu', 'Fri', 'Sat', 'Sun'];
    return days[day - 1];
  }

  String get icon {
    switch (routineType) {
      case 'medication':
        return '💊';
      case 'plant_care':
        return '🌱';
      case 'maintenance':
        return '🔧';
      default:
        return '📋';
    }
  }
}
