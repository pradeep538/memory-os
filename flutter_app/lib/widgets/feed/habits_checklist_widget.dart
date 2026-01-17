import 'package:flutter/material.dart';
import 'package:flutter/services.dart';
import '../../config/app_colors.dart';
import '../../config/app_typography.dart';
import '../../config/app_spacing.dart';
import '../../models/habit_models.dart';
import '../common/base_card.dart';
import '../common/progress_ring.dart';

/// Habits checklist widget for daily habit completion
class HabitsChecklistWidget extends StatelessWidget {
  final List<Habit> habits;
  final int completedToday;
  final VoidCallback? onTap;
  final Function(Habit, bool)? onHabitToggle;

  const HabitsChecklistWidget({
    super.key,
    required this.habits,
    required this.completedToday,
    this.onTap,
    this.onHabitToggle,
  });

  @override
  Widget build(BuildContext context) {
    final total = habits.length;
    final progress = total > 0 ? completedToday / total : 0.0;

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
                  color: AppColors.primaryLight.withOpacity(0.2),
                  borderRadius: BorderRadius.circular(AppSpacing.radiusSm),
                ),
                child: const Icon(
                  Icons.checklist_rounded,
                  color: AppColors.primary,
                  size: 20,
                ),
              ),
              const SizedBox(width: AppSpacing.md),
              Expanded(
                child: Column(
                  crossAxisAlignment: CrossAxisAlignment.start,
                  children: [
                    Text(
                      'Today\'s Habits',
                      style: AppTypography.widgetTitle,
                    ),
                    Text(
                      '$completedToday of $total completed',
                      style: AppTypography.caption,
                    ),
                  ],
                ),
              ),
              ProgressRing(
                progress: progress,
                size: 44,
                strokeWidth: 4,
                showPercentage: false,
                child: Text(
                  '$completedToday/$total',
                  style: AppTypography.labelSmall.copyWith(
                    color: AppColors.primary,
                  ),
                ),
              ),
            ],
          ),

          if (habits.isNotEmpty) ...[
            const SizedBox(height: AppSpacing.md),
            const Divider(height: 1),
            const SizedBox(height: AppSpacing.sm),

            // Habit list (show max 5)
            ...habits.take(5).map((habit) => _HabitRow(
                  habit: habit,
                  onToggle: onHabitToggle != null
                      ? (value) => onHabitToggle!(habit, value)
                      : null,
                )),

            // View all button if more than 5
            if (habits.length > 5) ...[
              const SizedBox(height: AppSpacing.sm),
              Center(
                child: TextButton(
                  onPressed: onTap,
                  child: Text(
                    'View all ${habits.length} habits',
                    style: AppTypography.buttonSmall.copyWith(
                      color: AppColors.primary,
                    ),
                  ),
                ),
              ),
            ],
          ] else ...[
            const SizedBox(height: AppSpacing.lg),
            Center(
              child: Column(
                children: [
                  Icon(
                    Icons.add_task_rounded,
                    size: 32,
                    color: AppColors.textTertiary,
                  ),
                  const SizedBox(height: AppSpacing.sm),
                  Text(
                    'No habits yet',
                    style: AppTypography.body.copyWith(
                      color: AppColors.textTertiary,
                    ),
                  ),
                  const SizedBox(height: AppSpacing.xs),
                  Text(
                    'Try saying "Track my morning meditation"',
                    style: AppTypography.caption,
                  ),
                ],
              ),
            ),
          ],
        ],
      ),
    );
  }
}

class _HabitRow extends StatelessWidget {
  final Habit habit;
  final Function(bool)? onToggle;

  const _HabitRow({
    required this.habit,
    this.onToggle,
  });

  @override
  Widget build(BuildContext context) {
    final isCompleted = habit.isCompletedToday;
    final categoryColor = AppColors.getCategoryColor(habit.category);

    return Padding(
      padding: const EdgeInsets.symmetric(vertical: AppSpacing.xs),
      child: Row(
        children: [
          // Checkbox
          GestureDetector(
            onTap: () {
              HapticFeedback.lightImpact();
              onToggle?.call(!isCompleted);
            },
            child: AnimatedContainer(
              duration: const Duration(milliseconds: 200),
              width: 24,
              height: 24,
              decoration: BoxDecoration(
                color: isCompleted ? AppColors.primary : Colors.transparent,
                borderRadius: BorderRadius.circular(6),
                border: Border.all(
                  color: isCompleted ? AppColors.primary : AppColors.border,
                  width: 2,
                ),
              ),
              child: isCompleted
                  ? const Icon(
                      Icons.check_rounded,
                      size: 16,
                      color: AppColors.textOnPrimary,
                    )
                  : null,
            ),
          ),
          const SizedBox(width: AppSpacing.md),

          // Category indicator
          Container(
            width: 4,
            height: 24,
            decoration: BoxDecoration(
              color: categoryColor,
              borderRadius: BorderRadius.circular(2),
            ),
          ),
          const SizedBox(width: AppSpacing.sm),

          // Habit name
          Expanded(
            child: Text(
              habit.habitName,
              style: AppTypography.body.copyWith(
                decoration: isCompleted ? TextDecoration.lineThrough : null,
                color: isCompleted
                    ? AppColors.textTertiary
                    : AppColors.textPrimary,
              ),
              maxLines: 1,
              overflow: TextOverflow.ellipsis,
            ),
          ),

          // Streak badge
          if (habit.currentStreak > 0) ...[
            Container(
              padding: const EdgeInsets.symmetric(
                horizontal: AppSpacing.sm,
                vertical: AppSpacing.xxs,
              ),
              decoration: BoxDecoration(
                color: AppColors.warning.withOpacity(0.15),
                borderRadius: BorderRadius.circular(AppSpacing.radiusFull),
              ),
              child: Row(
                mainAxisSize: MainAxisSize.min,
                children: [
                  const Text('🔥', style: TextStyle(fontSize: 12)),
                  const SizedBox(width: 2),
                  Text(
                    '${habit.currentStreak}',
                    style: AppTypography.labelSmall.copyWith(
                      color: AppColors.warning,
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
}
