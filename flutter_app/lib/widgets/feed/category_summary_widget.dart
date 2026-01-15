import 'package:flutter/material.dart';
import '../../config/app_colors.dart';
import '../../config/app_typography.dart';
import '../../config/app_spacing.dart';
import '../../config/config.dart';
import '../../models/input_models.dart';
import '../common/base_card.dart';
import '../common/mini_chart.dart';

/// Generic category summary widget (fitness, finance, health, etc.)
class CategorySummaryWidget extends StatelessWidget {
  final String category;
  final List<Memory> memories;
  final String? summaryTitle;
  final String? summaryValue;
  final String? summaryLabel;
  final List<double>? chartData;
  final VoidCallback? onTap;

  const CategorySummaryWidget({
    super.key,
    required this.category,
    required this.memories,
    this.summaryTitle,
    this.summaryValue,
    this.summaryLabel,
    this.chartData,
    this.onTap,
  });

  @override
  Widget build(BuildContext context) {
    final categoryColor = AppColors.getCategoryColor(category);
    final categoryLight = AppColors.getCategoryLightColor(category);
    final appCategory = AppCategory.values.firstWhere(
      (c) => c.name == category.toLowerCase(),
      orElse: () => AppCategory.generic,
    );

    return BaseCard(
      onTap: onTap,
      child: Column(
        crossAxisAlignment: CrossAxisAlignment.start,
        children: [
          // Header
          Row(
            children: [
              Container(
                padding: const EdgeInsets.all(AppSpacing.sm),
                decoration: BoxDecoration(
                  color: categoryLight,
                  borderRadius: BorderRadius.circular(AppSpacing.radiusSm),
                ),
                child: Icon(
                  appCategory.icon,
                  size: 20,
                  color: categoryColor,
                ),
              ),
              const SizedBox(width: AppSpacing.md),
              Expanded(
                child: Column(
                  crossAxisAlignment: CrossAxisAlignment.start,
                  children: [
                    Text(
                      summaryTitle ?? appCategory.displayName,
                      style: AppTypography.widgetTitle,
                    ),
                    if (summaryLabel != null)
                      Text(
                        summaryLabel!,
                        style: AppTypography.caption,
                      ),
                  ],
                ),
              ),
              if (summaryValue != null) ...[
                Text(
                  summaryValue!,
                  style: AppTypography.numberSmall.copyWith(
                    color: categoryColor,
                  ),
                ),
              ],
              Icon(
                Icons.chevron_right_rounded,
                color: AppColors.textTertiary,
              ),
            ],
          ),

          // Chart if available
          if (chartData != null && chartData!.isNotEmpty) ...[
            const SizedBox(height: AppSpacing.md),
            MiniBarChart(
              data: chartData!,
              height: 48,
              barColor: categoryColor,
            ),
          ],

          // Recent entries
          if (memories.isNotEmpty) ...[
            const SizedBox(height: AppSpacing.md),
            const Divider(height: 1),
            const SizedBox(height: AppSpacing.sm),

            ...memories.take(3).map((memory) => Padding(
                  padding: const EdgeInsets.symmetric(vertical: AppSpacing.xs),
                  child: Row(
                    children: [
                      Container(
                        width: 4,
                        height: 20,
                        decoration: BoxDecoration(
                          color: categoryColor.withOpacity(0.5),
                          borderRadius: BorderRadius.circular(2),
                        ),
                      ),
                      const SizedBox(width: AppSpacing.sm),
                      Expanded(
                        child: Text(
                          memory.displayText,
                          style: AppTypography.bodySmall,
                          maxLines: 1,
                          overflow: TextOverflow.ellipsis,
                        ),
                      ),
                      Text(
                        _getTimeAgo(memory.createdAt),
                        style: AppTypography.caption,
                      ),
                    ],
                  ),
                )),
          ],
        ],
      ),
    );
  }

  String _getTimeAgo(DateTime dateTime) {
    final now = DateTime.now();
    final diff = now.difference(dateTime);

    if (diff.inMinutes < 1) return 'Now';
    if (diff.inMinutes < 60) return '${diff.inMinutes}m';
    if (diff.inHours < 24) return '${diff.inHours}h';
    return '${diff.inDays}d';
  }
}

