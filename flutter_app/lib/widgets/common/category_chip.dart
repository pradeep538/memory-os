import 'package:flutter/material.dart';
import '../../config/app_colors.dart';
import '../../config/app_typography.dart';
import '../../config/app_spacing.dart';
import '../../config/config.dart';

/// Category chip with icon and color
class CategoryChip extends StatelessWidget {
  final String category;
  final bool showIcon;
  final bool compact;

  const CategoryChip({
    super.key,
    required this.category,
    this.showIcon = true,
    this.compact = false,
  });

  /// Constructor that accepts AppCategory enum
  CategoryChip.fromCategory({
    super.key,
    required AppCategory appCategory,
    this.showIcon = true,
    this.compact = false,
  }) : category = appCategory.name;

  @override
  Widget build(BuildContext context) {
    final color = AppColors.getCategoryColor(category);
    final lightColor = AppColors.getCategoryLightColor(category);
    final appCategory = AppCategory.values.firstWhere(
      (c) => c.name == category.toLowerCase(),
      orElse: () => AppCategory.generic,
    );

    return Container(
      padding: EdgeInsets.symmetric(
        horizontal: compact ? AppSpacing.sm : AppSpacing.md,
        vertical: compact ? AppSpacing.xxs : AppSpacing.xs,
      ),
      decoration: BoxDecoration(
        color: lightColor,
        borderRadius: BorderRadius.circular(AppSpacing.radiusFull),
      ),
      child: Row(
        mainAxisSize: MainAxisSize.min,
        children: [
          if (showIcon) ...[
            Icon(
              appCategory.icon,
              size: compact ? 12 : 14,
              color: color,
            ),
            SizedBox(width: compact ? 4 : 6),
          ],
          Text(
            appCategory.displayName,
            style: (compact ? AppTypography.labelSmall : AppTypography.label)
                .copyWith(color: color),
          ),
        ],
      ),
    );
  }
}
