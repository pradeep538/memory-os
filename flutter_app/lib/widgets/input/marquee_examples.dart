import 'dart:async';
import 'package:flutter/material.dart';
import '../../config/app_colors.dart';
import '../../config/app_typography.dart';
import '../../config/app_spacing.dart';
import '../../config/config.dart';

/// Example inputs for marquee discovery system
class MarqueeExample {
  final String text;
  final String category;
  final String categoryIcon;

  const MarqueeExample({
    required this.text,
    required this.category,
    required this.categoryIcon,
  });
}

const List<MarqueeExample> _examples = [
  // Fitness
  MarqueeExample(text: 'Went to gym for leg workout 1 hour', category: 'fitness', categoryIcon: '💪'),
  MarqueeExample(text: 'Did chest workout, energy level 9', category: 'fitness', categoryIcon: '💪'),
  MarqueeExample(text: 'Ran 5k in 28 minutes', category: 'fitness', categoryIcon: '💪'),
  // Finance
  MarqueeExample(text: 'Spent \$45 on groceries', category: 'finance', categoryIcon: '💵'),
  MarqueeExample(text: 'Coffee \$4.50', category: 'finance', categoryIcon: '💵'),
  MarqueeExample(text: 'Got paid \$2500 salary', category: 'finance', categoryIcon: '💵'),
  // Health
  MarqueeExample(text: 'Slept 7.5 hours, felt refreshed', category: 'health', categoryIcon: '❤️'),
  MarqueeExample(text: 'Blood pressure 120/80', category: 'health', categoryIcon: '❤️'),
  MarqueeExample(text: 'Took ibuprofen 200mg', category: 'health', categoryIcon: '❤️'),
  // Mindfulness
  MarqueeExample(text: 'Meditated for 15 minutes', category: 'mindfulness', categoryIcon: '🧘'),
  MarqueeExample(text: 'Feeling calm and focused', category: 'mindfulness', categoryIcon: '🧘'),
  MarqueeExample(text: 'Grateful for family time', category: 'mindfulness', categoryIcon: '🧘'),
  // Routine
  MarqueeExample(text: 'Morning meditation complete', category: 'routine', categoryIcon: '📅'),
  MarqueeExample(text: 'Took vitamins and breakfast', category: 'routine', categoryIcon: '📅'),
  MarqueeExample(text: 'Evening walk done', category: 'routine', categoryIcon: '📅'),
  // Generic
  MarqueeExample(text: 'Meeting with Sarah, discussed project', category: 'generic', categoryIcon: '📝'),
  MarqueeExample(text: 'Read 30 pages of book', category: 'generic', categoryIcon: '📝'),
];

/// Rotating marquee widget showing example inputs
class MarqueeExamples extends StatefulWidget {
  final ValueChanged<MarqueeExample>? onExampleTap;
  final bool asPlaceholder;

  const MarqueeExamples({
    super.key,
    this.onExampleTap,
    this.asPlaceholder = false,
  });

  @override
  State<MarqueeExamples> createState() => _MarqueeExamplesState();
}

class _MarqueeExamplesState extends State<MarqueeExamples>
    with SingleTickerProviderStateMixin {
  int _currentIndex = 0;
  Timer? _timer;
  late AnimationController _fadeController;
  late Animation<double> _fadeAnimation;

  @override
  void initState() {
    super.initState();
    _fadeController = AnimationController(
      duration: const Duration(milliseconds: 300),
      vsync: this,
    );
    _fadeAnimation = Tween<double>(begin: 1.0, end: 0.0).animate(_fadeController);
    _startRotation();
  }

  @override
  void dispose() {
    _timer?.cancel();
    _fadeController.dispose();
    super.dispose();
  }

  void _startRotation() {
    _timer = Timer.periodic(Config.marqueeInterval, (_) {
      _fadeController.forward().then((_) {
        setState(() {
          _currentIndex = (_currentIndex + 1) % _examples.length;
        });
        _fadeController.reverse();
      });
    });
  }

  @override
  Widget build(BuildContext context) {
    final example = _examples[_currentIndex];
    final categoryColor = AppColors.getCategoryColor(example.category);

    if (widget.asPlaceholder) {
      return FadeTransition(
        opacity: ReverseAnimation(_fadeAnimation),
        child: Text(
          'Try: "${example.text}"',
          style: AppTypography.inputHint,
          maxLines: 1,
          overflow: TextOverflow.ellipsis,
        ),
      );
    }

    return GestureDetector(
      onTap: () => widget.onExampleTap?.call(example),
      child: FadeTransition(
        opacity: ReverseAnimation(_fadeAnimation),
        child: Container(
          padding: const EdgeInsets.symmetric(
            horizontal: AppSpacing.md,
            vertical: AppSpacing.sm,
          ),
          decoration: BoxDecoration(
            color: AppColors.getCategoryLightColor(example.category),
            borderRadius: BorderRadius.circular(AppSpacing.radiusMd),
          ),
          child: Row(
            mainAxisSize: MainAxisSize.min,
            children: [
              Text(
                example.categoryIcon,
                style: const TextStyle(fontSize: 14),
              ),
              const SizedBox(width: AppSpacing.sm),
              Flexible(
                child: Text(
                  '"${example.text}"',
                  style: AppTypography.bodySmall.copyWith(color: categoryColor),
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
}
