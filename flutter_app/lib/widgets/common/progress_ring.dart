import 'dart:math' as math;
import 'package:flutter/material.dart';
import '../../config/app_colors.dart';
import '../../config/app_typography.dart';
import '../../config/app_spacing.dart';

/// Circular progress ring widget
class ProgressRing extends StatelessWidget {
  final double progress; // 0.0 to 1.0
  final double size;
  final double strokeWidth;
  final Color? progressColor;
  final Color? backgroundColor;
  final Widget? child;
  final String? label;
  final bool showPercentage;

  const ProgressRing({
    super.key,
    required this.progress,
    this.size = AppSpacing.progressRingSize,
    this.strokeWidth = 6,
    this.progressColor,
    this.backgroundColor,
    this.child,
    this.label,
    this.showPercentage = true,
  });

  @override
  Widget build(BuildContext context) {
    final effectiveProgress = progress.clamp(0.0, 1.0);
    final percentage = (effectiveProgress * 100).round();

    return Column(
      mainAxisSize: MainAxisSize.min,
      children: [
        SizedBox(
          width: size,
          height: size,
          child: Stack(
            alignment: Alignment.center,
            children: [
              // Background ring
              CustomPaint(
                size: Size(size, size),
                painter: _RingPainter(
                  progress: 1.0,
                  color: backgroundColor ?? AppColors.borderLight,
                  strokeWidth: strokeWidth,
                ),
              ),
              // Progress ring
              CustomPaint(
                size: Size(size, size),
                painter: _RingPainter(
                  progress: effectiveProgress,
                  color: progressColor ?? AppColors.primary,
                  strokeWidth: strokeWidth,
                ),
              ),
              // Center content
              child ??
                  (showPercentage
                      ? Text(
                          '$percentage',
                          style: AppTypography.numberSmall.copyWith(
                            color: progressColor ?? AppColors.primary,
                          ),
                        )
                      : const SizedBox.shrink()),
            ],
          ),
        ),
        if (label != null) ...[
          const SizedBox(height: AppSpacing.xs),
          Text(
            label!,
            style: AppTypography.caption,
            textAlign: TextAlign.center,
          ),
        ],
      ],
    );
  }
}

class _RingPainter extends CustomPainter {
  final double progress;
  final Color color;
  final double strokeWidth;

  _RingPainter({
    required this.progress,
    required this.color,
    required this.strokeWidth,
  });

  @override
  void paint(Canvas canvas, Size size) {
    final center = Offset(size.width / 2, size.height / 2);
    final radius = (size.width - strokeWidth) / 2;

    final paint = Paint()
      ..color = color
      ..strokeWidth = strokeWidth
      ..style = PaintingStyle.stroke
      ..strokeCap = StrokeCap.round;

    canvas.drawArc(
      Rect.fromCircle(center: center, radius: radius),
      -math.pi / 2,
      2 * math.pi * progress,
      false,
      paint,
    );
  }

  @override
  bool shouldRepaint(covariant _RingPainter oldDelegate) {
    return oldDelegate.progress != progress ||
        oldDelegate.color != color ||
        oldDelegate.strokeWidth != strokeWidth;
  }
}
