import 'package:flutter/material.dart';
import '../config/app_colors.dart';
import '../config/app_spacing.dart';
import '../config/app_typography.dart';
import '../widgets/widgets.dart';

/// Simple widget showcase displaying all common widgets with mock data
class WidgetShowcaseScreen extends StatelessWidget {
  const WidgetShowcaseScreen({super.key});

  @override
  Widget build(BuildContext context) {
    return Scaffold(
      appBar: AppBar(
        title: const Text('Widget Showcase'),
        backgroundColor: AppColors.surface,
        elevation: 0,
      ),
      body: ListView(
        padding: AppSpacing.paddingScreen,
        children: [
          _sectionHeader('Common Widgets'),
          const SizedBox(height: 16),

          // BaseCard
          BaseCard(
            child: Padding(
              padding: AppSpacing.paddingMd,
              child: Column(
                crossAxisAlignment: CrossAxisAlignment.start,
                children: [
                  Text('Base Card', style: AppTypography.widgetTitle),
                  const SizedBox(height: 8),
                  Text(
                    'Standard card container used throughout the app',
                    style: AppTypography.bodySmall,
                  ),
                ],
              ),
            ),
          ),
          const SizedBox(height: 16),

          // Category Chips
          Text('Category Chips', style: AppTypography.widgetTitle),
          const SizedBox(height: 8),
          Wrap(
            spacing: 8,
            runSpacing: 8,
            children: const [
              CategoryChip(category: 'fitness'),
              CategoryChip(category: 'finance'),
              CategoryChip(category: 'health'),
              CategoryChip(category: 'mindfulness'),
              CategoryChip(category: 'routine'),
            ],
          ),
          const SizedBox(height: 24),

          // Confidence Indicators
          Text('Confidence Indicators', style: AppTypography.widgetTitle),
          const SizedBox(height: 8),
          Row(
            children: const [
              Expanded(child: ConfidenceIndicator(confidence: 0.95)),
              SizedBox(width: 8),
              Expanded(child: ConfidenceIndicator(confidence: 0.65)),
              SizedBox(width: 8),
              Expanded(child: ConfidenceIndicator(confidence: 0.35)),
            ],
          ),
          const SizedBox(height: 24),

          // Single Metrics
          Text('Single Metrics', style: AppTypography.widgetTitle),
          const SizedBox(height: 8),
          Row(
            children: const [
              Expanded(
                child: SingleMetric(
                  value: '124',
                  label: 'Workouts',
                  trend: 'up',
                  trendValue: '+12%',
                ),
              ),
              SizedBox(width: 8),
              Expanded(
                child: SingleMetric(
                  value: '\$1,234',
                  label: 'Saved',
                  trend: 'down',
                  trendValue: '-5%',
                ),
              ),
            ],
          ),
          const SizedBox(height: 24),

          // Progress Rings
          Text('Progress Rings', style: AppTypography.widgetTitle),
          const SizedBox(height: 8),
          Row(
            mainAxisAlignment: MainAxisAlignment.spaceAround,
            children: [
              ProgressRing(
                progress: 0.85,
                size: 80,
                strokeWidth: 8,
                progressColor: AppColors.primary,
                label: 'Engagement',
              ),
              ProgressRing(
                progress: 0.60,
                size: 80,
                strokeWidth: 8,
                progressColor: AppColors.fitness,
                label: 'Fitness',
              ),
              ProgressRing(
                progress: 0.35,
                size: 80,
                strokeWidth: 8,
                progressColor: AppColors.warning,
                label: 'Finance',
              ),
            ],
          ),
          const SizedBox(height: 32),

          _sectionHeader('Insight Widgets'),
          const SizedBox(height: 16),

          // Achievement Unlocked Widget
          const AchievementUnlockedWidget(
            name: '7-Day Streak!',
            description: 'You logged activities for 7 consecutive days',
            icon: '🔥',
          ),
          const SizedBox(height: 16),

          // AI Recommendation Widget
          const AIRecommendationWidget(
            recommendation: 'Try meditation before bed',
            reasoning:
                'Based on your sleep patterns, meditation might improve quality',
          ),
          const SizedBox(height: 16),

          // Streak Milestone Widget
          const StreakMilestoneWidget(streakDays: 12),
          const SizedBox(height: 32),

          _sectionHeader('Input Concepts'),
          const SizedBox(height: 16),

          // Voice-first examples
          BaseCard(
            child: Padding(
              padding: AppSpacing.paddingMd,
              child: Column(
                crossAxisAlignment: CrossAxisAlignment.start,
                children: [
                  Text(
                    'Voice-First Input Examples',
                    style: AppTypography.widgetTitle,
                  ),
                  const SizedBox(height: 12),
                  _buildExampleInput(
                    '💪 Fitness',
                    '"Went to gym for leg workout 1 hour"',
                    AppColors.fitness,
                  ),
                  const SizedBox(height: 8),
                  _buildExampleInput(
                    '💵 Finance',
                    '"Spent \$45.50 on groceries"',
                    AppColors.finance,
                  ),
                  const SizedBox(height: 8),
                  _buildExampleInput(
                    '🧘 Mindfulness',
                    '"Meditated for 15 minutes"',
                    AppColors.mindfulness,
                  ),
                  const SizedBox(height: 8),
                  _buildExampleInput(
                    '❤️ Health',
                    '"Slept 7.5 hours • felt refreshed"',
                    AppColors.health,
                  ),
                ],
              ),
            ),
          ),

          const SizedBox(height: 32),
          _sectionHeader('Color System'),
          const SizedBox(height: 16),

          // Color palette
          _buildColorRow('Primary', AppColors.primary, AppColors.primaryLight),
          const SizedBox(height: 8),
          _buildColorRow('Fitness', AppColors.fitness, AppColors.fitnessLight),
          const SizedBox(height: 8),
          _buildColorRow('Finance', AppColors.finance, AppColors.financeLight),
          const SizedBox(height: 8),
          _buildColorRow('Health', AppColors.health, AppColors.healthLight),
          const SizedBox(height: 8),
          _buildColorRow(
            'Mindfulness',
            AppColors.mindfulness,
            AppColors.mindfulnessLight,
          ),
          const SizedBox(height: 8),
          _buildColorRow('Routine', AppColors.routine, AppColors.routineLight),

          const SizedBox(height: 64),
        ],
      ),
    );
  }

  Widget _sectionHeader(String title) {
    return Text(title, style: AppTypography.h3);
  }

  Widget _buildExampleInput(String category, String example, Color color) {
    return Row(
      crossAxisAlignment: CrossAxisAlignment.start,
      children: [
        Text(category, style: AppTypography.label.copyWith(color: color)),
        const SizedBox(width: 8),
        Expanded(
          child: Text(
            example,
            style: AppTypography.body.copyWith(
              color: AppColors.textSecondary,
              fontStyle: FontStyle.italic,
            ),
          ),
        ),
      ],
    );
  }

  Widget _buildColorRow(String name, Color main, Color light) {
    return Row(
      children: [
        Expanded(child: Text(name, style: AppTypography.body)),
        Container(
          width: 60,
          height: 40,
          decoration: BoxDecoration(
            color: main,
            borderRadius: BorderRadius.circular(8),
          ),
        ),
        const SizedBox(width: 8),
        Container(
          width: 60,
          height: 40,
          decoration: BoxDecoration(
            color: light,
            borderRadius: BorderRadius.circular(8),
          ),
        ),
      ],
    );
  }
}
