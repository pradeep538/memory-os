import 'package:flutter/material.dart';
import 'api_client.dart';
import '../models/routine.dart';

/// Service for managing routine schedules
class RoutineService {
  final ApiClient _client;

  RoutineService(this._client);

  /// Get all user routines
  Future<List<Routine>> getRoutines() async {
    final response = await _client.get('/routines');

    if (response.success) {
      final routines = (response.data['routines'] as List)
          .map((json) => Routine.fromJson(json as Map<String, dynamic>))
          .toList();
      return routines;
    } else {
      throw Exception(response.error ?? 'Failed to fetch routines');
    }
  }

  /// Create new routine
  Future<Routine> createRoutine({
    required String routineName,
    required String routineType,
    String? description,
    required List<TimeOfDay> times,
    required List<int> days,
    String? notificationTitle,
    String? notificationBody,
  }) async {
    final scheduleTimes = times
        .map(
          (t) =>
              '${t.hour.toString().padLeft(2, '0')}:${t.minute.toString().padLeft(2, '0')}',
        )
        .toList();

    final response = await _client.post(
      '/routines',
      body: {
        'routineName': routineName,
        'routineType': routineType,
        'description': description,
        'scheduleTimes': scheduleTimes,
        'scheduleDays': days,
        'frequency': days.length == 7 ? 'daily' : 'custom',
        'notificationTitle': notificationTitle ?? 'Time for $routineName',
        'notificationBody': notificationBody ?? 'Reminder: $routineName',
      },
    );

    if (response.success) {
      return Routine.fromJson(response.data['routine'] as Map<String, dynamic>);
    } else {
      throw Exception(response.error ?? 'Failed to create routine');
    }
  }

  /// Update routine
  Future<Routine> updateRoutine(String id, Map<String, dynamic> updates) async {
    final response = await _client.put('/routines/$id', body: updates);

    if (response.success) {
      return Routine.fromJson(response.data['routine'] as Map<String, dynamic>);
    } else {
      throw Exception(response.error ?? 'Failed to update routine');
    }
  }

  /// Delete routine
  Future<void> deleteRoutine(String id) async {
    final response = await _client.delete('/routines/$id');

    if (!response.success) {
      throw Exception(response.error ?? 'Failed to delete routine');
    }
  }

  /// Toggle notification for routine
  Future<Routine> toggleNotification(String id) async {
    final response = await _client.patch('/routines/$id/toggle');

    if (response.success) {
      return Routine.fromJson(response.data['routine'] as Map<String, dynamic>);
    } else {
      throw Exception(response.error ?? 'Failed to toggle notification');
    }
  }
}
