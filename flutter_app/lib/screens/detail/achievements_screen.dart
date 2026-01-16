import 'package:flutter/material.dart';
import '../../config/app_colors.dart';
import '../../config/app_typography.dart';
import '../../config/app_spacing.dart';

/// Achievement model
class Achievement {
  final String id;
  final String title;
  final String description;
  final String icon;
  final String category;
  final bool unlocked;
  final DateTime? unlockedAt;
  final double progress;
  final int? target;
  final int? current;
  final String? rarity;

  Achievement({
    required this.id,
    required this.title,
    required this.description,
    required this.icon,
    required this.category,
    required this.unlocked,
    this.unlockedAt,
    this.progress = 0,
    this.target,
    this.current,
    this.rarity,
  });

  factory Achievement.fromJson(Map<String, dynamic> json) {
    return Achievement(
      id: json['id'] ?? '',
      title: json['title'] ?? '',
      description: json['description'] ?? '',
      icon: json['icon'] ?? 'star',
      category: json['category'] ?? 'general',
      unlocked: json['unlocked'] ?? false,
      unlockedAt: json['unlocked_at'] != null
          ? DateTime.parse(json['unlocked_at'])
          : null,
      progress: (json['progress'] ?? 0).toDouble(),
      target: json['target'],
      current: json['current'],
      rarity: json['rarity'],
    );
  }
}

/// Achievements Screen - View all badges and achievements
class AchievementsScreen extends StatefulWidget {
  const AchievementsScreen({super.key});

  @override
  State<AchievementsScreen> createState() => _AchievementsScreenState();
}