/// Fitness-specific summary widget
class FitnessSummaryWidget extends StatelessWidget {
  final List<Memory> memories;
  final VoidCallback? onTap;

  const FitnessSummaryWidget({
    super.key,
    required this.memories,
    this.onTap,
  });

  @override
  Widget build(BuildContext context) {
    // Calculate summary stats
    final thisWeek = memories.where((m) {
      final weekAgo = DateTime.now().subtract(const Duration(days: 7));
      return m.createdAt.isAfter(weekAgo);
    }).length;

    return CategorySummaryWidget(
      category: 'fitness',
      memories: memories,
      summaryTitle: 'Fitness',
      summaryValue: '$thisWeek',
      summaryLabel: 'workouts this week',
      chartData: _generateChartData(memories),
      onTap: onTap,
    );
  }

  List<double> _generateChartData(List<Memory> memories) {
    // Group by day for last 7 days
    final data = List.filled(7, 0.0);
    final now = DateTime.now();

    for (final memory in memories) {
      final daysAgo = now.difference(memory.createdAt).inDays;
      if (daysAgo < 7) {
        data[6 - daysAgo] += 1;
      }
    }
    return data;
  }
}

/// Finance-specific summary widget
class FinanceSummaryWidget extends StatelessWidget {
  final List<Memory> memories;
  final VoidCallback? onTap;

  const FinanceSummaryWidget({
    super.key,
    required this.memories,
    this.onTap,
  });

  @override
  Widget build(BuildContext context) {
    // Calculate total spending
    double totalSpent = 0;
    for (final memory in memories) {
      final amount = memory.normalizedData['amount'];
      if (amount != null && amount is num) {
        totalSpent += amount.toDouble();
      }
    }

    return CategorySummaryWidget(
      category: 'finance',
      memories: memories,
      summaryTitle: 'Finance',
      summaryValue: '\$${totalSpent.toStringAsFixed(0)}',
      summaryLabel: 'spent this week',
      chartData: _generateChartData(memories),
      onTap: onTap,
    );
  }

  List<double> _generateChartData(List<Memory> memories) {
    final data = List.filled(7, 0.0);
    final now = DateTime.now();

    for (final memory in memories) {
      final daysAgo = now.difference(memory.createdAt).inDays;
      if (daysAgo < 7) {
        final amount = memory.normalizedData['amount'];
        if (amount != null && amount is num) {
          data[6 - daysAgo] += amount.toDouble();
        }
      }
    }
    return data;
  }
}

/// Health-specific summary widget
class HealthDashboardWidget extends StatelessWidget {
  final List<Memory> memories;
  final VoidCallback? onTap;

  const HealthDashboardWidget({
    super.key,
    required this.memories,
    this.onTap,
  });

  @override
  Widget build(BuildContext context) {
    return CategorySummaryWidget(
      category: 'health',
      memories: memories,
      summaryTitle: 'Health',
      summaryLabel: '${memories.length} entries this week',
      onTap: onTap,
    );
  }
}

/// Mindfulness-specific summary widget
class MindfulnessTrackerWidget extends StatelessWidget {
  final List<Memory> memories;
  final VoidCallback? onTap;

  const MindfulnessTrackerWidget({
    super.key,
    required this.memories,
    this.onTap,
  });

  @override
  Widget build(BuildContext context) {
    // Calculate total minutes
    int totalMinutes = 0;
    for (final memory in memories) {
      final duration = memory.normalizedData['duration_minutes'] ??
          memory.normalizedData['duration'];
      if (duration != null && duration is num) {
        totalMinutes += duration.toInt();
      }
    }

    return CategorySummaryWidget(
      category: 'mindfulness',
      memories: memories,
      summaryTitle: 'Mindfulness',
      summaryValue: '${totalMinutes}m',
      summaryLabel: 'this week',
      onTap: onTap,
    );
  }
}

/// Routine-specific summary widget
class RoutineTimelineWidget extends StatelessWidget {
  final List<Memory> memories;
  final VoidCallback? onTap;

  const RoutineTimelineWidget({
    super.key,
    required this.memories,
    this.onTap,
  });

  @override
  Widget build(BuildContext context) {
    return CategorySummaryWidget(
      category: 'routine',
      memories: memories,
      summaryTitle: 'Routine',
      summaryLabel: '${memories.length} completions today',
      onTap: onTap,
    );
  }
}
