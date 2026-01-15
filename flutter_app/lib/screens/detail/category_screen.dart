import 'package:flutter/material.dart';
import 'package:provider/provider.dart';
import '../../config/app_colors.dart';
import '../../config/app_typography.dart';
import '../../config/app_spacing.dart';
import '../../config/config.dart';
import '../../models/input_models.dart';
import '../../providers/app_provider.dart';
import '../../widgets/common/mini_chart.dart';
import '../../widgets/common/progress_ring.dart';
import 'memories_screen.dart';

/// Category Explorer Screen - Deep dive into a specific category
class CategoryScreen extends StatefulWidget {
  final AppCategory category;

  const CategoryScreen({super.key, required this.category});

  @override
  State<CategoryScreen> createState() => _CategoryScreenState();
}

class _CategoryScreenState extends State<CategoryScreen>
    with SingleTickerProviderStateMixin {
  late TabController _tabController;
  bool _isLoading = true;
  Map<String, dynamic> _stats = {};
  List<Memory> _recentMemories = [];

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
    setState(() => _isLoading = true);

    final app = context.read<AppProvider>();

    // Load stats and memories in parallel
    final statsResult = await app.memoryService.getCategoryStats();
    final memoriesResult = await app.memoryService.getMemories(category: widget.category.name, limit: 5);

    if (mounted) {
      setState(() {
        _stats = statsResult.data ?? {};
        _recentMemories = memoriesResult.data ?? [];
        _isLoading = false;
      });
    }
  }

  @override
  Widget build(BuildContext context) {
    final color = widget.category.color;

    return Scaffold(
      backgroundColor: AppColors.background,
      body: NestedScrollView(
        headerSliverBuilder: (context, innerBoxIsScrolled) {
          return [
            // Custom app bar with category header
            SliverAppBar(
              expandedHeight: 200,
              pinned: true,
              backgroundColor: color,
              foregroundColor: AppColors.textOnPrimary,
              flexibleSpace: FlexibleSpaceBar(
                background: _buildHeader(color),
              ),
              bottom: TabBar(
                controller: _tabController,
                indicatorColor: AppColors.textOnPrimary,
                labelColor: AppColors.textOnPrimary,
                unselectedLabelColor: AppColors.textOnPrimary.withAlpha(179),
                tabs: const [
                  Tab(text: 'Overview'),
                  Tab(text: 'Stats'),
                  Tab(text: 'History'),
                ],
              ),
            ),
          ];
        },
        body: _isLoading
            ? const Center(child: CircularProgressIndicator())
            : TabBarView(
                controller: _tabController,
                children: [
                  _buildOverviewTab(),
                  _buildStatsTab(),
                  _buildHistoryTab(),
                ],
              ),
      ),
    );
  }

  Widget _buildHeader(Color color) {
    return Container(
      decoration: BoxDecoration(
        gradient: LinearGradient(
          begin: Alignment.topLeft,
          end: Alignment.bottomRight,
          colors: [color, color.withAlpha(204)],
        ),
      ),
      padding: const EdgeInsets.fromLTRB(
        AppSpacing.lg,
        100,
        AppSpacing.lg,
        60,
      ),
      child: Column(
        crossAxisAlignment: CrossAxisAlignment.start,
        children: [
          Row(
            children: [
              Container(
                padding: const EdgeInsets.all(AppSpacing.sm),
                decoration: BoxDecoration(
                  color: AppColors.textOnPrimary.withAlpha(51),
                  borderRadius: BorderRadius.circular(AppSpacing.radiusMd),
                ),
                child: Icon(
                  widget.category.icon,
                  color: AppColors.textOnPrimary,
                  size: 28,
                ),
              ),
              const SizedBox(width: AppSpacing.md),
              Text(
                widget.category.displayName,
                style: AppTypography.h2.copyWith(
                  color: AppColors.textOnPrimary,
                ),
              ),
            ],
          ),
          const SizedBox(height: AppSpacing.sm),
          Text(
            _getCategoryDescription(),
            style: AppTypography.body.copyWith(
              color: AppColors.textOnPrimary.withAlpha(204),
            ),
          ),
        ],
      ),
    );
  }

  String _getCategoryDescription() {
    switch (widget.category) {
      case AppCategory.fitness:
        return 'Track workouts, exercises, and physical activities';
      case AppCategory.finance:
        return 'Monitor spending, savings, and financial goals';
      case AppCategory.health:
        return 'Log health metrics, symptoms, and wellness';
      case AppCategory.mindfulness:
        return 'Capture meditation, mood, and mental wellness';
      case AppCategory.routine:
        return 'Track daily habits and recurring activities';
      case AppCategory.generic:
        return 'General memories and life events';
    }
  }

  Widget _buildOverviewTab() {
    final color = widget.category.color;

    return SingleChildScrollView(
      padding: const EdgeInsets.all(AppSpacing.lg),
      child: Column(
        crossAxisAlignment: CrossAxisAlignment.start,
        children: [
          // Quick stats cards
          Row(
            children: [
              Expanded(
                child: _StatCard(
                  title: 'This Week',
                  value: '${_stats['this_week'] ?? 0}',
                  subtitle: 'entries',
                  color: color,
                ),
              ),
              const SizedBox(width: AppSpacing.md),
              Expanded(
                child: _StatCard(
                  title: 'This Month',
                  value: '${_stats['this_month'] ?? 0}',
                  subtitle: 'entries',
                  color: color,
                ),
              ),
            ],
          ),
          const SizedBox(height: AppSpacing.md),
          Row(
            children: [
              Expanded(
                child: _StatCard(
                  title: 'Total',
                  value: '${_stats['total'] ?? 0}',
                  subtitle: 'all time',
                  color: color,
                ),
              ),
              const SizedBox(width: AppSpacing.md),
              Expanded(
                child: _StatCard(
                  title: 'Streak',
                  value: '${_stats['streak'] ?? 0}',
                  subtitle: 'days',
                  color: color,
                ),
              ),
            ],
          ),

          const SizedBox(height: AppSpacing.xl),

          // Weekly activity chart
          Text('Weekly Activity', style: AppTypography.h4),
          const SizedBox(height: AppSpacing.md),
          Container(
            padding: const EdgeInsets.all(AppSpacing.md),
            decoration: BoxDecoration(
              color: AppColors.surface,
              borderRadius: BorderRadius.circular(AppSpacing.radiusLg),
              border: Border.all(color: AppColors.border),
            ),
            child: Column(
              children: [
                SizedBox(
                  height: 120,
                  child: MiniBarChart(
                    data: _getWeeklyData(),
                    barColor: color,
                    height: 120,
                  ),
                ),
                const SizedBox(height: AppSpacing.sm),
                Row(
                  mainAxisAlignment: MainAxisAlignment.spaceBetween,
                  children: ['Mon', 'Tue', 'Wed', 'Thu', 'Fri', 'Sat', 'Sun']
                      .map((day) => Text(day, style: AppTypography.caption))
                      .toList(),
                ),
              ],
            ),
          ),

          const SizedBox(height: AppSpacing.xl),

          // Recent entries
          Row(
            children: [
              Text('Recent Entries', style: AppTypography.h4),
              const Spacer(),
              TextButton(
                onPressed: () => _navigateToMemories(),
                child: const Text('See All'),
              ),
            ],
          ),
          const SizedBox(height: AppSpacing.md),
          if (_recentMemories.isEmpty)
            _buildEmptyRecentMemories()
          else
            ..._recentMemories.map((memory) => _RecentMemoryTile(memory: memory)),
        ],
      ),
    );
  }

  Widget _buildEmptyRecentMemories() {
    return Container(
      padding: const EdgeInsets.all(AppSpacing.xl),
      decoration: BoxDecoration(
        color: AppColors.surface,
        borderRadius: BorderRadius.circular(AppSpacing.radiusLg),
        border: Border.all(color: AppColors.border),
      ),
      child: Column(
        children: [
          Icon(
            widget.category.icon,
            size: 48,
            color: AppColors.textTertiary,
          ),
          const SizedBox(height: AppSpacing.md),
          Text(
            'No entries yet',
            style: AppTypography.body.copyWith(color: AppColors.textSecondary),
          ),
          const SizedBox(height: AppSpacing.sm),
          Text(
            'Start logging to see your ${widget.category.displayName.toLowerCase()} history',
            style: AppTypography.caption,
            textAlign: TextAlign.center,
          ),
        ],
      ),
    );
  }

  Widget _buildStatsTab() {
    final color = widget.category.color;

    return SingleChildScrollView(
      padding: const EdgeInsets.all(AppSpacing.lg),
      child: Column(
        crossAxisAlignment: CrossAxisAlignment.start,
        children: [
          // Category-specific stats
          _buildCategorySpecificStats(color),

          const SizedBox(height: AppSpacing.xl),

          // Time distribution
          Text('Best Time to Log', style: AppTypography.h4),
          const SizedBox(height: AppSpacing.md),
          Container(
            padding: const EdgeInsets.all(AppSpacing.md),
            decoration: BoxDecoration(
              color: AppColors.surface,
              borderRadius: BorderRadius.circular(AppSpacing.radiusLg),
              border: Border.all(color: AppColors.border),
            ),
            child: Column(
              children: [
                _TimeDistributionRow(
                  label: 'Morning (6am-12pm)',
                  value: (_stats['morning_percent'] ?? 30).toDouble(),
                  color: color,
                ),
                const SizedBox(height: AppSpacing.md),
                _TimeDistributionRow(
                  label: 'Afternoon (12pm-6pm)',
                  value: (_stats['afternoon_percent'] ?? 45).toDouble(),
                  color: color,
                ),
                const SizedBox(height: AppSpacing.md),
                _TimeDistributionRow(
                  label: 'Evening (6pm-12am)',
                  value: (_stats['evening_percent'] ?? 25).toDouble(),
                  color: color,
                ),
              ],
            ),
          ),

          const SizedBox(height: AppSpacing.xl),

          // Monthly trend
          Text('Monthly Trend', style: AppTypography.h4),
          const SizedBox(height: AppSpacing.md),
          Container(
            padding: const EdgeInsets.all(AppSpacing.md),
            decoration: BoxDecoration(
              color: AppColors.surface,
              borderRadius: BorderRadius.circular(AppSpacing.radiusLg),
              border: Border.all(color: AppColors.border),
            ),
            child: SizedBox(
              height: 150,
              child: MiniLineChart(
                data: _getMonthlyData(),
                lineColor: color,
                height: 150,
              ),
            ),
          ),
        ],
      ),
    );
  }

  Widget _buildCategorySpecificStats(Color color) {
    switch (widget.category) {
      case AppCategory.fitness:
        return _buildFitnessStats(color);
      case AppCategory.finance:
        return _buildFinanceStats(color);
      case AppCategory.health:
        return _buildHealthStats(color);
      case AppCategory.mindfulness:
        return _buildMindfulnessStats(color);
      default:
        return _buildGenericStats(color);
    }
  }

  Widget _buildFitnessStats(Color color) {
    return Column(
      crossAxisAlignment: CrossAxisAlignment.start,
      children: [
        Text('Fitness Summary', style: AppTypography.h4),
        const SizedBox(height: AppSpacing.md),
        Row(
          children: [
            Expanded(
              child: _DetailStatCard(
                icon: Icons.timer_outlined,
                title: 'Total Time',
                value: '${_stats['total_minutes'] ?? 0}',
                unit: 'min',
                color: color,
              ),
            ),
            const SizedBox(width: AppSpacing.md),
            Expanded(
              child: _DetailStatCard(
                icon: Icons.local_fire_department_outlined,
                title: 'Calories',
                value: '${_stats['total_calories'] ?? 0}',
                unit: 'burned',
                color: color,
              ),
            ),
          ],
        ),
        const SizedBox(height: AppSpacing.md),
        Row(
          children: [
            Expanded(
              child: _DetailStatCard(
                icon: Icons.fitness_center_rounded,
                title: 'Workouts',
                value: '${_stats['workout_count'] ?? 0}',
                unit: 'sessions',
                color: color,
              ),
            ),
            const SizedBox(width: AppSpacing.md),
            Expanded(
              child: _DetailStatCard(
                icon: Icons.trending_up_rounded,
                title: 'Avg Duration',
                value: '${_stats['avg_duration'] ?? 0}',
                unit: 'min',
                color: color,
              ),
            ),
          ],
        ),
      ],
    );
  }

  Widget _buildFinanceStats(Color color) {
    return Column(
      crossAxisAlignment: CrossAxisAlignment.start,
      children: [
        Text('Finance Summary', style: AppTypography.h4),
        const SizedBox(height: AppSpacing.md),
        Row(
          children: [
            Expanded(
              child: _DetailStatCard(
                icon: Icons.shopping_bag_outlined,
                title: 'Total Spent',
                value: '\$${_stats['total_spent'] ?? 0}',
                unit: 'this month',
                color: color,
              ),
            ),
            const SizedBox(width: AppSpacing.md),
            Expanded(
              child: _DetailStatCard(
                icon: Icons.receipt_long_outlined,
                title: 'Transactions',
                value: '${_stats['transaction_count'] ?? 0}',
                unit: 'entries',
                color: color,
              ),
            ),
          ],
        ),
        const SizedBox(height: AppSpacing.md),
        Row(
          children: [
            Expanded(
              child: _DetailStatCard(
                icon: Icons.trending_down_rounded,
                title: 'Avg Purchase',
                value: '\$${_stats['avg_amount'] ?? 0}',
                unit: 'per entry',
                color: color,
              ),
            ),
            const SizedBox(width: AppSpacing.md),
            Expanded(
              child: _DetailStatCard(
                icon: Icons.category_outlined,
                title: 'Top Category',
                value: _stats['top_subcategory'] ?? 'N/A',
                unit: '',
                color: color,
              ),
            ),
          ],
        ),
      ],
    );
  }

  Widget _buildHealthStats(Color color) {
    return Column(
      crossAxisAlignment: CrossAxisAlignment.start,
      children: [
        Text('Health Summary', style: AppTypography.h4),
        const SizedBox(height: AppSpacing.md),
        Row(
          children: [
            Expanded(
              child: _DetailStatCard(
                icon: Icons.monitor_heart_outlined,
                title: 'Check-ins',
                value: '${_stats['checkin_count'] ?? 0}',
                unit: 'this month',
                color: color,
              ),
            ),
            const SizedBox(width: AppSpacing.md),
            Expanded(
              child: _DetailStatCard(
                icon: Icons.medical_services_outlined,
                title: 'Symptoms',
                value: '${_stats['symptom_count'] ?? 0}',
                unit: 'logged',
                color: color,
              ),
            ),
          ],
        ),
      ],
    );
  }

  Widget _buildMindfulnessStats(Color color) {
    return Column(
      crossAxisAlignment: CrossAxisAlignment.start,
      children: [
        Text('Mindfulness Summary', style: AppTypography.h4),
        const SizedBox(height: AppSpacing.md),
        Row(
          children: [
            Expanded(
              child: _DetailStatCard(
                icon: Icons.self_improvement_rounded,
                title: 'Sessions',
                value: '${_stats['session_count'] ?? 0}',
                unit: 'meditations',
                color: color,
              ),
            ),
            const SizedBox(width: AppSpacing.md),
            Expanded(
              child: _DetailStatCard(
                icon: Icons.timer_outlined,
                title: 'Total Time',
                value: '${_stats['total_minutes'] ?? 0}',
                unit: 'minutes',
                color: color,
              ),
            ),
          ],
        ),
        const SizedBox(height: AppSpacing.md),
        Row(
          children: [
            Expanded(
              child: _DetailStatCard(
                icon: Icons.mood_rounded,
                title: 'Avg Mood',
                value: '${(_stats['avg_mood'] ?? 0).toStringAsFixed(1)}',
                unit: '/10',
                color: color,
              ),
            ),
            const SizedBox(width: AppSpacing.md),
            const Expanded(child: SizedBox()),
          ],
        ),
      ],
    );
  }

  Widget _buildGenericStats(Color color) {
    return Column(
      crossAxisAlignment: CrossAxisAlignment.start,
      children: [
        Text('Activity Summary', style: AppTypography.h4),
        const SizedBox(height: AppSpacing.md),
        Row(
          children: [
            Expanded(
              child: _DetailStatCard(
                icon: Icons.note_add_outlined,
                title: 'Entries',
                value: '${_stats['total'] ?? 0}',
                unit: 'total',
                color: color,
              ),
            ),
            const SizedBox(width: AppSpacing.md),
            Expanded(
              child: _DetailStatCard(
                icon: Icons.calendar_today_outlined,
                title: 'This Week',
                value: '${_stats['this_week'] ?? 0}',
                unit: 'entries',
                color: color,
              ),
            ),
          ],
        ),
      ],
    );
  }

  Widget _buildHistoryTab() {
    return MemoriesScreen(initialCategory: widget.category);
  }

  List<double> _getWeeklyData() {
    final data = _stats['weekly_data'] as List?;
    if (data != null) {
      return data.map((e) => (e as num).toDouble()).toList();
    }
    // Sample data
    return [3, 5, 2, 7, 4, 6, 3];
  }

  List<double> _getMonthlyData() {
    final data = _stats['monthly_data'] as List?;
    if (data != null) {
      return data.map((e) => (e as num).toDouble()).toList();
    }
    // Sample data
    return [10, 15, 12, 18, 14, 20, 17, 22, 19, 25, 21, 28];
  }

  void _navigateToMemories() {
    Navigator.push(
      context,
      MaterialPageRoute(
        builder: (context) => MemoriesScreen(initialCategory: widget.category),
      ),
    );
  }
}

