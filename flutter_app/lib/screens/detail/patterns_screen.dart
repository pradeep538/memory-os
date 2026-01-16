import 'package:flutter/material.dart';
import 'package:provider/provider.dart';
import '../../config/app_colors.dart';
import '../../config/app_typography.dart';
import '../../config/app_spacing.dart';
import '../../config/config.dart';
import '../../models/insight_models.dart';
import '../../providers/app_provider.dart';
import '../../widgets/common/category_chip.dart';

/// Patterns Screen - View all detected patterns and insights
class PatternsScreen extends StatefulWidget {
  const PatternsScreen({super.key});

  @override
  State<PatternsScreen> createState() => _PatternsScreenState();
}

class _PatternsScreenState extends State<PatternsScreen>
    with SingleTickerProviderStateMixin {
  late TabController _tabController;
  bool _isLoading = true;
  List<Pattern> _patterns = [];
  List<Insight> _insights = [];

  @override
  void initState() {
    super.initState();
    _tabController = TabController(length: 2, vsync: this);
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

    final patternsResult = await app.insightsService.getPatterns();
    final insightsResult = await app.insightsService.getInsights();

    if (mounted) {
      setState(() {
        _patterns = patternsResult.data ?? [];
        _insights = insightsResult.data ?? [];
        _isLoading = false;
      });
    }
  }

  @override
  Widget build(BuildContext context) {
    return Scaffold(
      backgroundColor: AppColors.background,
      appBar: AppBar(
        title: const Text('Patterns & Insights'),
        bottom: TabBar(
          controller: _tabController,
          tabs: const [
            Tab(text: 'Patterns'),
            Tab(text: 'Insights'),
          ],
        ),
        actions: [
          IconButton(
            icon: const Icon(Icons.refresh_rounded),
            onPressed: _refreshInsights,
            tooltip: 'Refresh insights',
          ),
        ],
      ),
      body: _isLoading
          ? const Center(child: CircularProgressIndicator())
          : TabBarView(
              controller: _tabController,
              children: [
                _buildPatternsTab(),
                _buildInsightsTab(),
              ],
            ),
    );
  }

  Future<void> _refreshInsights() async {
    final app = context.read<AppProvider>();
    await app.insightsService.refreshInsights();
    await _loadData();
  }

  Widget _buildPatternsTab() {
    if (_patterns.isEmpty) {
      return _buildEmptyState(
        icon: Icons.auto_awesome_rounded,
        title: 'No patterns detected yet',
        subtitle: 'Keep logging consistently to discover patterns in your data',
      );
    }

    // Group patterns by category
    final grouped = <String, List<Pattern>>{};
    for (final pattern in _patterns) {
      final category = pattern.category ?? 'general';
      grouped.putIfAbsent(category, () => []).add(pattern);
    }

    return RefreshIndicator(
      onRefresh: _loadData,
      child: ListView.builder(
        padding: const EdgeInsets.all(AppSpacing.lg),
        itemCount: grouped.length,
        itemBuilder: (context, index) {
          final category = grouped.keys.elementAt(index);
          final patterns = grouped[category]!;

          return Column(
            crossAxisAlignment: CrossAxisAlignment.start,
            children: [
              if (index > 0) const SizedBox(height: AppSpacing.xl),
              _CategoryHeader(category: category),
              const SizedBox(height: AppSpacing.md),
              ...patterns.map((p) => _PatternCard(pattern: p)),
            ],
          );
        },
      ),
    );
  }

  Widget _buildInsightsTab() {
    if (_insights.isEmpty) {
      return _buildEmptyState(
        icon: Icons.lightbulb_outline_rounded,
        title: 'No insights available',
        subtitle: 'AI-powered insights will appear as you log more data',
      );
    }

    // Group insights by type
    final recommendations = _insights.where((i) => i.type == 'recommendation').toList();
    final warnings = _insights.where((i) => i.type == 'warning' || i.type == 'gap').toList();
    final achievements = _insights.where((i) => i.type == 'achievement' || i.type == 'milestone').toList();
    final other = _insights.where((i) =>
        i.type != 'recommendation' &&
        i.type != 'warning' &&
        i.type != 'gap' &&
        i.type != 'achievement' &&
        i.type != 'milestone').toList();

    return RefreshIndicator(
      onRefresh: _loadData,
      child: SingleChildScrollView(
        padding: const EdgeInsets.all(AppSpacing.lg),
        child: Column(
          crossAxisAlignment: CrossAxisAlignment.start,
          children: [
            if (warnings.isNotEmpty) ...[
              _SectionHeader(
                title: 'Attention Needed',
                icon: Icons.warning_amber_rounded,
                color: AppColors.warning,
              ),
              const SizedBox(height: AppSpacing.md),
              ...warnings.map((i) => _InsightCard(insight: i)),
              const SizedBox(height: AppSpacing.xl),
            ],
            if (recommendations.isNotEmpty) ...[
              _SectionHeader(
                title: 'Recommendations',
                icon: Icons.lightbulb_outline_rounded,
                color: AppColors.primary,
              ),
              const SizedBox(height: AppSpacing.md),
              ...recommendations.map((i) => _InsightCard(insight: i)),
              const SizedBox(height: AppSpacing.xl),
            ],
            if (achievements.isNotEmpty) ...[
              _SectionHeader(
                title: 'Achievements',
                icon: Icons.emoji_events_rounded,
                color: AppColors.success,
              ),
              const SizedBox(height: AppSpacing.md),
              ...achievements.map((i) => _InsightCard(insight: i)),
              const SizedBox(height: AppSpacing.xl),
            ],
            if (other.isNotEmpty) ...[
              _SectionHeader(
                title: 'Other Insights',
                icon: Icons.auto_awesome_rounded,
                color: AppColors.accent,
              ),
              const SizedBox(height: AppSpacing.md),
              ...other.map((i) => _InsightCard(insight: i)),
            ],
          ],
        ),
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
            Container(
              padding: const EdgeInsets.all(AppSpacing.lg),
              decoration: BoxDecoration(
                color: AppColors.primaryLight,
                shape: BoxShape.circle,
              ),
              child: Icon(icon, size: 48, color: AppColors.primary),
            ),
            const SizedBox(height: AppSpacing.lg),
            Text(
              title,
              style: AppTypography.h4.copyWith(color: AppColors.textSecondary),
              textAlign: TextAlign.center,
            ),
            const SizedBox(height: AppSpacing.sm),
            Text(
              subtitle,
              style: AppTypography.body.copyWith(color: AppColors.textTertiary),
              textAlign: TextAlign.center,
            ),
            const SizedBox(height: AppSpacing.xl),
            ElevatedButton.icon(
              onPressed: _refreshInsights,
              icon: const Icon(Icons.refresh_rounded, size: 18),
              label: const Text('Refresh'),
            ),
          ],
        ),
      ),
    );
  }
}