class _AchievementsScreenState extends State<AchievementsScreen>
    with SingleTickerProviderStateMixin {
  late TabController _tabController;
  bool _isLoading = true;
  List<Achievement> _achievements = [];
  int _totalUnlocked = 0;
  int _totalAchievements = 0;

  @override
  void initState() {
    super.initState();
    _tabController = TabController(length: 3, vsync: this);
    _loadAchievements();
  }

  @override
  void dispose() {
    _tabController.dispose();
    super.dispose();
  }

  Future<void> _loadAchievements() async {
    setState(() => _isLoading = true);

    // Simulated achievements data - in production this would come from API
    await Future.delayed(const Duration(milliseconds: 500));

    final achievements = _getSimulatedAchievements();

    if (mounted) {
      setState(() {
        _achievements = achievements;
        _totalUnlocked = achievements.where((a) => a.unlocked).length;
        _totalAchievements = achievements.length;
        _isLoading = false;
      });
    }
  }

  List<Achievement> _getSimulatedAchievements() {
    return [
      // Streak achievements
      Achievement(
        id: '1',
        title: 'First Steps',
        description: 'Log your first memory',
        icon: 'footsteps',
        category: 'getting_started',
        unlocked: true,
        unlockedAt: DateTime.now().subtract(const Duration(days: 7)),
        rarity: 'common',
      ),
      Achievement(
        id: '2',
        title: 'Week Warrior',
        description: 'Log memories for 7 consecutive days',
        icon: 'fire',
        category: 'streak',
        unlocked: true,
        unlockedAt: DateTime.now().subtract(const Duration(days: 3)),
        rarity: 'uncommon',
      ),
      Achievement(
        id: '3',
        title: 'Monthly Master',
        description: 'Log memories for 30 consecutive days',
        icon: 'trophy',
        category: 'streak',
        unlocked: false,
        progress: 0.7,
        current: 21,
        target: 30,
        rarity: 'rare',
      ),
      Achievement(
        id: '4',
        title: 'Century Club',
        description: 'Log memories for 100 consecutive days',
        icon: 'crown',
        category: 'streak',
        unlocked: false,
        progress: 0.21,
        current: 21,
        target: 100,
        rarity: 'legendary',
      ),

      // Category achievements
      Achievement(
        id: '5',
        title: 'Fitness Enthusiast',
        description: 'Log 50 fitness activities',
        icon: 'fitness',
        category: 'fitness',
        unlocked: true,
        unlockedAt: DateTime.now().subtract(const Duration(days: 2)),
        rarity: 'uncommon',
      ),
      Achievement(
        id: '6',
        title: 'Budget Boss',
        description: 'Track 100 financial transactions',
        icon: 'money',
        category: 'finance',
        unlocked: false,
        progress: 0.45,
        current: 45,
        target: 100,
        rarity: 'rare',
      ),
      Achievement(
        id: '7',
        title: 'Mindful Master',
        description: 'Complete 30 mindfulness sessions',
        icon: 'meditation',
        category: 'mindfulness',
        unlocked: false,
        progress: 0.6,
        current: 18,
        target: 30,
        rarity: 'uncommon',
      ),
      Achievement(
        id: '8',
        title: 'Health Hero',
        description: 'Log 25 health check-ins',
        icon: 'health',
        category: 'health',
        unlocked: true,
        unlockedAt: DateTime.now().subtract(const Duration(days: 5)),
        rarity: 'uncommon',
      ),

      // Special achievements
      Achievement(
        id: '9',
        title: 'Voice Pioneer',
        description: 'Log 100 voice memories',
        icon: 'microphone',
        category: 'special',
        unlocked: false,
        progress: 0.35,
        current: 35,
        target: 100,
        rarity: 'rare',
      ),
      Achievement(
        id: '10',
        title: 'Early Bird',
        description: 'Log 20 memories before 8 AM',
        icon: 'sunrise',
        category: 'special',
        unlocked: false,
        progress: 0.25,
        current: 5,
        target: 20,
        rarity: 'uncommon',
      ),
      Achievement(
        id: '11',
        title: 'Night Owl',
        description: 'Log 20 memories after 10 PM',
        icon: 'moon',
        category: 'special',
        unlocked: false,
        progress: 0.4,
        current: 8,
        target: 20,
        rarity: 'uncommon',
      ),
      Achievement(
        id: '12',
        title: 'Perfectionist',
        description: 'Get 50 high-confidence (90%+) entries',
        icon: 'star',
        category: 'special',
        unlocked: false,
        progress: 0.56,
        current: 28,
        target: 50,
        rarity: 'rare',
      ),
    ];
  }

  @override
  Widget build(BuildContext context) {
    return Scaffold(
      backgroundColor: AppColors.background,
      body: NestedScrollView(
        headerSliverBuilder: (context, innerBoxIsScrolled) {
          return [
            SliverAppBar(
              expandedHeight: 200,
              pinned: true,
              backgroundColor: AppColors.primary,
              foregroundColor: AppColors.textOnPrimary,
              flexibleSpace: FlexibleSpaceBar(
                background: _buildHeader(),
              ),
              bottom: TabBar(
                controller: _tabController,
                indicatorColor: AppColors.textOnPrimary,
                labelColor: AppColors.textOnPrimary,
                unselectedLabelColor: AppColors.textOnPrimary.withAlpha(179),
                tabs: const [
                  Tab(text: 'All'),
                  Tab(text: 'Unlocked'),
                  Tab(text: 'In Progress'),
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
                  _buildAchievementsList(_achievements),
                  _buildAchievementsList(
                    _achievements.where((a) => a.unlocked).toList(),
                  ),
                  _buildAchievementsList(
                    _achievements.where((a) => !a.unlocked && a.progress > 0).toList(),
                  ),
                ],
              ),
      ),
    );
  }

  Widget _buildHeader() {
    return Container(
      decoration: const BoxDecoration(
        gradient: LinearGradient(
          colors: [AppColors.primary, Color(0xFF1DE9B6)],
          begin: Alignment.topLeft,
          end: Alignment.bottomRight,
        ),
      ),
      padding: const EdgeInsets.fromLTRB(
        AppSpacing.lg,
        100,
        AppSpacing.lg,
        60,
      ),
      child: Row(
        children: [
          // Trophy icon
          Container(
            width: 80,
            height: 80,
            decoration: BoxDecoration(
              color: AppColors.textOnPrimary.withAlpha(51),
              borderRadius: BorderRadius.circular(AppSpacing.radiusLg),
            ),
            child: const Icon(
              Icons.emoji_events_rounded,
              color: AppColors.textOnPrimary,
              size: 40,
            ),
          ),
          const SizedBox(width: AppSpacing.lg),
          Expanded(
            child: Column(
              crossAxisAlignment: CrossAxisAlignment.start,
              mainAxisAlignment: MainAxisAlignment.center,
              children: [
                Text(
                  'Achievements',
                  style: AppTypography.h2.copyWith(
                    color: AppColors.textOnPrimary,
                  ),
                ),
                const SizedBox(height: AppSpacing.xs),
                Text(
                  '$_totalUnlocked / $_totalAchievements unlocked',
                  style: AppTypography.body.copyWith(
                    color: AppColors.textOnPrimary.withAlpha(204),
                  ),
                ),
                const SizedBox(height: AppSpacing.sm),
                // Progress bar
                ClipRRect(
                  borderRadius: BorderRadius.circular(4),
                  child: LinearProgressIndicator(
                    value: _totalAchievements > 0
                        ? _totalUnlocked / _totalAchievements
                        : 0,
                    backgroundColor: AppColors.textOnPrimary.withAlpha(51),
                    valueColor: const AlwaysStoppedAnimation<Color>(
                      AppColors.textOnPrimary,
                    ),
                    minHeight: 8,
                  ),
                ),
              ],
            ),
          ),
        ],
      ),
    );
  }

  Widget _buildAchievementsList(List<Achievement> achievements) {
    if (achievements.isEmpty) {
      return _buildEmptyState();
    }

    // Group by category
    final grouped = <String, List<Achievement>>{};
    for (final achievement in achievements) {
      grouped.putIfAbsent(achievement.category, () => []).add(achievement);
    }

    return RefreshIndicator(
      onRefresh: _loadAchievements,
      child: ListView.builder(
        padding: const EdgeInsets.all(AppSpacing.lg),
        itemCount: grouped.length,
        itemBuilder: (context, index) {
          final category = grouped.keys.elementAt(index);
          final categoryAchievements = grouped[category]!;

          return Column(
            crossAxisAlignment: CrossAxisAlignment.start,
            children: [
              if (index > 0) const SizedBox(height: AppSpacing.xl),
              Text(
                _formatCategoryName(category),
                style: AppTypography.h4,
              ),
              const SizedBox(height: AppSpacing.md),
              ...categoryAchievements.map((a) => _AchievementCard(
                    achievement: a,
                    onTap: () => _showAchievementDetail(a),
                  )),
            ],
          );
        },
      ),
    );
  }

  Widget _buildEmptyState() {
    return Center(
      child: Padding(
        padding: const EdgeInsets.all(AppSpacing.xxl),
        child: Column(
          mainAxisAlignment: MainAxisAlignment.center,
          children: [
            Icon(
              Icons.emoji_events_outlined,
              size: 64,
              color: AppColors.textTertiary,
            ),
            const SizedBox(height: AppSpacing.md),
            Text(
              'No achievements here yet',
              style: AppTypography.h4.copyWith(color: AppColors.textSecondary),
            ),
            const SizedBox(height: AppSpacing.sm),
            Text(
              'Keep logging to unlock achievements',
              style: AppTypography.body.copyWith(color: AppColors.textTertiary),
              textAlign: TextAlign.center,
            ),
          ],
        ),
      ),
    );
  }

  String _formatCategoryName(String category) {
    switch (category) {
      case 'getting_started':
        return 'Getting Started';
      case 'streak':
        return 'Streaks';
      case 'fitness':
        return 'Fitness';
      case 'finance':
        return 'Finance';
      case 'health':
        return 'Health';
      case 'mindfulness':
        return 'Mindfulness';
      case 'special':
        return 'Special';
      default:
        return category[0].toUpperCase() + category.substring(1);
    }
  }

  void _showAchievementDetail(Achievement achievement) {
    showModalBottomSheet(
      context: context,
      backgroundColor: Colors.transparent,
      builder: (context) => _AchievementDetailSheet(achievement: achievement),
    );
  }
}

/// Achievement card widget
class _AchievementCard extends StatelessWidget {
  final Achievement achievement;
  final VoidCallback onTap;

  const _AchievementCard({
    required this.achievement,
    required this.onTap,
  });

  @override
  Widget build(BuildContext context) {
    return GestureDetector(
      onTap: onTap,
      child: Container(
        margin: const EdgeInsets.only(bottom: AppSpacing.md),
        padding: const EdgeInsets.all(AppSpacing.md),
        decoration: BoxDecoration(
          color: achievement.unlocked
              ? AppColors.primaryLight
              : AppColors.surface,
          borderRadius: BorderRadius.circular(AppSpacing.radiusLg),
          border: Border.all(
            color: achievement.unlocked
                ? AppColors.primary.withAlpha(51)
                : AppColors.border,
          ),
        ),
        child: Row(
          children: [
            // Icon
            Container(
              width: 56,
              height: 56,
              decoration: BoxDecoration(
                color: achievement.unlocked
                    ? AppColors.primary
                    : AppColors.backgroundSecondary,
                borderRadius: BorderRadius.circular(AppSpacing.radiusMd),
              ),
              child: Icon(
                _getIconData(achievement.icon),
                color: achievement.unlocked
                    ? AppColors.textOnPrimary
                    : AppColors.textTertiary,
                size: 28,
              ),
            ),
            const SizedBox(width: AppSpacing.md),
            Expanded(
              child: Column(
                crossAxisAlignment: CrossAxisAlignment.start,
                children: [
                  Row(
                    children: [
                      Expanded(
                        child: Text(
                          achievement.title,
                          style: AppTypography.body.copyWith(
                            fontWeight: FontWeight.w600,
                            color: achievement.unlocked
                                ? AppColors.textPrimary
                                : AppColors.textSecondary,
                          ),
                        ),
                      ),
                      if (achievement.rarity != null)
                        _RarityBadge(rarity: achievement.rarity!),
                    ],
                  ),
                  const SizedBox(height: 4),
                  Text(
                    achievement.description,
                    style: AppTypography.caption,
                    maxLines: 2,
                    overflow: TextOverflow.ellipsis,
                  ),
                  if (!achievement.unlocked && achievement.progress > 0) ...[
                    const SizedBox(height: AppSpacing.sm),
                    Row(
                      children: [
                        Expanded(
                          child: ClipRRect(
                            borderRadius: BorderRadius.circular(4),
                            child: LinearProgressIndicator(
                              value: achievement.progress,
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
                          '${achievement.current}/${achievement.target}',
                          style: AppTypography.caption,
                        ),
                      ],
                    ),
                  ],
                ],
              ),
            ),
            if (achievement.unlocked)
              const Padding(
                padding: EdgeInsets.only(left: AppSpacing.sm),
                child: Icon(
                  Icons.check_circle_rounded,
                  color: AppColors.primary,
                  size: 24,
                ),
              ),
          ],
        ),
      ),
    );
  }

  IconData _getIconData(String icon) {
    switch (icon) {
      case 'footsteps':
        return Icons.directions_walk_rounded;
      case 'fire':
        return Icons.local_fire_department_rounded;
      case 'trophy':
        return Icons.emoji_events_rounded;
      case 'crown':
        return Icons.workspace_premium_rounded;
      case 'fitness':
        return Icons.fitness_center_rounded;
      case 'money':
        return Icons.attach_money_rounded;
      case 'meditation':
        return Icons.self_improvement_rounded;
      case 'health':
        return Icons.favorite_rounded;
      case 'microphone':
        return Icons.mic_rounded;
      case 'sunrise':
        return Icons.wb_sunny_rounded;
      case 'moon':
        return Icons.nightlight_rounded;
      case 'star':
        return Icons.star_rounded;
      default:
        return Icons.emoji_events_rounded;
    }
  }
}

/// Rarity badge widget
class _RarityBadge extends StatelessWidget {
  final String rarity;

  const _RarityBadge({required this.rarity});

  @override
  Widget build(BuildContext context) {
    final color = _getRarityColor();

    return Container(
      padding: const EdgeInsets.symmetric(
        horizontal: AppSpacing.sm,
        vertical: 2,
      ),
      decoration: BoxDecoration(
        color: color.withAlpha(26),
        borderRadius: BorderRadius.circular(AppSpacing.radiusSm),
        border: Border.all(color: color.withAlpha(51)),
      ),
      child: Text(
        rarity[0].toUpperCase() + rarity.substring(1),
        style: AppTypography.labelSmall.copyWith(
          color: color,
          fontSize: 10,
        ),
      ),
    );
  }

  Color _getRarityColor() {
    switch (rarity) {
      case 'common':
        return AppColors.textSecondary;
      case 'uncommon':
        return AppColors.success;
      case 'rare':
        return AppColors.primary;
      case 'legendary':
        return AppColors.warning;
      default:
        return AppColors.textSecondary;
    }
  }
}

/// Achievement detail bottom sheet
class _AchievementDetailSheet extends StatelessWidget {
  final Achievement achievement;

  const _AchievementDetailSheet({required this.achievement});

  @override
  Widget build(BuildContext context) {
    return Container(
      decoration: const BoxDecoration(
        color: AppColors.surface,
        borderRadius: BorderRadius.vertical(
          top: Radius.circular(AppSpacing.radiusXl),
        ),
      ),
      child: Column(
        mainAxisSize: MainAxisSize.min,
        children: [
          // Handle
          Center(
            child: Container(
              margin: const EdgeInsets.symmetric(vertical: AppSpacing.md),
              width: 40,
              height: 4,
              decoration: BoxDecoration(
                color: AppColors.border,
                borderRadius: BorderRadius.circular(2),
              ),
            ),
          ),

          Padding(
            padding: const EdgeInsets.all(AppSpacing.lg),
            child: Column(
              children: [
                // Icon
                Container(
                  width: 80,
                  height: 80,
                  decoration: BoxDecoration(
                    color: achievement.unlocked
                        ? AppColors.primary
                        : AppColors.backgroundSecondary,
                    borderRadius: BorderRadius.circular(AppSpacing.radiusLg),
                  ),
                  child: Icon(
                    _getIconData(achievement.icon),
                    color: achievement.unlocked
                        ? AppColors.textOnPrimary
                        : AppColors.textTertiary,
                    size: 40,
                  ),
                ),
                const SizedBox(height: AppSpacing.lg),

                // Title
                Text(
                  achievement.title,
                  style: AppTypography.h3,
                  textAlign: TextAlign.center,
                ),
                const SizedBox(height: AppSpacing.sm),

                // Description
                Text(
                  achievement.description,
                  style: AppTypography.body.copyWith(
                    color: AppColors.textSecondary,
                  ),
                  textAlign: TextAlign.center,
                ),
                const SizedBox(height: AppSpacing.lg),

                // Status
                if (achievement.unlocked) ...[
                  Container(
                    padding: const EdgeInsets.symmetric(
                      horizontal: AppSpacing.md,
                      vertical: AppSpacing.sm,
                    ),
                    decoration: BoxDecoration(
                      color: AppColors.success.withAlpha(26),
                      borderRadius: BorderRadius.circular(AppSpacing.radiusMd),
                    ),
                    child: Row(
                      mainAxisSize: MainAxisSize.min,
                      children: [
                        const Icon(
                          Icons.check_circle_rounded,
                          color: AppColors.success,
                          size: 20,
                        ),
                        const SizedBox(width: AppSpacing.sm),
                        Text(
                          'Unlocked ${_formatDate(achievement.unlockedAt!)}',
                          style: AppTypography.label.copyWith(
                            color: AppColors.success,
                          ),
                        ),
                      ],
                    ),
                  ),
                ] else ...[
                  // Progress
                  Column(
                    children: [
                      Row(
                        mainAxisAlignment: MainAxisAlignment.spaceBetween,
                        children: [
                          Text('Progress', style: AppTypography.label),
                          Text(
                            '${achievement.current ?? 0}/${achievement.target ?? 0}',
                            style: AppTypography.label.copyWith(
                              color: AppColors.primary,
                            ),
                          ),
                        ],
                      ),
                      const SizedBox(height: AppSpacing.sm),
                      ClipRRect(
                        borderRadius: BorderRadius.circular(6),
                        child: LinearProgressIndicator(
                          value: achievement.progress,
                          backgroundColor: AppColors.borderLight,
                          valueColor: const AlwaysStoppedAnimation<Color>(
                            AppColors.primary,
                          ),
                          minHeight: 12,
                        ),
                      ),
                      const SizedBox(height: AppSpacing.sm),
                      Text(
                        '${(achievement.progress * 100).round()}% complete',
                        style: AppTypography.caption,
                      ),
                    ],
                  ),
                ],

                const SizedBox(height: AppSpacing.lg),

                // Rarity
                if (achievement.rarity != null)
                  Row(
                    mainAxisAlignment: MainAxisAlignment.center,
                    children: [
                      Text('Rarity: ', style: AppTypography.body),
                      _RarityBadge(rarity: achievement.rarity!),
                    ],
                  ),

                const SizedBox(height: AppSpacing.xl),

                // Close button
                SizedBox(
                  width: double.infinity,
                  child: ElevatedButton(
                    onPressed: () => Navigator.pop(context),
                    child: const Text('Close'),
                  ),
                ),
              ],
            ),
          ),
        ],
      ),
    );
  }

  IconData _getIconData(String icon) {
    switch (icon) {
      case 'footsteps':
        return Icons.directions_walk_rounded;
      case 'fire':
        return Icons.local_fire_department_rounded;
      case 'trophy':
        return Icons.emoji_events_rounded;
      case 'crown':
        return Icons.workspace_premium_rounded;
      case 'fitness':
        return Icons.fitness_center_rounded;
      case 'money':
        return Icons.attach_money_rounded;
      case 'meditation':
        return Icons.self_improvement_rounded;
      case 'health':
        return Icons.favorite_rounded;
      case 'microphone':
        return Icons.mic_rounded;
      case 'sunrise':
        return Icons.wb_sunny_rounded;
      case 'moon':
        return Icons.nightlight_rounded;
      case 'star':
        return Icons.star_rounded;
      default:
        return Icons.emoji_events_rounded;
    }
  }

  String _formatDate(DateTime date) {
    final now = DateTime.now();
    final diff = now.difference(date);

    if (diff.inDays == 0) return 'today';
    if (diff.inDays == 1) return 'yesterday';
    if (diff.inDays < 7) return '${diff.inDays} days ago';
    if (diff.inDays < 30) return '${(diff.inDays / 7).floor()} weeks ago';
    return '${(diff.inDays / 30).floor()} months ago';
  }
}
