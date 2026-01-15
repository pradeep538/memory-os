import 'package:flutter/material.dart';
import '../../config/app_colors.dart';
import '../../config/app_typography.dart';
import '../../config/app_spacing.dart';

/// Single metric display widget
class SingleMetric extends StatelessWidget {
  final String value;
  final String label;
  final String? trend; // 'up', 'down', 'stable'
  final String? trendValue;
  final Color? valueColor;
  final IconData? icon;
  final bool compact;

  const SingleMetric({
    super.key,
    required this.value,
    required this.label,
    this.trend,
    this.trendValue,
    this.valueColor,
    this.icon,
    this.compact = false,
  });

  @override
  Widget build(BuildContext context) {
    return Column(
      crossAxisAlignment: CrossAxisAlignment.start,
      mainAxisSize: MainAxisSize.min,
      children: [
        Row(
          crossAxisAlignment: CrossAxisAlignment.end,
          children: [
            if (icon != null) ...[
              Icon(
                icon,
                size: compact ? 16 : 20,
                color: valueColor ?? AppColors.textSecondary,
              ),
              const SizedBox(width: AppSpacing.xs),
            ],
            Text(
              value,
              style: (compact ? AppTypography.numberSmall : AppTypography.numberMedium)
                  .copyWith(color: valueColor ?? AppColors.textPrimary),
            ),
            if (trend != null) ...[
              const SizedBox(width: AppSpacing.xs),
              _buildTrendIndicator(),
            ],
          ],
        ),
        const SizedBox(height: AppSpacing.xxs),
        Text(
          label,
          style: compact ? AppTypography.caption : AppTypography.bodySmall,
        ),
      ],
    );
  }

  Widget _buildTrendIndicator() {
    IconData trendIcon;
    Color trendColor;

    switch (trend) {
      case 'up':
        trendIcon = Icons.trending_up_rounded;
        trendColor = AppColors.success;
        break;
      case 'down':
        trendIcon = Icons.trending_down_rounded;
        trendColor = AppColors.error;
        break;
      default:
        trendIcon = Icons.trending_flat_rounded;
        trendColor = AppColors.textTertiary;
    }

    return Row(
      mainAxisSize: MainAxisSize.min,
      children: [
        Icon(trendIcon, size: 16, color: trendColor),
        if (trendValue != null) ...[
          const SizedBox(width: 2),
          Text(
            trendValue!,
            style: AppTypography.caption.copyWith(color: trendColor),
          ),
        ],
      ],
    );
  }
}

/// Row of metrics
class MetricRow extends StatelessWidget {
  final List<SingleMetric> metrics;
  final bool expanded;

  const MetricRow({
    super.key,
    required this.metrics,
    this.expanded = false,
  });

  @override
  Widget build(BuildContext context) {
    if (expanded) {
      return Row(
        children: metrics
            .map((m) => Expanded(child: m))
            .toList(),
      );
    }

    return Row(
      children: metrics
          .map((m) => Padding(
                padding: const EdgeInsets.only(right: AppSpacing.lg),
                child: m,
              ))
          .toList(),
    );
  }
}