/// Category header
class _CategoryHeader extends StatelessWidget {
  final String category;

  const _CategoryHeader({required this.category});

  @override
  Widget build(BuildContext context) {
    final appCategory = AppCategory.values.firstWhere(
      (c) => c.name.toLowerCase() == category.toLowerCase(),
      orElse: () => AppCategory.generic,
    );
    final color = appCategory.color;

    return Row(
      children: [
        Container(
          padding: const EdgeInsets.all(AppSpacing.sm),
          decoration: BoxDecoration(
            color: color.withAlpha(26),
            borderRadius: BorderRadius.circular(AppSpacing.radiusMd),
          ),
          child: Icon(appCategory.icon, color: color, size: 20),
        ),
        const SizedBox(width: AppSpacing.sm),
        Text(
          _formatCategoryName(category),
          style: AppTypography.h4,
        ),
      ],
    );
  }

  String _formatCategoryName(String name) {
    return name[0].toUpperCase() + name.substring(1);
  }
}

/// Section header
class _SectionHeader extends StatelessWidget {
  final String title;
  final IconData icon;
  final Color color;

  const _SectionHeader({
    required this.title,
    required this.icon,
    required this.color,
  });

  @override
  Widget build(BuildContext context) {
    return Row(
      children: [
        Icon(icon, color: color, size: 22),
        const SizedBox(width: AppSpacing.sm),
        Text(title, style: AppTypography.h4),
      ],
    );
  }
}

