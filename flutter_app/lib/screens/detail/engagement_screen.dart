import 'package:flutter/material.dart';
import 'package:provider/provider.dart';
import '../../config/app_colors.dart';
import '../../config/app_typography.dart';
import '../../config/app_spacing.dart';
import '../../models/engagement_models.dart';
import '../../providers/app_provider.dart';
import '../../widgets/common/mini_chart.dart';
import '../../widgets/common/progress_ring.dart';

/// Engagement Analytics Screen - Deep dive into engagement metrics
class EngagementScreen extends StatefulWidget {
  const EngagementScreen({super.key});

  @override
  State<EngagementScreen> createState() => _EngagementScreenState();
}

class _EngagementScreenState extends State<EngagementScreen>
    with SingleTickerProviderStateMixin {
  late TabController _tabController;
  bool _isLoading = true;
  EngagementSummary? _summary;
  StreakData? _streakData;
  MilestonesData? _milestonesData;
  EngagementAnalytics? _analytics;

  @override
  void initState() {
    super.initState();
    _tabController = TabController(length: 3, vsync: this);
    _loadData();
  }

  @override
  void dispose() {
    _tabController.dispose();
    super.dispose();
  }

  Future<void> _loadData() async {
    debugPrint('EngagementScreen: _loadData called');
    final appProvider = context.read<AppProvider>();
    final user = appProvider.authService.currentUser;

    if (user == null) {
      debugPrint('EngagementScreen: User is null! Cannot fetch data.');
      if (mounted) setState(() => _isLoading = false);
      return;
    }

    debugPrint('EngagementScreen: Fetching consistency for user ${user.uid}');
    try {
      final response =
          await appProvider.analyticsService.getConsistencyScore(user.uid);
      debugPrint(
          'EngagementScreen: Response received. Success: ${response.success}');

      if (!mounted) return;

      if (response.success && response.data != null) {
        debugPrint('EngagementScreen: Data found. Updating state.');
        final summary = response.data!;

        setState(() {
          _summary = summary;

          // Populate StreakData from summary
          _streakData = StreakData(
            name: 'Daily Logging',
            currentStreak: summary.engagement.currentLoggingStreak,
            longestStreak: summary.engagement.longestLoggingStreak,
            isActive: summary.engagement.currentLoggingStreak > 0,
            calendar: [], // Calendar data not available in simple summary yet
          );

          _isLoading = false;
        });
      } else {
        debugPrint(
            'EngagementScreen: Response failed or data null. Error: ${response.message}');
        setState(() => _isLoading = false);
      }
    } catch (e) {
      debugPrint('EngagementScreen: Error loading engagement data: $e');
      if (mounted) setState(() => _isLoading = false);
    }
  }

  @override
  Widget build(BuildContext context) {
    return Scaffold(
      backgroundColor: AppColors.background,
      appBar: AppBar(
        title: const Text('Engagement'),
        bottom: TabBar(
          controller: _tabController,
          tabs: const [
            Tab(text: 'Overview'),
            Tab(text: 'Streaks'),
            Tab(text: 'Milestones'),
          ],
        ),
      ),
      body: _isLoading
          ? const Center(child: CircularProgressIndicator())
          : TabBarView(
              controller: _tabController,
              children: [
                _buildOverviewTab(),
                _buildStreaksTab(),
                _buildMilestonesTab(),
              ],
            ),
    );
  }

  Widget _buildOverviewTab() {
    return SingleChildScrollView(
      padding: const EdgeInsets.all(AppSpacing.lg),
      child: Column(
        crossAxisAlignment: CrossAxisAlignment.start,
        children: [
          // Main engagement score
          _buildEngagementScoreCard(),

          const SizedBox(height: AppSpacing.xl),

          // Weekly activity
          Text('Weekly Activity', style: AppTypography.h4),
          const SizedBox(height: AppSpacing.md),
          _buildWeeklyActivityCard(),

          const SizedBox(height: AppSpacing.xl),

          // Category breakdown
          Text('Category Breakdown', style: AppTypography.h4),
          const SizedBox(height: AppSpacing.md),
          _buildCategoryBreakdown(),

          const SizedBox(height: AppSpacing.xl),

          // Trends
          Text('30-Day Trend', style: AppTypography.h4),
          const SizedBox(height: AppSpacing.md),
          _buildTrendChart(),
        ],
      ),
    );
  }

  Widget _buildEngagementScoreCard() {
    final score = _summary?.currentScore ?? 0;
    final trend = _summary?.trend ?? 0;

    return Container(
      padding: const EdgeInsets.all(AppSpacing.lg),
      decoration: BoxDecoration(
        gradient: const LinearGradient(
          colors: [AppColors.primary, Color(0xFF1DE9B6)],
          begin: Alignment.topLeft,
          end: Alignment.bottomRight,
        ),
        borderRadius: BorderRadius.circular(AppSpacing.radiusXl),
      ),
      child: Row(
        children: [
          Expanded(
            child: Column(
              crossAxisAlignment: CrossAxisAlignment.start,
              children: [
                Text(
                  'Engagement Score',
                  style: AppTypography.label.copyWith(
                    color: AppColors.textOnPrimary.withAlpha(204),
                  ),
                ),
                const SizedBox(height: AppSpacing.sm),
                Row(
                  crossAxisAlignment: CrossAxisAlignment.end,
                  children: [
                    Text(
                      score.toString(),
                      style: AppTypography.numberXLarge.copyWith(
                        color: AppColors.textOnPrimary,
                      ),
                    ),
                    const SizedBox(width: AppSpacing.sm),
                    Container(
                      padding: const EdgeInsets.symmetric(
                        horizontal: AppSpacing.sm,
                        vertical: 2,
                      ),
                      decoration: BoxDecoration(
                        color: trend >= 0
                            ? AppColors.textOnPrimary.withAlpha(51)
                            : AppColors.error.withAlpha(51),
                        borderRadius:
                            BorderRadius.circular(AppSpacing.radiusSm),
                      ),
                      child: Row(
                        mainAxisSize: MainAxisSize.min,
                        children: [
                          Icon(
                            trend >= 0
                                ? Icons.trending_up_rounded
                                : Icons.trending_down_rounded,
                            size: 16,
                            color: AppColors.textOnPrimary,
                          ),
                          const SizedBox(width: 4),
                          Text(
                            '${trend >= 0 ? '+' : ''}$trend%',
                            style: AppTypography.labelSmall.copyWith(
                              color: AppColors.textOnPrimary,
                            ),
                          ),
                        ],
                      ),
                    ),
                  ],
                ),
                const SizedBox(height: AppSpacing.sm),
                Text(
                  _getScoreDescription(score),
                  style: AppTypography.body.copyWith(
                    color: AppColors.textOnPrimary.withAlpha(204),
                  ),
                ),
              ],
            ),
          ),
          SizedBox(
            width: 100,
            height: 100,
            child: ProgressRing(
              progress: score / 100,
              strokeWidth: 10,
              backgroundColor: AppColors.textOnPrimary.withAlpha(51),
              progressColor: AppColors.textOnPrimary,
              child: Text(
                '${score.round()}',
                style: AppTypography.h3.copyWith(
                  color: AppColors.textOnPrimary,
                ),
              ),
            ),
          ),
        ],
      ),
    );
  }

  String _getScoreDescription(int score) {
    if (score >= 90) return 'Outstanding! You\'re crushing it!';
    if (score >= 75) return 'Great work! Keep it up!';
    if (score >= 50) return 'Good progress. Stay consistent!';
    if (score >= 25) return 'Building momentum. Keep going!';
    return 'Just getting started. Every log counts!';
  }

  Widget _buildWeeklyActivityCard() {
    // Use daily data from analytics if available, otherwise use defaults
    final dailyData = _analytics?.dailyData ?? [];
    final weeklyData = dailyData.length >= 7
        ? dailyData.sublist(dailyData.length - 7).map((d) => d.events).toList()
        : [3, 5, 2, 7, 4, 6, 3];

    return Container(
      padding: const EdgeInsets.all(AppSpacing.md),
      decoration: BoxDecoration(
        color: AppColors.surface,
        borderRadius: BorderRadius.circular(AppSpacing.radiusLg),
        border: Border.all(color: AppColors.border),
      ),
      child: Column(
        children: [
          Row(
            mainAxisAlignment: MainAxisAlignment.spaceBetween,
            children: [
              _WeekDayColumn(
                  day: 'Mon',
                  value: (weeklyData[0] as num).toInt(),
                  maxValue: 10),
              _WeekDayColumn(
                  day: 'Tue',
                  value: (weeklyData[1] as num).toInt(),
                  maxValue: 10),
              _WeekDayColumn(
                  day: 'Wed',
                  value: (weeklyData[2] as num).toInt(),
                  maxValue: 10),
              _WeekDayColumn(
                  day: 'Thu',
                  value: (weeklyData[3] as num).toInt(),
                  maxValue: 10),
              _WeekDayColumn(
                  day: 'Fri',
                  value: (weeklyData[4] as num).toInt(),
                  maxValue: 10),
              _WeekDayColumn(
                  day: 'Sat',
                  value: (weeklyData[5] as num).toInt(),
                  maxValue: 10),
              _WeekDayColumn(
                  day: 'Sun',
                  value: (weeklyData[6] as num).toInt(),
                  maxValue: 10,
                  isToday: true),
            ],
          ),
          const SizedBox(height: AppSpacing.md),
          const Divider(),
          const SizedBox(height: AppSpacing.sm),
          Row(
            mainAxisAlignment: MainAxisAlignment.spaceAround,
            children: [
              _QuickStat(
                label: 'Total',
                value: weeklyData
                    .fold<num>(0, (a, b) => a + (b as num))
                    .toString(),
              ),
              _QuickStat(
                label: 'Daily Avg',
                value: (weeklyData.fold<num>(0, (a, b) => a + (b as num)) / 7)
                    .toStringAsFixed(1),
              ),
              _QuickStat(
                label: 'Best Day',
                value: weeklyData
                    .reduce((a, b) => (a as num) > (b as num) ? a : b)
                    .toString(),
              ),
            ],
          ),
        ],
      ),
    );
  }

  Widget _buildCategoryBreakdown() {
    // Use category breakdown from summary if available
    final categories = _summary?.categoryBreakdown.isNotEmpty == true
        ? _summary!.categoryBreakdown
        : {
            'fitness': 30,
            'finance': 25,
            'health': 20,
            'mindfulness': 15,
            'routine': 10,
          };

    return Container(
      padding: const EdgeInsets.all(AppSpacing.md),
      decoration: BoxDecoration(
        color: AppColors.surface,
        borderRadius: BorderRadius.circular(AppSpacing.radiusLg),
        border: Border.all(color: AppColors.border),
      ),
      child: Column(
        children: categories.entries.map((entry) {
          final color = _getCategoryColor(entry.key);
          final percent = (entry.value as num).toDouble();

          return Padding(
            padding: const EdgeInsets.only(bottom: AppSpacing.md),
            child: Column(
              crossAxisAlignment: CrossAxisAlignment.start,
              children: [
                Row(
                  mainAxisAlignment: MainAxisAlignment.spaceBetween,
                  children: [
                    Text(
                      _formatCategoryName(entry.key),
                      style: AppTypography.body,
                    ),
                    Text(
                      '${percent.round()}%',
                      style: AppTypography.label.copyWith(color: color),
                    ),
                  ],
                ),
                const SizedBox(height: AppSpacing.xs),
                ClipRRect(
                  borderRadius: BorderRadius.circular(4),
                  child: LinearProgressIndicator(
                    value: percent / 100,
                    backgroundColor: AppColors.borderLight,
                    valueColor: AlwaysStoppedAnimation<Color>(color),
                    minHeight: 8,
                  ),
                ),
              ],
            ),
          );
        }).toList(),
      ),
    );
  }

  Color _getCategoryColor(String category) {
    switch (category.toLowerCase()) {
      case 'fitness':
        return AppColors.fitness;
      case 'finance':
        return AppColors.finance;
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

  String _formatCategoryName(String name) {
    return name[0].toUpperCase() + name.substring(1);
  }

  Widget _buildTrendChart() {
    // Use daily scores from analytics if available
    final dailyData = _analytics?.dailyData ?? [];
    final trendData = dailyData.isNotEmpty
        ? dailyData.map((d) => d.score).toList()
        : [45, 50, 48, 55, 52, 60, 58, 65, 62, 70, 68, 75];

    return Container(
      padding: const EdgeInsets.all(AppSpacing.md),
      decoration: BoxDecoration(
        color: AppColors.surface,
        borderRadius: BorderRadius.circular(AppSpacing.radiusLg),
        border: Border.all(color: AppColors.border),
      ),
      child: Column(
        children: [
          SizedBox(
            height: 150,
            child: MiniLineChart(
              data: trendData.map((e) => (e as num).toDouble()).toList(),
              height: 150,
              lineColor: AppColors.primary,
            ),
          ),
          const SizedBox(height: AppSpacing.md),
          Row(
            mainAxisAlignment: MainAxisAlignment.spaceBetween,
            children: [
              Text('30 days ago', style: AppTypography.caption),
              Text('Today', style: AppTypography.caption),
            ],
          ),
        ],
      ),
    );
  }

  Widget _buildStreaksTab() {
    if (_streakData == null) {
      return _buildEmptyState(
        icon: Icons.local_fire_department_rounded,
        title: 'No streaks yet',
        subtitle: 'Log consistently to build streaks',
      );
    }

    return SingleChildScrollView(
      padding: const EdgeInsets.all(AppSpacing.lg),
      child: Column(
        crossAxisAlignment: CrossAxisAlignment.start,
        children: [
          _StreakCard(streak: _streakData!),
          const SizedBox(height: AppSpacing.xl),
          Text('Streak Calendar', style: AppTypography.h4),
          const SizedBox(height: AppSpacing.md),
          _buildStreakCalendar(),
        ],
      ),
    );
  }

  Widget _buildStreakCalendar() {
    final calendar = _streakData?.calendar ?? [];
    if (calendar.isEmpty) {
      return Container(
        padding: const EdgeInsets.all(AppSpacing.lg),
        decoration: BoxDecoration(
          color: AppColors.surface,
          borderRadius: BorderRadius.circular(AppSpacing.radiusLg),
          border: Border.all(color: AppColors.border),
        ),
        child: const Center(
          child: Text('No calendar data available'),
        ),
      );
    }

    return Container(
      padding: const EdgeInsets.all(AppSpacing.md),
      decoration: BoxDecoration(
        color: AppColors.surface,
        borderRadius: BorderRadius.circular(AppSpacing.radiusLg),
        border: Border.all(color: AppColors.border),
      ),
      child: Wrap(
        spacing: 4,
        runSpacing: 4,
        children: calendar.map((day) {
          return Container(
            width: 32,
            height: 32,
            decoration: BoxDecoration(
              color: day.hasActivity
                  ? AppColors.primary.withAlpha(day.eventCount > 3 ? 255 : 128)
                  : AppColors.backgroundSecondary,
              borderRadius: BorderRadius.circular(4),
            ),
            child: Center(
              child: Text(
                '${day.date.day}',
                style: AppTypography.labelSmall.copyWith(
                  color: day.hasActivity
                      ? AppColors.textOnPrimary
                      : AppColors.textTertiary,
                ),
              ),
            ),
          );
        }).toList(),
      ),
    );
  }

  Widget _buildMilestonesTab() {
    final achieved = _milestonesData?.achieved ?? [];
    final upcoming = _milestonesData?.upcoming ?? [];

    return SingleChildScrollView(
      padding: const EdgeInsets.all(AppSpacing.lg),
      child: Column(
        crossAxisAlignment: CrossAxisAlignment.start,
        children: [
          if (achieved.isNotEmpty) ...[
            Text('Achieved', style: AppTypography.h4),
            const SizedBox(height: AppSpacing.md),
            ...achieved
                .map((m) => _MilestoneCard(milestone: m, achieved: true)),
            const SizedBox(height: AppSpacing.xl),
          ],
          if (upcoming.isNotEmpty) ...[
            Text('Upcoming', style: AppTypography.h4),
            const SizedBox(height: AppSpacing.md),
            ...upcoming
                .map((m) => _MilestoneCard(milestone: m, achieved: false)),
          ],
          if (achieved.isEmpty && upcoming.isEmpty)
            _buildEmptyState(
              icon: Icons.emoji_events_rounded,
              title: 'No milestones yet',
              subtitle: 'Keep logging to unlock milestones',
            ),
        ],
      ),
    );
  }

  Widget _buildEmptyState({
    required IconData icon,
    required String title,
    required String subtitle,
  }) {
    return Center(
      child: Padding(
        padding: const EdgeInsets.all(AppSpacing.xxl),
        child: Column(
          mainAxisAlignment: MainAxisAlignment.center,
          children: [
            Icon(icon, size: 64, color: AppColors.textTertiary),
            const SizedBox(height: AppSpacing.md),
            Text(
              title,
              style: AppTypography.h4.copyWith(color: AppColors.textSecondary),
            ),
            const SizedBox(height: AppSpacing.sm),
            Text(
              subtitle,
              style: AppTypography.body.copyWith(color: AppColors.textTertiary),
              textAlign: TextAlign.center,
            ),
          ],
        ),
      ),
    );
  }
}

/// Week day column for activity chart
class _WeekDayColumn extends StatelessWidget {
  final String day;
  final int value;
  final int maxValue;
  final bool isToday;

  const _WeekDayColumn({
    required this.day,
    required this.value,
    required this.maxValue,
    this.isToday = false,
  });

  @override
  Widget build(BuildContext context) {
    final height = (value / maxValue) * 80;

    return Column(
      children: [
        Container(
          width: 32,
          height: 80,
          alignment: Alignment.bottomCenter,
          child: AnimatedContainer(
            duration: const Duration(milliseconds: 300),
            width: 24,
            height: height.clamp(4, 80),
            decoration: BoxDecoration(
              color: isToday ? AppColors.primary : AppColors.primaryLight,
              borderRadius: const BorderRadius.vertical(
                top: Radius.circular(4),
              ),
            ),
          ),
        ),
        const SizedBox(height: AppSpacing.sm),
        Text(
          day,
          style: AppTypography.caption.copyWith(
            color: isToday ? AppColors.primary : AppColors.textSecondary,
            fontWeight: isToday ? FontWeight.w600 : FontWeight.normal,
          ),
        ),
      ],
    );
  }
}

/// Quick stat widget
class _QuickStat extends StatelessWidget {
  final String label;
  final String value;

  const _QuickStat({
    required this.label,
    required this.value,
  });

  @override
  Widget build(BuildContext context) {
    return Column(
      children: [
        Text(
          value,
          style: AppTypography.h4.copyWith(color: AppColors.primary),
        ),
        Text(label, style: AppTypography.caption),
      ],
    );
  }
}

/// Streak card widget
class _StreakCard extends StatelessWidget {
  final StreakData streak;

  const _StreakCard({required this.streak});

  @override
  Widget build(BuildContext context) {
    return Container(
      margin: const EdgeInsets.only(bottom: AppSpacing.md),
      padding: const EdgeInsets.all(AppSpacing.md),
      decoration: BoxDecoration(
        color: AppColors.surface,
        borderRadius: BorderRadius.circular(AppSpacing.radiusLg),
        border: Border.all(color: AppColors.border),
      ),
      child: Row(
        children: [
          Container(
            width: 56,
            height: 56,
            decoration: BoxDecoration(
              color: streak.isActive
                  ? AppColors.primaryLight
                  : AppColors.backgroundSecondary,
              borderRadius: BorderRadius.circular(AppSpacing.radiusMd),
            ),
            child: Column(
              mainAxisAlignment: MainAxisAlignment.center,
              children: [
                Icon(
                  Icons.local_fire_department_rounded,
                  color: streak.isActive
                      ? AppColors.primary
                      : AppColors.textTertiary,
                  size: 24,
                ),
                Text(
                  '${streak.currentStreak}',
                  style: AppTypography.label.copyWith(
                    color: streak.isActive
                        ? AppColors.primary
                        : AppColors.textTertiary,
                  ),
                ),
              ],
            ),
          ),
          const SizedBox(width: AppSpacing.md),
          Expanded(
            child: Column(
              crossAxisAlignment: CrossAxisAlignment.start,
              children: [
                Text(streak.name ?? 'Logging Streak',
                    style: AppTypography.body),
                const SizedBox(height: 4),
                Text(
                  streak.isActive
                      ? 'Active - ${streak.currentStreak} days'
                      : 'Best: ${streak.longestStreak} days',
                  style: AppTypography.caption,
                ),
              ],
            ),
          ),
          if (streak.isActive)
            Container(
              padding: const EdgeInsets.symmetric(
                horizontal: AppSpacing.sm,
                vertical: 4,
              ),
              decoration: BoxDecoration(
                color: AppColors.success.withAlpha(26),
                borderRadius: BorderRadius.circular(AppSpacing.radiusSm),
              ),
              child: Text(
                'Active',
                style: AppTypography.labelSmall.copyWith(
                  color: AppColors.success,
                ),
              ),
            ),
        ],
      ),
    );
  }
}

/// Milestone card widget
class _MilestoneCard extends StatelessWidget {
  final Milestone milestone;
  final bool achieved;

  const _MilestoneCard({
    required this.milestone,
    required this.achieved,
  });

  @override
  Widget build(BuildContext context) {
    return Container(
      margin: const EdgeInsets.only(bottom: AppSpacing.md),
      padding: const EdgeInsets.all(AppSpacing.md),
      decoration: BoxDecoration(
        color: achieved ? AppColors.primaryLight : AppColors.surface,
        borderRadius: BorderRadius.circular(AppSpacing.radiusLg),
        border: Border.all(
          color: achieved ? AppColors.primary.withAlpha(51) : AppColors.border,
        ),
      ),
      child: Row(
        children: [
          Container(
            width: 48,
            height: 48,
            decoration: BoxDecoration(
              color:
                  achieved ? AppColors.primary : AppColors.backgroundSecondary,
              borderRadius: BorderRadius.circular(AppSpacing.radiusMd),
            ),
            child: Icon(
              _getMilestoneIcon(),
              color:
                  achieved ? AppColors.textOnPrimary : AppColors.textTertiary,
              size: 24,
            ),
          ),
          const SizedBox(width: AppSpacing.md),
          Expanded(
            child: Column(
              crossAxisAlignment: CrossAxisAlignment.start,
              children: [
                Text(
                  milestone.title,
                  style: AppTypography.body.copyWith(
                    fontWeight: FontWeight.w600,
                  ),
                ),
                const SizedBox(height: 4),
                Text(
                  milestone.description,
                  style: AppTypography.caption,
                ),
                if (!achieved && milestone.progress > 0) ...[
                  const SizedBox(height: AppSpacing.sm),
                  Row(
                    children: [
                      Expanded(
                        child: ClipRRect(
                          borderRadius: BorderRadius.circular(4),
                          child: LinearProgressIndicator(
                            value: milestone.progress,
                            backgroundColor: AppColors.borderLight,
                            valueColor: const AlwaysStoppedAnimation<Color>(
                              AppColors.primary,
                            ),
                            minHeight: 6,
                          ),
                        ),
                      ),
                      const SizedBox(width: AppSpacing.sm),
                      Text(
                        '${(milestone.progress * 100).round()}%',
                        style: AppTypography.caption,
                      ),
                    ],
                  ),
                ],
              ],
            ),
          ),
          if (achieved)
            const Icon(
              Icons.check_circle_rounded,
              color: AppColors.primary,
              size: 24,
            ),
        ],
      ),
    );
  }

  IconData _getMilestoneIcon() {
    switch (milestone.type) {
      case 'streak':
        return Icons.local_fire_department_rounded;
      case 'count':
        return Icons.format_list_numbered_rounded;
      case 'category':
        return Icons.category_rounded;
      case 'time':
        return Icons.schedule_rounded;
      default:
        return Icons.emoji_events_rounded;
    }
  }
}
