import 'dart:async';
import 'package:flutter/material.dart';
import '../../config/app_colors.dart';
import '../../config/app_typography.dart';
import '../../config/app_spacing.dart';
import '../../config/config.dart';

class MarqueeExample {
  final String text;
  final String category;

  const MarqueeExample(this.text, this.category);
}

class MarqueeExamples extends StatefulWidget {
  final Function(MarqueeExample) onExampleTap;

  const MarqueeExamples({super.key, required this.onExampleTap});

  @override
  State<MarqueeExamples> createState() => _MarqueeExamplesState();
}

class _MarqueeExamplesState extends State<MarqueeExamples> {
  final List<MarqueeExample> _examples = const [
    MarqueeExample('Had a coffee at Starbucks for \$5', 'finance'),
    MarqueeExample('Ran 5km in the park this morning', 'fitness'),
    MarqueeExample('Feeling anxious about the deadline', 'mindfulness'),
    MarqueeExample('Meeting with John at 2pm', 'routine'),
    MarqueeExample('Took my vitamins today', 'health'),
    MarqueeExample('Read 10 pages of Atomic Habits', 'personal_growth'),
  ];

  int _currentIndex = 0;
  Timer? _timer;

  @override
  void initState() {
    super.initState();
    _startRotation();
  }

  @override
  void dispose() {
    _timer?.cancel();
    super.dispose();
  }

  void _startRotation() {
    _timer = Timer.periodic(Config.marqueeInterval, (_) {
      if (mounted) {
        setState(() {
          _currentIndex = (_currentIndex + 1) % _examples.length;
        });
      }
    });
  }

  @override
  Widget build(BuildContext context) {
    final example = _examples[_currentIndex];
    final categoryColor = _getCategoryColor(example.category);

    return GestureDetector(
      onTap: () => widget.onExampleTap(example),
      child: AnimatedSwitcher(
        duration: const Duration(milliseconds: 600),
        transitionBuilder: (Widget child, Animation<double> animation) {
          return FadeTransition(opacity: animation, child: child);
        },
        child: Container(
          key: ValueKey<int>(_currentIndex),
          margin: const EdgeInsets.symmetric(horizontal: AppSpacing.md),
          padding: const EdgeInsets.symmetric(
            horizontal: AppSpacing.md,
            vertical: AppSpacing.sm,
          ),
          decoration: BoxDecoration(
            color: categoryColor.withOpacity(0.1),
            borderRadius: BorderRadius.circular(AppSpacing.radiusLg),
            border: Border.all(color: categoryColor.withOpacity(0.2)),
          ),
          child: Row(
            mainAxisSize: MainAxisSize.min,
            children: [
              Icon(
                Icons.lightbulb_outline_rounded,
                size: 16,
                color: categoryColor,
              ),
              const SizedBox(width: AppSpacing.sm),
              Flexible(
                child: Text(
                  example.text,
                  style: AppTypography.caption.copyWith(
                    color: AppColors.textPrimary.withOpacity(0.8),
                    fontStyle: FontStyle.italic,
                  ),
                  maxLines: 1,
                  overflow: TextOverflow.ellipsis,
                ),
              ),
            ],
          ),
        ),
      ),
    );
  }

  Color _getCategoryColor(String category) {
    switch (category) {
      case 'finance':
        return AppColors.finance;
      case 'fitness':
        return AppColors.fitness;
      case 'health':
        return AppColors.health;
      case 'mindfulness':
        return AppColors.mindfulness;
      case 'routine':
        return AppColors.routine;
      default:
        return AppColors.primary;
    }
  }
}