/// Pattern card widget
class _PatternCard extends StatelessWidget {
  final Pattern pattern;

  const _PatternCard({required this.pattern});

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
      child: Column(
        crossAxisAlignment: CrossAxisAlignment.start,
        children: [
          Row(
            children: [
              Container(
                padding: const EdgeInsets.all(AppSpacing.sm),
                decoration: BoxDecoration(
                  color: _getPatternColor().withAlpha(26),
                  borderRadius: BorderRadius.circular(AppSpacing.radiusMd),
                ),
                child: Icon(
                  _getPatternIcon(),
                  color: _getPatternColor(),
                  size: 20,
                ),
              ),
              const SizedBox(width: AppSpacing.md),
              Expanded(
                child: Column(
                  crossAxisAlignment: CrossAxisAlignment.start,
                  children: [
                    Text(
                      pattern.title,
                      style: AppTypography.body.copyWith(
                        fontWeight: FontWeight.w600,
                      ),
                    ),
                    if (pattern.frequency != null)
                      Text(
                        pattern.frequency!,
                        style: AppTypography.caption,
                      ),
                  ],
                ),
              ),
              _ConfidenceBadge(confidence: pattern.confidence),
            ],
          ),
          ...[
          const SizedBox(height: AppSpacing.md),
          Text(
            pattern.description!,
            style: AppTypography.body.copyWith(
              color: AppColors.textSecondary,
            ),
          ),
        ],
          if (pattern.trend != null) ...[
            const SizedBox(height: AppSpacing.md),
            _TrendIndicator(trend: pattern.trend!),
          ],
        ],
      ),
    );
  }

  Color _getPatternColor() {
    switch (pattern.type) {
      case 'positive':
        return AppColors.success;
      case 'negative':
        return AppColors.error;
      case 'neutral':
        return AppColors.primary;
      default:
        return AppColors.accent;
    }
  }

  IconData _getPatternIcon() {
    switch (pattern.type) {
      case 'positive':
        return Icons.trending_up_rounded;
      case 'negative':
        return Icons.trending_down_rounded;
      case 'neutral':
        return Icons.trending_flat_rounded;
      case 'cycle':
        return Icons.loop_rounded;
      case 'correlation':
        return Icons.compare_arrows_rounded;
      default:
        return Icons.auto_awesome_rounded;
    }
  }
}

/// Insight card widget
class _InsightCard extends StatelessWidget {
  final Insight insight;

  const _InsightCard({required this.insight});

  @override
  Widget build(BuildContext context) {
    return Container(
      margin: const EdgeInsets.only(bottom: AppSpacing.md),
      decoration: BoxDecoration(
        color: AppColors.surface,
        borderRadius: BorderRadius.circular(AppSpacing.radiusLg),
        border: Border.all(color: _getBorderColor()),
      ),
      child: Column(
        crossAxisAlignment: CrossAxisAlignment.start,
        children: [
          // Header
          Container(
            padding: const EdgeInsets.all(AppSpacing.md),
            decoration: BoxDecoration(
              color: _getHeaderColor(),
              borderRadius: const BorderRadius.vertical(
                top: Radius.circular(AppSpacing.radiusLg - 1),
              ),
            ),
            child: Row(
              children: [
                Icon(_getInsightIcon(), color: _getIconColor(), size: 22),
                const SizedBox(width: AppSpacing.sm),
                Expanded(
                  child: Text(
                    insight.title,
                    style: AppTypography.body.copyWith(
                      fontWeight: FontWeight.w600,
                    ),
                  ),
                ),
                CategoryChip.fromCategory(
                  appCategory: AppCategory.values.firstWhere(
                    (c) => c.name == insight.category,
                    orElse: () => AppCategory.generic,
                  ),
                ),
              ],
            ),
          ),

          // Content
          Padding(
            padding: const EdgeInsets.all(AppSpacing.md),
            child: Column(
              crossAxisAlignment: CrossAxisAlignment.start,
              children: [
                Text(
                  insight.description ?? insight.headline,
                  style: AppTypography.body.copyWith(
                    color: AppColors.textSecondary,
                  ),
                ),
                if (insight.actionable != null && insight.actionable!) ...[
                  const SizedBox(height: AppSpacing.md),
                  Row(
                    children: [
                      const Icon(
                        Icons.tips_and_updates_outlined,
                        size: 16,
                        color: AppColors.primary,
                      ),
                      const SizedBox(width: AppSpacing.xs),
                      Expanded(
                        child: Text(
                          insight.suggestion ?? 'Tap for more details',
                          style: AppTypography.caption.copyWith(
                            color: AppColors.primary,
                          ),
                        ),
                      ),
                    ],
                  ),
                ],
              ],
            ),
          ),
        ],
      ),
    );
  }

