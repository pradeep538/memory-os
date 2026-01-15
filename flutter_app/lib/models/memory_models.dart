import 'input_models.dart';

export 'input_models.dart' show Memory;

/// Memory with additional display helpers
extension MemoryDisplay on Memory {
  /// Get formatted time string
  String get timeAgo {
    final now = DateTime.now();
    final diff = now.difference(createdAt);

    if (diff.inMinutes < 1) return 'Just now';
    if (diff.inMinutes < 60) return '${diff.inMinutes}m ago';
    if (diff.inHours < 24) return '${diff.inHours}h ago';
    if (diff.inDays < 7) return '${diff.inDays}d ago';
    return '${createdAt.day}/${createdAt.month}';
  }

  /// Get duration from normalized data if available
  int? get durationMinutes {
    final data = normalizedData;
    if (data.containsKey('duration_minutes')) {
      return data['duration_minutes'] as int?;
    }
    if (data.containsKey('duration')) {
      return data['duration'] as int?;
    }
    return null;
  }

  /// Get amount from normalized data if available
  double? get amount {
    final data = normalizedData;
    if (data.containsKey('amount')) {
      final val = data['amount'];
      if (val is num) return val.toDouble();
    }
    return null;
  }

  /// Get activity type from normalized data
  String? get activityType {
    final data = normalizedData;
    return data['activity_type'] as String? ??
        data['workout_type'] as String? ??
        data['activity'] as String?;
  }
}
