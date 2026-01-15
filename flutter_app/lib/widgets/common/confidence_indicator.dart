import 'package:flutter/material.dart';
import '../../config/app_colors.dart';
import '../../config/app_typography.dart';
import '../../config/app_spacing.dart';

/// Confidence level indicator
class ConfidenceIndicator extends StatelessWidget {
  final double confidence;
  final bool showLabel;
  final bool compact;

  const ConfidenceIndicator({
    super.key,
    required this.confidence,
    this.showLabel = true,
    this.compact = false,
  });

  @override
  Widget build(BuildContext context) {
    final color = AppColors.getConfidenceColor(confidence);
    final percentage = (confidence * 100).round();
    final label = _getConfidenceLabel();

    return Container(
      padding: EdgeInsets.symmetric(
        horizontal: compact ? AppSpacing.sm : AppSpacing.md,
        vertical: compact ? AppSpacing.xxs : AppSpacing.xs,
      ),
      decoration: BoxDecoration(
        color: color.withOpacity(0.15),
        borderRadius: BorderRadius.circular(AppSpacing.radiusFull),
      ),
      child: Row(
        mainAxisSize: MainAxisSize.min,
        children: [
          Container(
            width: compact ? 6 : 8,
            height: compact ? 6 : 8,
            decoration: BoxDecoration(
              color: color,
              shape: BoxShape.circle,
            ),
          ),
          const SizedBox(width: AppSpacing.xs),
          Text(
            showLabel ? '$percentage% $label' : '$percentage%',
            style: (compact ? AppTypography.caption : AppTypography.labelSmall)
                .copyWith(color: color),
          ),
        ],
      ),
    );
  }

  String _getConfidenceLabel() {
    if (confidence >= 0.8) return 'confident';
    if (confidence >= 0.5) return 'likely';
    return 'uncertain';
  }
}
