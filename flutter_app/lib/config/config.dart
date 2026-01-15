import 'package:flutter/material.dart';
import 'app_colors.dart';

/// Memory OS Configuration
class Config {
  Config._();

  // ============================================================================
  // API CONFIGURATION
  // ============================================================================

  static const String apiBaseUrl = 'http://localhost:3000/api/v1';

  // For emulator/device testing:
  // Android Emulator: 'http://10.0.2.2:3000/api/v1'
  // iOS Simulator: 'http://localhost:3000/api/v1'
  // Real device: 'http://<your-ip>:3000/api/v1'

  static const Duration apiTimeout = Duration(seconds: 30);

  // ============================================================================
  // CONFIDENCE THRESHOLDS
  // ============================================================================

  /// Confidence threshold for auto-processing
  static const double confidenceThreshold = 0.8;

  /// Confidence threshold for showing suggestions
  static const double lowConfidenceThreshold = 0.4;

  // ============================================================================
  // VOICE RECORDING
  // ============================================================================

  /// Default recording duration in seconds
  static const int defaultRecordingDuration = 6;

  /// Available recording durations
  static const List<int> recordingDurations = [3, 6, 10, 15, 30, 60];

  /// Max audio file size in bytes (500KB)
  static const int maxAudioFileSize = 500 * 1024;

  // ============================================================================
  // MARQUEE CONFIGURATION
  // ============================================================================

  /// Marquee rotation interval
  static const Duration marqueeInterval = Duration(seconds: 3);

  // ============================================================================
  // UI CONFIGURATION
  // ============================================================================

  /// Success toast duration
  static const Duration successToastDuration = Duration(seconds: 3);

  /// Max widgets to display in feed
  static const int maxFeedWidgets = 20;

  // ============================================================================
  // CACHE DURATIONS
  // ============================================================================

  static const Duration insightsCacheDuration = Duration(hours: 24);
  static const Duration engagementCacheDuration = Duration(minutes: 5);
}

/// App Categories (matching backend)
enum AppCategory {
  fitness,
  finance,
  health,
  mindfulness,
  routine,
  generic,
}

extension AppCategoryExtension on AppCategory {
  String get displayName {
    switch (this) {
      case AppCategory.fitness:
        return 'Fitness';
      case AppCategory.finance:
        return 'Finance';
      case AppCategory.health:
        return 'Health';
      case AppCategory.mindfulness:
        return 'Mindfulness';
      case AppCategory.routine:
        return 'Routine';
      case AppCategory.generic:
        return 'General';
    }
  }

  IconData get icon {
    switch (this) {
      case AppCategory.fitness:
        return Icons.fitness_center_rounded;
      case AppCategory.finance:
        return Icons.attach_money_rounded;
      case AppCategory.health:
        return Icons.favorite_rounded;
      case AppCategory.mindfulness:
        return Icons.self_improvement_rounded;
      case AppCategory.routine:
        return Icons.schedule_rounded;
      case AppCategory.generic:
        return Icons.notes_rounded;
    }
  }

  String get emoji {
    switch (this) {
      case AppCategory.fitness:
        return '💪';
      case AppCategory.finance:
        return '💵';
      case AppCategory.health:
        return '❤️';
      case AppCategory.mindfulness:
        return '🧘';
      case AppCategory.routine:
        return '📅';
      case AppCategory.generic:
        return '📝';
    }
  }
}

/// Top-level function to get category color
/// This breaks the circular dependency between app_colors.dart and config.dart
Color getCategoryColor(AppCategory category) {
  return category.color;
}

/// Top-level function to get category light color
Color getCategoryLightColor(AppCategory category) {
  return category.lightColor;
}

extension AppCategoryColors on AppCategory {
  /// Get the main color for this category
  Color get color {
    switch (this) {
      case AppCategory.fitness:
        return AppColors.fitness;
      case AppCategory.finance:
        return AppColors.finance;
      case AppCategory.health:
        return AppColors.health;
      case AppCategory.mindfulness:
        return AppColors.mindfulness;
      case AppCategory.routine:
        return AppColors.routine;
      case AppCategory.generic:
        return AppColors.generic;
    }
  }

  /// Get the light color for this category
  Color get lightColor {
    switch (this) {
      case AppCategory.fitness:
        return AppColors.fitnessLight;
      case AppCategory.finance:
        return AppColors.financeLight;
      case AppCategory.health:
        return AppColors.healthLight;
      case AppCategory.mindfulness:
        return AppColors.mindfulnessLight;
      case AppCategory.routine:
        return AppColors.routineLight;
      case AppCategory.generic:
        return AppColors.genericLight;
    }
  }
}
