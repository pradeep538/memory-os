import 'api_client.dart';
import '../models/habit_models.dart';

/// Service for habit management
class HabitsService {
  final ApiClient _client;

  HabitsService(this._client);

  /// Get all habits
  Future<ApiResponse<List<Habit>>> getHabits({String? status}) async {
    final queryParams = <String, dynamic>{};
    if (status != null) queryParams['status'] = status;

    return _client.get<List<Habit>>(
      '/habits',
      queryParams: queryParams,
      fromJson: (json) => (json as List).map((e) => Habit.fromJson(e)).toList(),
    );
  }

  /// Get habit by ID
  Future<ApiResponse<Habit>> getHabit(String id) async {
    return _client.get<Habit>(
      '/habits/$id',
      fromJson: (json) => Habit.fromJson(json),
    );
  }

  /// Get habit progress
  Future<ApiResponse<HabitProgress>> getHabitProgress(String id) async {
    return _client.get<HabitProgress>(
      '/habits/$id/progress',
      fromJson: (json) => HabitProgress.fromJson(json),
    );
  }

  /// Create new habit
  Future<ApiResponse<Habit>> createHabit({
    required String habitName,
    required String habitType,
    required String category,
    required int targetFrequency,
    required String targetFrequencyUnit,
    String? reminderTime,
    List<int>? reminderDays,
  }) async {
    return _client.post<Habit>(
      '/habits',
      body: {
        'habit_name': habitName,
        'habit_type': habitType,
        'category': category,
        'target_frequency': targetFrequency,
        'target_frequency_unit': targetFrequencyUnit,
        if (reminderTime != null) 'reminder_time': reminderTime,
        if (reminderDays != null) 'reminder_days': reminderDays,
      },
      fromJson: (json) => Habit.fromJson(json),
    );
  }

  /// Update habit
  Future<ApiResponse<Habit>> updateHabit(
    String id, {
    String? habitName,
    String? status,
    int? targetFrequency,
    String? targetFrequencyUnit,
    bool? reminderEnabled,
    String? reminderTime,
    List<int>? reminderDays,
  }) async {
    return _client.patch<Habit>(
      '/habits/$id',
      body: {
        if (habitName != null) 'habit_name': habitName,
        if (status != null) 'status': status,
        if (targetFrequency != null) 'target_frequency': targetFrequency,
        if (targetFrequencyUnit != null) 'target_frequency_unit': targetFrequencyUnit,
        if (reminderEnabled != null) 'reminder_enabled': reminderEnabled,
        if (reminderTime != null) 'reminder_time': reminderTime,
        if (reminderDays != null) 'reminder_days': reminderDays,
      },
      fromJson: (json) => Habit.fromJson(json),
    );
  }

  /// Delete habit
  Future<ApiResponse<void>> deleteHabit(String id) async {
    return _client.delete('/habits/$id');
  }

  /// Log habit completion
  Future<ApiResponse<HabitCompletion>> completeHabit(
    String id, {
    required bool completed,
    String? notes,
  }) async {
    return _client.post<HabitCompletion>(
      '/habits/$id/complete',
      body: {
        'completed': completed,
        if (notes != null) 'notes': notes,
      },
      fromJson: (json) => HabitCompletion.fromJson(json),
    );
  }

  /// Get habit suggestions based on patterns
  Future<ApiResponse<List<HabitSuggestion>>> getSuggestions() async {
    return _client.get<List<HabitSuggestion>>(
      '/habits/suggestions',
      fromJson: (json) =>
          (json as List).map((e) => HabitSuggestion.fromJson(e)).toList(),
    );
  }
}
