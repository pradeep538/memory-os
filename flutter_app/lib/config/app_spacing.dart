import 'package:flutter/material.dart';

/// Memory OS Spacing System
/// Consistent spacing for clean, minimal UI
class AppSpacing {
  AppSpacing._();

  // ============================================================================
  // BASE SPACING VALUES
  // ============================================================================

  static const double xxs = 2.0;
  static const double xs = 4.0;
  static const double sm = 8.0;
  static const double md = 16.0;
  static const double lg = 24.0;
  static const double xl = 32.0;
  static const double xxl = 48.0;
  static const double xxxl = 64.0;

  // ============================================================================
  // SEMANTIC SPACING
  // ============================================================================

  /// Spacing between list items
  static const double listItemGap = 12.0;

  /// Spacing between widgets in feed
  static const double widgetGap = 16.0;

  /// Card internal padding
  static const double cardPadding = 16.0;

  /// Screen horizontal padding
  static const double screenPadding = 20.0;

  /// Section spacing
  static const double sectionGap = 24.0;

  /// Input bar height
  static const double inputBarHeight = 56.0;

  /// Bottom nav height
  static const double bottomNavHeight = 80.0;

  // ============================================================================
  // RADIUS VALUES
  // ============================================================================

  static const double radiusXs = 4.0;
  static const double radiusSm = 8.0;
  static const double radiusMd = 12.0;
  static const double radiusLg = 16.0;
  static const double radiusXl = 20.0;
  static const double radiusXxl = 24.0;
  static const double radiusFull = 100.0;

  // ============================================================================
  // BORDER RADIUS PRESETS
  // ============================================================================

  static const BorderRadius borderRadiusSm = BorderRadius.all(Radius.circular(radiusSm));
  static const BorderRadius borderRadiusMd = BorderRadius.all(Radius.circular(radiusMd));
  static const BorderRadius borderRadiusLg = BorderRadius.all(Radius.circular(radiusLg));
  static const BorderRadius borderRadiusXl = BorderRadius.all(Radius.circular(radiusXl));

  // ============================================================================
  // EDGE INSETS PRESETS
  // ============================================================================

  static const EdgeInsets paddingXs = EdgeInsets.all(xs);
  static const EdgeInsets paddingSm = EdgeInsets.all(sm);
  static const EdgeInsets paddingMd = EdgeInsets.all(md);
  static const EdgeInsets paddingLg = EdgeInsets.all(lg);

  static const EdgeInsets paddingHorizontalMd = EdgeInsets.symmetric(horizontal: md);
  static const EdgeInsets paddingHorizontalLg = EdgeInsets.symmetric(horizontal: lg);

  static const EdgeInsets paddingScreen = EdgeInsets.symmetric(horizontal: screenPadding);

  // ============================================================================
  // ICON SIZES
  // ============================================================================

  static const double iconXs = 16.0;
  static const double iconSm = 20.0;
  static const double iconMd = 24.0;
  static const double iconLg = 28.0;
  static const double iconXl = 32.0;

  // ============================================================================
  // WIDGET DIMENSIONS
  // ============================================================================

  static const double widgetMinHeight = 80.0;
  static const double progressRingSize = 64.0;
  static const double avatarSm = 32.0;
  static const double avatarMd = 40.0;
  static const double avatarLg = 56.0;

  // ============================================================================
  // ANIMATION DURATIONS
  // ============================================================================

  static const Duration durationFast = Duration(milliseconds: 150);
  static const Duration durationNormal = Duration(milliseconds: 250);
  static const Duration durationSlow = Duration(milliseconds: 400);
}