/// Stat card widget
class _StatCard extends StatelessWidget {
  final String title;
  final String value;
  final String subtitle;
  final Color color;

  const _StatCard({
    required this.title,
    required this.value,
    required this.subtitle,
    required this.color,
  });

  @override
  Widget build(BuildContext context) {
    return Container(
      padding: const EdgeInsets.all(AppSpacing.md),
      decoration: BoxDecoration(
        color: AppColors.surface,
        borderRadius: BorderRadius.circular(AppSpacing.radiusLg),
        border: Border.all(color: AppColors.border),
      ),
      child: Column(
        crossAxisAlignment: CrossAxisAlignment.start,
        children: [
          Text(title, style: AppTypography.caption),
          const SizedBox(height: AppSpacing.xs),
          Text(
            value,
            style: AppTypography.numberLarge.copyWith(color: color),
          ),
          Text(subtitle, style: AppTypography.caption),
        ],
      ),
    );
  }
}

/// Detail stat card with icon
class _DetailStatCard extends StatelessWidget {
  final IconData icon;
  final String title;
  final String value;
  final String unit;
  final Color color;

  const _DetailStatCard({
    required this.icon,
    required this.title,
    required this.value,
    required this.unit,
    required this.color,
  });

  @override
  Widget build(BuildContext context) {
    return Container(
      padding: const EdgeInsets.all(AppSpacing.md),
      decoration: BoxDecoration(
        color: AppColors.surface,
        borderRadius: BorderRadius.circular(AppSpacing.radiusLg),
        border: Border.all(color: AppColors.border),
      ),
      child: Column(
        crossAxisAlignment: CrossAxisAlignment.start,
        children: [
          Icon(icon, color: color, size: 24),
          const SizedBox(height: AppSpacing.sm),
          Text(title, style: AppTypography.caption),
          const SizedBox(height: 2),
          Row(
            crossAxisAlignment: CrossAxisAlignment.baseline,
            textBaseline: TextBaseline.alphabetic,
            children: [
              Text(
                value,
                style: AppTypography.h4.copyWith(color: color),
              ),
              const SizedBox(width: 4),
              Text(unit, style: AppTypography.caption),
            ],
          ),
        ],
      ),
    );
  }
}