  Color _getHeaderColor() {
    switch (insight.type) {
      case 'warning':
      case 'gap':
        return AppColors.warning.withAlpha(26);
      case 'achievement':
      case 'milestone':
        return AppColors.success.withAlpha(26);
      case 'recommendation':
        return AppColors.primaryLight;
      default:
        return AppColors.backgroundSecondary;
    }
  }

  Color _getBorderColor() {
    switch (insight.type) {
      case 'warning':
      case 'gap':
        return AppColors.warning.withAlpha(51);
      case 'achievement':
      case 'milestone':
        return AppColors.success.withAlpha(51);
      default:
        return AppColors.border;
    }
  }

  Color _getIconColor() {
    switch (insight.type) {
      case 'warning':
      case 'gap':
        return AppColors.warning;
      case 'achievement':
      case 'milestone':
        return AppColors.success;
      case 'recommendation':
        return AppColors.primary;
      default:
        return AppColors.accent;
    }
  }

  IconData _getInsightIcon() {
    switch (insight.type) {
      case 'warning':
        return Icons.warning_amber_rounded;
      case 'gap':
        return Icons.error_outline_rounded;
      case 'achievement':
        return Icons.emoji_events_rounded;
      case 'milestone':
        return Icons.flag_rounded;
      case 'recommendation':
        return Icons.lightbulb_outline_rounded;
      case 'trend':
        return Icons.trending_up_rounded;
      default:
        return Icons.auto_awesome_rounded;
    }
  }
}

/// Confidence badge
class _ConfidenceBadge extends StatelessWidget {
  final double confidence;

  const _ConfidenceBadge({required this.confidence});

  @override
  Widget build(BuildContext context) {
    final color = confidence >= 0.8
        ? AppColors.success
        : confidence >= 0.6
            ? AppColors.primary
            : AppColors.warning;

    return Container(
      padding: const EdgeInsets.symmetric(
        horizontal: AppSpacing.sm,
        vertical: 2,
      ),
      decoration: BoxDecoration(
        color: color.withAlpha(26),
        borderRadius: BorderRadius.circular(AppSpacing.radiusSm),
      ),
      child: Text(
        '${(confidence * 100).round()}%',
        style: AppTypography.labelSmall.copyWith(color: color),
      ),
    );
  }
}

/// Trend indicator
class _TrendIndicator extends StatelessWidget {
  final String trend;

  const _TrendIndicator({required this.trend});

  @override
  Widget build(BuildContext context) {
    final isPositive = trend.contains('+') || trend.toLowerCase().contains('up');
    final isNegative = trend.contains('-') || trend.toLowerCase().contains('down');

    final color = isPositive
        ? AppColors.success
        : isNegative
            ? AppColors.error
            : AppColors.textSecondary;

    final icon = isPositive
        ? Icons.trending_up_rounded
        : isNegative
            ? Icons.trending_down_rounded
            : Icons.trending_flat_rounded;

    return Container(
      padding: const EdgeInsets.symmetric(
        horizontal: AppSpacing.sm,
        vertical: 4,
      ),
      decoration: BoxDecoration(
        color: color.withAlpha(26),
        borderRadius: BorderRadius.circular(AppSpacing.radiusSm),
      ),
      child: Row(
        mainAxisSize: MainAxisSize.min,
        children: [
          Icon(icon, size: 16, color: color),
          const SizedBox(width: 4),
          Text(
            trend,
            style: AppTypography.labelSmall.copyWith(color: color),
          ),
        ],
      ),
    );
  }
}
