import 'package:flutter/material.dart';

/// Kairo Color System
/// Voice-first, clean, minimal design with mint/teal accents
class AppColors {
  AppColors._();

  // ============================================================================
  // BACKGROUNDS
  // ============================================================================

  static const Color background = Color(0xFFF8F9FB);
  static const Color backgroundSecondary = Color(0xFFF0F2F5);
  static const Color surface = Color(0xFFFFFFFF);
  static const Color surfaceElevated = Color(0xFFFFFFFF);

  // ============================================================================
  // PRIMARY BRAND COLORS
  // ============================================================================

  static const Color primary = Color(0xFF00D9A3);
  static const Color primaryLight = Color(0xFF1DE9B6);
  static const Color primaryDark = Color(0xFF00C794);
  static const Color accent = Color(0xFF0DDFCC);

  // ============================================================================
  // CATEGORY COLORS (matching backend categories)
  // ============================================================================

  static const Color fitness = Color(0xFF60A5FA);
  static const Color fitnessLight = Color(0xFFDBEAFE);

  static const Color finance = Color(0xFFFFB84D);
  static const Color financeLight = Color(0xFFFEF3C7);

  static const Color health = Color(0xFFFF6B9D);
  static const Color healthLight = Color(0xFFFCE7F3);

  static const Color mindfulness = Color(0xFFA78BFA);
  static const Color mindfulnessLight = Color(0xFFEDE9FE);

  static const Color routine = Color(0xFF6366F1);
  static const Color routineLight = Color(0xFFE0E7FF);

  static const Color generic = Color(0xFF9CA3AF);
  static const Color genericLight = Color(0xFFF3F4F6);

  // ============================================================================
  // SEMANTIC COLORS
  // ============================================================================

  static const Color success = Color(0xFF00D9A3);
  static const Color warning = Color(0xFFFFB84D);
  static const Color error = Color(0xFFEF4444);
  static const Color info = Color(0xFF60A5FA);

  // ============================================================================
  // TEXT COLORS
  // ============================================================================

  static const Color textPrimary = Color(0xFF1F2937);
  static const Color textSecondary = Color(0xFF6B7280);
  static const Color textTertiary = Color(0xFF9CA3AF);
  static const Color textDisabled = Color(0xFFD1D5DB);
  static const Color textOnPrimary = Color(0xFFFFFFFF);

  // ============================================================================
  // UI ELEMENTS
  // ============================================================================

  static const Color border = Color(0xFFE5E7EB);
  static const Color borderLight = Color(0xFFF3F4F6);
  static const Color divider = Color(0xFFF3F4F6);
  static const Color inputFill = Color(0xFFF9FAFB);
  static const Color overlay = Color(0x80000000);
  static const Color overlayLight = Color(0x40000000);

  // ============================================================================
  // RECORDING STATE
  // ============================================================================

  static const Color recording = Color(0xFFEF4444);
  static const Color recordingLight = Color(0xFFFEE2E2);

  // ============================================================================
  // CONFIDENCE COLORS
  // ============================================================================

  static const Color confidenceHigh = Color(0xFF00D9A3);
  static const Color confidenceMedium = Color(0xFFFFB84D);
  static const Color confidenceLow = Color(0xFFEF4444);

  // ============================================================================
  // GRADIENTS
  // ============================================================================

  static const LinearGradient primaryGradient = LinearGradient(
    begin: Alignment.topLeft,
    end: Alignment.bottomRight,
    colors: [Color(0xFF00D9A3), Color(0xFF1DE9B6)],
  );

  static const LinearGradient backgroundGradient = LinearGradient(
    begin: Alignment.topCenter,
    end: Alignment.bottomCenter,
    colors: [Color(0xFFF8F9FB), Color(0xFFFFFFFF)],
  );

  // ============================================================================
  // CATEGORY COLOR HELPERS
  // ============================================================================

  static Color getCategoryColor(String category) {
    switch (category.toLowerCase()) {
      case 'fitness':
        return fitness;
      case 'finance':
        return finance;
      case 'health':
        return health;
      case 'mindfulness':
        return mindfulness;
      case 'routine':
        return routine;
      default:
        return generic;
    }
  }

  static Color getCategoryLightColor(String category) {
    switch (category.toLowerCase()) {
      case 'fitness':
        return fitnessLight;
      case 'finance':
        return financeLight;
      case 'health':
        return healthLight;
      case 'mindfulness':
        return mindfulnessLight;
      case 'routine':
        return routineLight;
      default:
        return genericLight;
    }
  }

  static Color getConfidenceColor(double confidence) {
    if (confidence >= 0.8) return confidenceHigh;
    if (confidence >= 0.5) return confidenceMedium;
    return confidenceLow;
  }
}