/// Time distribution row
class _TimeDistributionRow extends StatelessWidget {
  final String label;
  final double value;
  final Color color;

  const _TimeDistributionRow({
    required this.label,
    required this.value,
    required this.color,
  });

  @override
  Widget build(BuildContext context) {
    return Column(
      crossAxisAlignment: CrossAxisAlignment.start,
      children: [
        Row(
          mainAxisAlignment: MainAxisAlignment.spaceBetween,
          children: [
            Text(label, style: AppTypography.body),
            Text(
              '${value.round()}%',
              style: AppTypography.label.copyWith(color: color),
            ),
          ],
        ),
        const SizedBox(height: AppSpacing.xs),
        ClipRRect(
          borderRadius: BorderRadius.circular(4),
          child: LinearProgressIndicator(
            value: value / 100,
            backgroundColor: AppColors.borderLight,
            valueColor: AlwaysStoppedAnimation<Color>(color),
            minHeight: 8,
          ),
        ),
      ],
    );
  }
}

/// Recent memory tile
class _RecentMemoryTile extends StatelessWidget {
  final Memory memory;

  const _RecentMemoryTile({required this.memory});

  @override
  Widget build(BuildContext context) {
    return Container(
      margin: const EdgeInsets.only(bottom: AppSpacing.sm),
      padding: const EdgeInsets.all(AppSpacing.md),
      decoration: BoxDecoration(
        color: AppColors.surface,
        borderRadius: BorderRadius.circular(AppSpacing.radiusMd),
        border: Border.all(color: AppColors.border),
      ),
      child: Row(
        children: [
          Expanded(
            child: Column(
              crossAxisAlignment: CrossAxisAlignment.start,
              children: [
                Text(
                  memory.displayText,
                  style: AppTypography.body,
                  maxLines: 2,
                  overflow: TextOverflow.ellipsis,
                ),
                const SizedBox(height: 4),
                Text(memory.timeAgo, style: AppTypography.caption),
              ],
            ),
          ),
          const Icon(
            Icons.chevron_right_rounded,
            color: AppColors.textTertiary,
          ),
        ],
      ),
    );
  }
}
