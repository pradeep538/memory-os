import 'package:flutter/material.dart';
import '../../config/app_colors.dart';
import '../../config/app_typography.dart';
import '../../config/app_spacing.dart';
import '../../models/insight_models.dart';
import '../../models/notification_models.dart';
import '../common/base_card.dart';
import '../common/confidence_indicator.dart';

/// Pattern detected widget
class PatternDetectedWidget extends StatelessWidget {
  final Insight insight;
  final VoidCallback? onTap;
  final VoidCallback? onCreateHabit;

  const PatternDetectedWidget({
    super.key,
    required this.insight,
    this.onTap,
    this.onCreateHabit,
  });

  @override
  Widget build(BuildContext context) {
    final categoryColor = AppColors.getCategoryColor(insight.category);

    return BaseCard(
      onTap: onTap,
      child: Column(
        crossAxisAlignment: CrossAxisAlignment.start,
        children: [
          // Header with badge
          Row(
            children: [
              Container(
                padding: const EdgeInsets.all(AppSpacing.sm),
                decoration: BoxDecoration(
                  color: categoryColor.withOpacity(0.15),
                  borderRadius: BorderRadius.circular(AppSpacing.radiusSm),
                ),
                child: const Icon(
                  Icons.auto_awesome_rounded,
                  color: AppColors.warning,
                  size: 20,
                ),
              ),
              const SizedBox(width: AppSpacing.md),
              Expanded(
                child: Text(
                  'Pattern Detected',
                  style: AppTypography.widgetTitle,
                ),
              ),
              if (insight.isNew)
                Container(
                  padding: const EdgeInsets.symmetric(
                    horizontal: AppSpacing.sm,
                    vertical: AppSpacing.xxs,
                  ),
                  decoration: BoxDecoration(
                    color: AppColors.primary,
                    borderRadius: BorderRadius.circular(AppSpacing.radiusFull),
                  ),
                  child: Text(
                    'NEW',
                    style: AppTypography.labelSmall.copyWith(
                      color: AppColors.textOnPrimary,
                    ),
                  ),
                ),
            ],
          ),

          const SizedBox(height: AppSpacing.md),

          // Insight headline
          Text(
            insight.headline,
            style: AppTypography.bodyLarge.copyWith(
              fontWeight: FontWeight.w500,
            ),
          ),

          if (insight.description != null) ...[
            const SizedBox(height: AppSpacing.sm),
            Text(
              insight.description!,
              style: AppTypography.bodySmall,
              maxLines: 2,
              overflow: TextOverflow.ellipsis,
            ),
          ],

          const SizedBox(height: AppSpacing.md),

          // Footer
          Row(
            children: [
              ConfidenceIndicator(
                confidence: insight.confidenceScore,
                compact: true,
              ),
              const Spacer(),
              if (insight.isActionable && onCreateHabit != null)
                TextButton.icon(
                  onPressed: onCreateHabit,
                  icon: const Icon(Icons.add_rounded, size: 18),
                  label: const Text('Create habit'),
                  style: TextButton.styleFrom(
                    foregroundColor: AppColors.primary,
                    padding: const EdgeInsets.symmetric(
                      horizontal: AppSpacing.sm,
                    ),
                  ),
                ),
            ],
          ),
        ],
      ),
    );
  }
}

/// Gap warning widget
class GapWarningWidget extends StatelessWidget {
  final AppNotification notification;
  final VoidCallback? onTap;
  final VoidCallback? onQuickLog;
  final VoidCallback? onDismiss;

  const GapWarningWidget({
    super.key,
    required this.notification,
    this.onTap,
    this.onQuickLog,
    this.onDismiss,
  });

  @override
  Widget build(BuildContext context) {
    return BaseCard(
      onTap: onTap,
      backgroundColor: AppColors.warning.withOpacity(0.08),
      child: Column(
        crossAxisAlignment: CrossAxisAlignment.start,
        children: [
          Row(
            children: [
              Container(
                padding: const EdgeInsets.all(AppSpacing.sm),
                decoration: BoxDecoration(
                  color: AppColors.warning.withOpacity(0.15),
                  borderRadius: BorderRadius.circular(AppSpacing.radiusSm),
                ),
                child: const Icon(
                  Icons.warning_amber_rounded,
                  color: AppColors.warning,
                  size: 20,
                ),
              ),
              const SizedBox(width: AppSpacing.md),
              Expanded(
                child: Column(
                  crossAxisAlignment: CrossAxisAlignment.start,
                  children: [
                    Text(
                      notification.title,
                      style: AppTypography.widgetTitle,
                    ),
                    if (notification.teaser != null ||
                        notification.fullContent != null)
                      Text(
                        notification.teaser ?? notification.fullContent!,
                        style: AppTypography.caption,
                      ),
                  ],
                ),
              ),
              if (onDismiss != null)
                IconButton(
                  onPressed: onDismiss,
                  icon: const Icon(Icons.close_rounded),
                  iconSize: 20,
                  color: AppColors.textTertiary,
                  padding: EdgeInsets.zero,
                  constraints:
                      const BoxConstraints(minWidth: 32, minHeight: 32),
                ),
            ],
          ),
          if (onQuickLog != null) ...[
            const SizedBox(height: AppSpacing.md),
            SizedBox(
              width: double.infinity,
              child: OutlinedButton.icon(
                onPressed: onQuickLog,
                icon: const Icon(Icons.add_rounded, size: 18),
                label: const Text('Quick log'),
                style: OutlinedButton.styleFrom(
                  foregroundColor: AppColors.warning,
                  side: const BorderSide(color: AppColors.warning),
                ),
              ),
            ),
          ],
        ],
      ),
    );
  }
}

