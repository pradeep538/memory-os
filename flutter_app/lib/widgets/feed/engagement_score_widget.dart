import 'package:flutter/material.dart';
import '../../config/app_colors.dart';
import '../../config/app_typography.dart';
import '../../config/app_spacing.dart';
import '../../models/engagement_models.dart';
import '../common/base_card.dart';
import '../common/progress_ring.dart';
import '../common/single_metric.dart';

/// Engagement score widget showing overall consistency
class EngagementScoreWidget extends StatelessWidget {
  final EngagementSummary summary;
  final VoidCallback? onTap;

  const EngagementScoreWidget({
    super.key,
    required this.summary,
    this.onTap,
  });

  @override
  Widget build(BuildContext context) {
    final engagement = summary.engagement;
    final score = engagement.engagementScore;
    final trend = engagement.engagementTrend;

    return BaseCard(
      onTap: onTap,
      child: Column(
        crossAxisAlignment: CrossAxisAlignment.start,
        children: [
          // Header with score ring
          Row(
            children: [
              ProgressRing(
                progress: score / 100,
                size: 72,
                strokeWidth: 6,
                progressColor: _getScoreColor(score),
                child: Column(
                  mainAxisSize: MainAxisSize.min,
                  children: [
                    Text(
                      '$score',
                      style: AppTypography.numberMedium.copyWith(
                        color: _getScoreColor(score),
                      ),
                    ),
                  ],
                ),
              ),
              const SizedBox(width: AppSpacing.lg),
              Expanded(
                child: Column(
                  crossAxisAlignment: CrossAxisAlignment.start,
                  children: [
                    Text(
                      'Engagement Score',
                      style: AppTypography.widgetTitle,
                    ),
                    const SizedBox(height: AppSpacing.xs),
                    Row(
                      children: [
                        Text(
                          engagement.trendEmoji,
                          style: const TextStyle(fontSize: 16),
                        ),
                        const SizedBox(width: AppSpacing.xs),
                        Text(
                          _getTrendLabel(trend),
                          style: AppTypography.bodySmall.copyWith(
                            color: _getTrendColor(trend),
                          ),
                        ),
                      ],
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

          const SizedBox(height: AppSpacing.lg),
          const Divider(height: 1),
          const SizedBox(height: AppSpacing.md),

          // Stats row
          Row(
            children: [
              Expanded(
                child: SingleMetric(
                  value: '${engagement.currentLoggingStreak}',
                  label: 'Day Streak',
                  icon: Icons.local_fire_department_rounded,
                  valueColor: AppColors.warning,
                  compact: true,
                ),
              ),
              Expanded(
                child: SingleMetric(
                  value: '${summary.todayEvents}',
                  label: 'Today',
                  icon: Icons.today_rounded,
                  compact: true,
                ),
              ),
              Expanded(
                child: SingleMetric(
                  value: '${summary.weekEvents}',
                  label: 'This Week',
                  icon: Icons.date_range_rounded,
                  compact: true,
                ),
              ),
            ],
          ),

          // Tips if available
          if (summary.tips.isNotEmpty) ...[
            const SizedBox(height: AppSpacing.md),
            Container(
              padding: const EdgeInsets.all(AppSpacing.md),
              decoration: BoxDecoration(
                color: AppColors.primaryLight.withOpacity(0.1),
                borderRadius: BorderRadius.circular(AppSpacing.radiusMd),
              ),
              child: Row(
                children: [
                  const Text('💡', style: TextStyle(fontSize: 16)),
                  const SizedBox(width: AppSpacing.sm),
                  Expanded(
                    child: Text(
                      summary.tips.first.tip,
                      style: AppTypography.bodySmall.copyWith(
                        color: AppColors.primary,
                      ),
                      maxLines: 2,
                      overflow: TextOverflow.ellipsis,
                    ),
                  ),
                ],
              ),
            ),
          ],
        ],
      ),
    );
  }

  Color _getScoreColor(int score) {
    if (score >= 70) return AppColors.success;
    if (score >= 40) return AppColors.warning;
    return AppColors.error;
  }

  String _getTrendLabel(String trend) {
    switch (trend) {
      case 'increasing':
        return 'Going strong!';
      case 'declining':
        return 'Keep it up!';
      case 'inactive':
        return 'Let\'s get started!';
      default:
        return 'Staying consistent';
    }
  }

  Color _getTrendColor(String trend) {
    switch (trend) {
      case 'increasing':
        return AppColors.success;
      case 'declining':
        return AppColors.warning;
      case 'inactive':
        return AppColors.error;
      default:
        return AppColors.textSecondary;
    }
  }
}
