import 'package:flutter/material.dart';
import '../../config/app_colors.dart';
import '../../config/app_spacing.dart';

/// Base card widget for all feed widgets
class BaseCard extends StatelessWidget {
  final Widget child;
  final VoidCallback? onTap;
  final EdgeInsets? padding;
  final Color? backgroundColor;
  final bool hasShadow;
  final BorderRadius? borderRadius;

  const BaseCard({
    super.key,
    required this.child,
    this.onTap,
    this.padding,
    this.backgroundColor,
    this.hasShadow = true,
    this.borderRadius,
  });

  @override
  Widget build(BuildContext context) {
    return GestureDetector(
      onTap: onTap,
      child: Container(
        padding: padding ?? const EdgeInsets.all(AppSpacing.cardPadding),
        decoration: BoxDecoration(
          color: backgroundColor ?? AppColors.surface,
          borderRadius: borderRadius ?? AppSpacing.borderRadiusLg,
          boxShadow: hasShadow
              ? [
                  BoxShadow(
                    color: AppColors.textPrimary.withOpacity(0.04),
                    blurRadius: 8,
                    offset: const Offset(0, 2),
                  ),
                ]
              : null,
        ),
        child: child,
      ),
    );
  }
}
