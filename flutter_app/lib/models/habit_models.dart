/// Habit model
class Habit {
  final String id;
  final String habitName;
  final String habitType; // 'build' or 'quit'
  final String category;
  final int targetFrequency;
  final String targetFrequencyUnit;
  final String status; // active, paused, completed, abandoned
  final int currentStreak;
  final int longestStreak;
  final double completionRate;
  final bool reminderEnabled;
  final String? reminderTime;
  final List<int>? reminderDays;
  final DateTime createdAt;
  final DateTime? updatedAt;
  final bool isCompletedToday;

  Habit({
    required this.id,
    required this.habitName,
    required this.habitType,
    required this.category,
    required this.targetFrequency,
    required this.targetFrequencyUnit,
    required this.status,
    required this.currentStreak,
    required this.longestStreak,
    required this.completionRate,
    required this.reminderEnabled,
    this.reminderTime,
    this.reminderDays,
    required this.createdAt,
    this.updatedAt,
    this.isCompletedToday = false,
  });

  factory Habit.fromJson(Map<String, dynamic> json) {
    return Habit(
      id: json['id'] ?? '',
      habitName: json['habit_name'] ?? json['habitName'] ?? '',
      habitType: json['habit_type'] ?? json['habitType'] ?? 'build',
      category: json['category'] ?? 'generic',
      targetFrequency: json['target_frequency'] ?? json['targetFrequency'] ?? 1,
      targetFrequencyUnit:
          json['target_frequency_unit'] ?? json['targetFrequencyUnit'] ?? 'day',
      status: json['status'] ?? 'active',
      currentStreak: json['current_streak'] ?? json['currentStreak'] ?? 0,
      longestStreak: json['longest_streak'] ?? json['longestStreak'] ?? 0,
      completionRate: json['completion_rate'] is String
          ? double.tryParse(json['completion_rate']) ?? 0.0
          : (json['completion_rate'] ?? json['completionRate'] ?? 0.0)
              .toDouble(),
      reminderEnabled:
          json['reminder_enabled'] ?? json['reminderEnabled'] ?? false,
      reminderTime: json['reminder_time'] ?? json['reminderTime'],
      reminderDays: json['reminder_days'] != null
          ? List<int>.from(json['reminder_days'])
          : null,
      createdAt: json['created_at'] != null
          ? DateTime.parse(json['created_at'])
          : DateTime.now(),
      updatedAt: json['updated_at'] != null
          ? DateTime.parse(json['updated_at'])
          : null,
      isCompletedToday:
          json['is_completed_today'] ?? json['isCompletedToday'] ?? false,
    );
  }

  bool get isActive => status == 'active';
  bool get isBuildHabit => habitType == 'build';
  String get frequencyText => '$targetFrequency times per $targetFrequencyUnit';
}

/// Habit progress data
class HabitProgress {
  final String habitId;
  final int currentStreak;
  final int longestStreak;
  final double completionRate;
  final int totalCompletions;
  final int totalMissed;
  final List<HabitHistoryItem> history;

  HabitProgress({
    required this.habitId,
    required this.currentStreak,
    required this.longestStreak,
    required this.completionRate,
    required this.totalCompletions,
    required this.totalMissed,
    required this.history,
  });

  factory HabitProgress.fromJson(Map<String, dynamic> json) {
    return HabitProgress(
      habitId: json['habit_id'] ?? json['habitId'] ?? '',
      currentStreak: json['current_streak'] ?? json['currentStreak'] ?? 0,
      longestStreak: json['longest_streak'] ?? json['longestStreak'] ?? 0,
      completionRate:
          (json['completion_rate'] ?? json['completionRate'] ?? 0.0).toDouble(),
      totalCompletions:
          json['total_completions'] ?? json['totalCompletions'] ?? 0,
      totalMissed: json['total_missed'] ?? json['totalMissed'] ?? 0,
      history: (json['history'] as List?)
              ?.map((e) => HabitHistoryItem.fromJson(e))
              .toList() ??
          [],
    );
  }
}

/// Single history item for habit
class HabitHistoryItem {
  final DateTime date;
  final bool completed;
  final String? notes;

  HabitHistoryItem({required this.date, required this.completed, this.notes});

  factory HabitHistoryItem.fromJson(Map<String, dynamic> json) {
    return HabitHistoryItem(
      date: DateTime.parse(json['date'] ?? json['completion_date']),
      completed: json['completed'] ?? false,
      notes: json['notes'],
    );
  }
}

/// Habit completion result
class HabitCompletion {
  final String id;
  final String habitId;
  final bool completed;
  final DateTime completionDate;
  final String? notes;
  final int newStreak;

  HabitCompletion({
    required this.id,
    required this.habitId,
    required this.completed,
    required this.completionDate,
    this.notes,
    required this.newStreak,
  });

  factory HabitCompletion.fromJson(Map<String, dynamic> json) {
    return HabitCompletion(
      id: json['id'] ?? '',
      habitId: json['habit_id'] ?? json['habitId'] ?? '',
      completed: json['completed'] ?? false,
      completionDate: json['completion_date'] != null
          ? DateTime.parse(json['completion_date'])
          : DateTime.now(),
      notes: json['notes'],
      newStreak: json['new_streak'] ?? json['newStreak'] ?? 0,
    );
  }
}

/// AI-generated habit suggestion
class HabitSuggestion {
  final String habitName;
  final String habitType;
  final String category;
  final String reason;
  final int suggestedFrequency;
  final String suggestedFrequencyUnit;

  HabitSuggestion({
    required this.habitName,
    required this.habitType,
    required this.category,
    required this.reason,
    required this.suggestedFrequency,
    required this.suggestedFrequencyUnit,
  });

  factory HabitSuggestion.fromJson(Map<String, dynamic> json) {
    return HabitSuggestion(
      habitName: json['habit_name'] ?? json['habitName'] ?? '',
      habitType: json['habit_type'] ?? json['habitType'] ?? 'build',
      category: json['category'] ?? 'generic',
      reason: json['reason'] ?? '',
      suggestedFrequency:
          json['suggested_frequency'] ?? json['suggestedFrequency'] ?? 1,
      suggestedFrequencyUnit: json['suggested_frequency_unit'] ??
          json['suggestedFrequencyUnit'] ??
          'day',
    );
  }
}