/// AI recommendation widget
class AIRecommendationWidget extends StatelessWidget {
  final String recommendation;
  final String? reasoning;
  final VoidCallback? onAccept;
  final VoidCallback? onDismiss;

  const AIRecommendationWidget({
    super.key,
    required this.recommendation,
    this.reasoning,
    this.onAccept,
    this.onDismiss,
  });

  @override
  Widget build(BuildContext context) {
    return BaseCard(
      backgroundColor: AppColors.primaryLight.withOpacity(0.08),
      child: Column(
        crossAxisAlignment: CrossAxisAlignment.start,
        children: [
          Row(
            children: [
              Container(
                padding: const EdgeInsets.all(AppSpacing.sm),
                decoration: BoxDecoration(
                  color: AppColors.primary.withOpacity(0.15),
                  borderRadius: BorderRadius.circular(AppSpacing.radiusSm),
                ),
                child: const Icon(
                  Icons.psychology_rounded,
                  color: AppColors.primary,
                  size: 20,
                ),
              ),
              const SizedBox(width: AppSpacing.md),
              Expanded(
                child: Text(
                  'AI Suggestion',
                  style: AppTypography.widgetTitle,
                ),
              ),
              if (onDismiss != null)
                IconButton(
                  onPressed: onDismiss,
                  icon: const Icon(Icons.close_rounded),
                  iconSize: 20,
                  color: AppColors.textTertiary,
                  padding: EdgeInsets.zero,
                  constraints:
                      const BoxConstraints(minWidth: 32, minHeight: 32),
                ),
            ],
          ),
          const SizedBox(height: AppSpacing.md),
          Text(
            recommendation,
            style: AppTypography.body,
          ),
          if (reasoning != null) ...[
            const SizedBox(height: AppSpacing.sm),
            Text(
              reasoning!,
              style: AppTypography.caption.copyWith(
                fontStyle: FontStyle.italic,
              ),
            ),
          ],
          if (onAccept != null) ...[
            const SizedBox(height: AppSpacing.md),
            SizedBox(
              width: double.infinity,
              child: ElevatedButton(
                onPressed: onAccept,
                child: const Text('Try it'),
              ),
            ),
          ],
        ],
      ),
    );
  }
}

/// Streak milestone widget
class StreakMilestoneWidget extends StatelessWidget {
  final int streakDays;
  final VoidCallback? onTap;

  const StreakMilestoneWidget({
    super.key,
    required this.streakDays,
    this.onTap,
  });

  @override
  Widget build(BuildContext context) {
    return BaseCard(
      onTap: onTap,
      backgroundColor: AppColors.warning.withOpacity(0.1),
      child: Row(
        children: [
          // Animated fire icon
          TweenAnimationBuilder<double>(
            tween: Tween(begin: 0.9, end: 1.1),
            duration: const Duration(milliseconds: 800),
            curve: Curves.easeInOut,
            builder: (context, scale, child) {
              return Transform.scale(
                scale: scale,
                child: const Text(
                  '🔥',
                  style: TextStyle(fontSize: 40),
                ),
              );
            },
          ),
          const SizedBox(width: AppSpacing.md),
          Expanded(
            child: Column(
              crossAxisAlignment: CrossAxisAlignment.start,
              children: [
                Text(
                  '$streakDays Day Streak!',
                  style: AppTypography.h3.copyWith(
                    color: AppColors.warning,
                  ),
                ),
                Text(
                  _getEncouragement(streakDays),
                  style: AppTypography.bodySmall,
                ),
              ],
            ),
          ),
          Icon(
            Icons.chevron_right_rounded,
            color: AppColors.textTertiary,
          ),
        ],
      ),
    );
  }

  String _getEncouragement(int days) {
    if (days >= 90) return 'Incredible! You\'re unstoppable!';
    if (days >= 60) return 'Amazing consistency!';
    if (days >= 30) return 'One month strong!';
    if (days >= 14) return 'Two weeks and counting!';
    if (days >= 7) return 'One week milestone!';
    return 'Keep the fire burning!';
  }
}

/// Achievement unlocked widget
class AchievementUnlockedWidget extends StatelessWidget {
  final String name;
  final String description;
  final String icon;
  final VoidCallback? onTap;
  final VoidCallback? onShare;

  const AchievementUnlockedWidget({
    super.key,
    required this.name,
    required this.description,
    this.icon = '🏆',
    this.onTap,
    this.onShare,
  });

  @override
  Widget build(BuildContext context) {
    return BaseCard(
      onTap: onTap,
      backgroundColor: AppColors.success.withOpacity(0.1),
      child: Row(
        children: [
          // Badge with confetti-like effect
          Container(
            width: 56,
            height: 56,
            decoration: BoxDecoration(
              gradient: LinearGradient(
                colors: [
                  AppColors.success,
                  AppColors.primary,
                ],
              ),
              shape: BoxShape.circle,
            ),
            child: Center(
              child: Text(
                icon,
                style: const TextStyle(fontSize: 28),
              ),
            ),
          ),
          const SizedBox(width: AppSpacing.md),
          Expanded(
            child: Column(
              crossAxisAlignment: CrossAxisAlignment.start,
              children: [
                Text(
                  'Achievement Unlocked!',
                  style: AppTypography.caption.copyWith(
                    color: AppColors.success,
                    fontWeight: FontWeight.w600,
                  ),
                ),
                const SizedBox(height: AppSpacing.xxs),
                Text(
                  name,
                  style: AppTypography.h4,
                ),
                Text(
                  description,
                  style: AppTypography.caption,
                ),
              ],
            ),
          ),
          if (onShare != null)
            IconButton(
              onPressed: onShare,
              icon: const Icon(Icons.share_rounded),
              color: AppColors.textSecondary,
            ),
        ],
      ),
    );
  }
}
