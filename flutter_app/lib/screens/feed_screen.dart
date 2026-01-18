import 'package:flutter/material.dart';
import 'package:provider/provider.dart';
import '../config/app_colors.dart';
import '../config/app_typography.dart';
import '../config/app_spacing.dart';
import '../config/config.dart';
import '../providers/providers.dart';
import '../models/models.dart';
import '../widgets/widgets.dart';
import 'detail/habits_screen.dart';
import 'detail/memories_screen.dart';
import 'detail/category_screen.dart';
import 'detail/engagement_screen.dart';
import 'detail/patterns_screen.dart';
import 'detail/achievements_screen.dart';
import 'input_modal_screen.dart';
import 'query_screen.dart';
import '../services/engagement_service.dart';
import '../widgets/engagement_feed.dart';
import '../widgets/feedback_toast.dart';

/// Main feed screen - 95% of user time spent here
class FeedScreen extends StatefulWidget {
  const FeedScreen({super.key});

  @override
  State<FeedScreen> createState() => _FeedScreenState();
}

class _FeedScreenState extends State<FeedScreen> {
  final _scrollController = ScrollController();
  final _engagementService = EngagementService();
  UserFeedback? _latestFeedback;
  VoidCallback? _inputListener;

  InputState _lastInputState = InputState.idle;

  @override
  void initState() {
    super.initState();
    // Load feed on init
    WidgetsBinding.instance.addPostFrameCallback((_) {
      context.read<FeedProvider>().loadFeed();
      // Listen to input provider for success events
      _inputListener = _onInputStateChange;
      context.read<InputProvider>().addListener(_inputListener!);
      _lastInputState = context.read<InputProvider>().state;
    });
  }

  void _onInputStateChange() {
    final inputProvider = context.read<InputProvider>();
    final currentState = inputProvider.state;

    // Only act on transition to success
    if (currentState == InputState.success &&
        _lastInputState != InputState.success) {
      _pollFeedback();
      // Reload feed to update habits, score, memories
      context.read<FeedProvider>().loadFeed();
    }
    _lastInputState = currentState;
  }

  Future<void> _pollFeedback() async {
    final feedback = await _engagementService.pollForFeedback();
    if (feedback != null && mounted) {
      setState(() {
        _latestFeedback = feedback;
      });
      // Auto-dismiss after 5 seconds
      Future.delayed(const Duration(seconds: 5), () {
        if (mounted && _latestFeedback == feedback) {
          setState(() {
            _latestFeedback = null;
          });
        }
      });
    }
  }

  @override
  void dispose() {
    _scrollController.dispose();
    if (_inputListener != null) {
      context.read<InputProvider>().removeListener(_inputListener!);
    }
    super.dispose();
  }

  @override
  Widget build(BuildContext context) {
    return Scaffold(
      backgroundColor: AppColors.background,
      body: SafeArea(
        child: Stack(
          children: [
            // Main content
            Column(
              children: [
                // App bar
                _buildAppBar(),

                // Daily Brief (Engagement Feed)
                EngagementFeed(engagementService: _engagementService),

                // Feed content
                Expanded(
                  child: Consumer<FeedProvider>(
                    builder: (context, feedProvider, _) {
                      if (feedProvider.isLoading &&
                          feedProvider.widgets.isEmpty) {
                        return const Center(child: CircularProgressIndicator());
                      }

                      if (feedProvider.error != null &&
                          feedProvider.widgets.isEmpty) {
                        return _buildErrorState(feedProvider.error!);
                      }

                      return RefreshIndicator(
                        onRefresh: () => feedProvider.refreshFeed(),
                        color: AppColors.primary,
                        child: _buildFeedList(feedProvider),
                      );
                    },
                  ),
                ),

                // Input bar container
                _buildInputBarContainer(),
              ],
            ),

            // Confirmation overlay
            Consumer<InputProvider>(
              builder: (context, inputProvider, _) {
                if (inputProvider.state == InputState.confirming) {
                  return const ConfirmationOverlay();
                }
                return const SizedBox.shrink();
              },
            ),

            // Success toast
            Consumer<InputProvider>(
              builder: (context, inputProvider, _) {
                // Prioritize specific engagement feedback over generic success toast
                if (_latestFeedback != null) return const SizedBox.shrink();

                if (inputProvider.state == InputState.success &&
                    inputProvider.lastMemory != null) {
                  return Positioned(
                    left: 0,
                    right: 0,
                    bottom: AppSpacing.inputBarHeight + AppSpacing.lg,
                    child: SuccessToast(
                      text: inputProvider.lastFeedbackMessage ??
                          inputProvider.lastMemory!.displayText,
                      onUndo: () => inputProvider.undoLastMemory(),
                    ),
                  );
                }
                return const SizedBox.shrink();
              },
            ),

            // Engagement Feedback Toast (Stacked on top)
            if (_latestFeedback != null)
              FeedbackToast(
                feedback: _latestFeedback!,
                onDismiss: () => setState(() => _latestFeedback = null),
              ),
          ],
        ),
      ),
    );
  }

  Widget _buildAppBar() {
    return Container(
      padding: const EdgeInsets.symmetric(
        horizontal: AppSpacing.screenPadding,
        vertical: AppSpacing.md,
      ),
      child: Row(
        children: [
          Text(
            'Memory',
            style: AppTypography.h2.copyWith(color: AppColors.textPrimary),
          ),
          Text(
            'OS',
            style: AppTypography.h2.copyWith(color: AppColors.primary),
          ),
          const Spacer(),
          // Search/Query Button
          IconButton(
            onPressed: () => Navigator.push(
              context,
              MaterialPageRoute(builder: (context) => const QueryScreen()),
            ),
            icon:
                const Icon(Icons.search_rounded, color: AppColors.textPrimary),
          ),
          const SizedBox(width: AppSpacing.sm),
          // Voice quota indicator
          Consumer<InputProvider>(
            builder: (context, inputProvider, _) {
              final quota = inputProvider.voiceQuota;
              if (quota == null) return const SizedBox.shrink();

              return Container(
                padding: const EdgeInsets.symmetric(
                  horizontal: AppSpacing.sm,
                  vertical: AppSpacing.xs,
                ),
                decoration: BoxDecoration(
                  color: quota.hasQuota
                      ? AppColors.primaryLight.withOpacity(0.15)
                      : AppColors.error.withOpacity(0.15),
                  borderRadius: BorderRadius.circular(AppSpacing.radiusFull),
                ),
                child: Row(
                  mainAxisSize: MainAxisSize.min,
                  children: [
                    Icon(
                      Icons.mic_rounded,
                      size: 14,
                      color:
                          quota.hasQuota ? AppColors.primary : AppColors.error,
                    ),
                    const SizedBox(width: 4),
                    Text(
                      '${quota.remaining}',
                      style: AppTypography.labelSmall.copyWith(
                        color: quota.hasQuota
                            ? AppColors.primary
                            : AppColors.error,
                      ),
                    ),
                  ],
                ),
              );
            },
          ),
        ],
      ),
    );
  }

  Widget _buildFeedList(FeedProvider feedProvider) {
    final widgets = feedProvider.widgets;

    if (widgets.isEmpty) {
      return _buildEmptyState();
    }

    return ListView.builder(
      controller: _scrollController,
      padding: const EdgeInsets.symmetric(horizontal: AppSpacing.screenPadding),
      itemCount: widgets.length + 1, // +1 for bottom padding
      itemBuilder: (context, index) {
        if (index == widgets.length) {
          // Bottom padding for input bar
          return SizedBox(height: AppSpacing.inputBarHeight + AppSpacing.xxl);
        }

        final widgetData = widgets[index];
        return Padding(
          padding: const EdgeInsets.only(bottom: AppSpacing.widgetGap),
          child: _buildWidget(widgetData, feedProvider),
        );
      },
    );
  }

  Widget _buildWidget(FeedWidgetData widgetData, FeedProvider feedProvider) {
    switch (widgetData.type) {
      case FeedWidgetType.habitsChecklist:
        final data = widgetData.data as Map<String, dynamic>;
        return HabitsChecklistWidget(
          habits: data['habits'] as List<Habit>,
          completedToday: data['completedToday'] as int,
          onTap: () => _navigateToHabits(),
          onHabitToggle: (habit, completed) => _toggleHabit(habit, completed),
        );

      case FeedWidgetType.recentMemories:
        return RecentMemoriesWidget(
          memories: widgetData.data as List<Memory>,
          onTap: () => _navigateToMemories(),
          onMemoryTap: (memory) => _navigateToMemoryDetail(memory),
        );

      case FeedWidgetType.engagementScore:
        return EngagementScoreWidget(
          summary: widgetData.data as EngagementSummary,
          onTap: () => _navigateToEngagement(),
        );

      case FeedWidgetType.fitnessSummary:
        return FitnessSummaryWidget(
          memories: widgetData.data as List<Memory>,
          onTap: () => _navigateToCategory('fitness'),
        );

      case FeedWidgetType.financeSummary:
        return FinanceSummaryWidget(
          memories: widgetData.data as List<Memory>,
          onTap: () => _navigateToCategory('finance'),
        );

      case FeedWidgetType.healthDashboard:
        return HealthDashboardWidget(
          memories: widgetData.data as List<Memory>,
          onTap: () => _navigateToCategory('health'),
        );

      case FeedWidgetType.mindfulnessTracker:
        return MindfulnessTrackerWidget(
          memories: widgetData.data as List<Memory>,
          onTap: () => _navigateToCategory('mindfulness'),
        );

      case FeedWidgetType.routineTimeline:
        return RoutineTimelineWidget(
          memories: widgetData.data as List<Memory>,
          onTap: () => _navigateToCategory('routine'),
        );

      case FeedWidgetType.patternDetected:
        return PatternDetectedWidget(
          insight: widgetData.data as Insight,
          onTap: () => _navigateToPatterns(),
          onCreateHabit: () =>
              _createHabitFromInsight(widgetData.data as Insight),
        );

      case FeedWidgetType.gapWarning:
        return GapWarningWidget(
          notification: widgetData.data as AppNotification,
          onQuickLog: () => _showQuickLog(),
          onDismiss: () => feedProvider.dismissWidget(widgetData.id),
        );

      case FeedWidgetType.streakMilestone:
        return StreakMilestoneWidget(
          streakDays: widgetData.data as int,
          onTap: () => _navigateToEngagement(),
        );

      case FeedWidgetType.achievementUnlocked:
        return AchievementUnlockedWidget(
          name: 'Achievement',
          description: 'You earned a badge!',
          onTap: () => _navigateToAchievements(),
        );

      default:
        return const SizedBox.shrink();
    }
  }

  Widget _buildInputBarContainer() {
    return Container(
      padding: const EdgeInsets.symmetric(
        horizontal: AppSpacing.screenPadding,
        vertical: AppSpacing.sm,
      ),
      decoration: BoxDecoration(
        color: AppColors.background,
        boxShadow: [
          BoxShadow(
            color: AppColors.textPrimary.withOpacity(0.05),
            blurRadius: 10,
            offset: const Offset(0, -5),
          ),
        ],
      ),
      child: const VoiceInputBar(),
    );
  }

  Widget _buildEmptyState() {
    return Center(
      child: Padding(
        padding: const EdgeInsets.all(AppSpacing.xl),
        child: Column(
          mainAxisAlignment: MainAxisAlignment.center,
          children: [
            Container(
              width: 80,
              height: 80,
              decoration: BoxDecoration(
                color: AppColors.primaryLight.withOpacity(0.2),
                shape: BoxShape.circle,
              ),
              child: const Icon(
                Icons.mic_rounded,
                size: 40,
                color: AppColors.primary,
              ),
            ),
            const SizedBox(height: AppSpacing.lg),
            Text(
              'Start logging your life',
              style: AppTypography.h3,
              textAlign: TextAlign.center,
            ),
            const SizedBox(height: AppSpacing.sm),
            Text(
              'Just speak or type naturally.\nWe\'ll understand and organize for you.',
              style: AppTypography.body.copyWith(
                color: AppColors.textSecondary,
              ),
              textAlign: TextAlign.center,
            ),
            const SizedBox(height: AppSpacing.xl),
            Wrap(
              spacing: AppSpacing.sm,
              runSpacing: AppSpacing.sm,
              alignment: WrapAlignment.center,
              children: [
                _buildExampleChip('💪 "Did leg workout for 1 hour"'),
                _buildExampleChip('💵 "Spent \$30 on lunch"'),
                _buildExampleChip('🧘 "Meditated for 15 minutes"'),
              ],
            ),
          ],
        ),
      ),
    );
  }

  Widget _buildExampleChip(String text) {
    return Container(
      padding: const EdgeInsets.symmetric(
        horizontal: AppSpacing.md,
        vertical: AppSpacing.sm,
      ),
      decoration: BoxDecoration(
        color: AppColors.surface,
        borderRadius: BorderRadius.circular(AppSpacing.radiusFull),
        border: Border.all(color: AppColors.border),
      ),
      child: Text(text, style: AppTypography.bodySmall),
    );
  }

  Widget _buildErrorState(String error) {
    return Center(
      child: Column(
        mainAxisAlignment: MainAxisAlignment.center,
        children: [
          const Icon(
            Icons.cloud_off_rounded,
            size: 48,
            color: AppColors.textTertiary,
          ),
          const SizedBox(height: AppSpacing.md),
          Text('Unable to load', style: AppTypography.h4),
          const SizedBox(height: AppSpacing.xs),
          Text(
            error,
            style: AppTypography.caption,
            textAlign: TextAlign.center,
          ),
          const SizedBox(height: AppSpacing.lg),
          ElevatedButton(
            onPressed: () => context.read<FeedProvider>().loadFeed(),
            child: const Text('Retry'),
          ),
        ],
      ),
    );
  }

  // Navigation methods
  void _navigateToHabits() {
    Navigator.push(
      context,
      MaterialPageRoute(builder: (context) => const HabitsScreen()),
    );
  }

  void _navigateToMemories() {
    Navigator.push(
      context,
      MaterialPageRoute(builder: (context) => const MemoriesScreen()),
    );
  }

  void _navigateToMemoryDetail(Memory memory) {
    Navigator.push(
      context,
      MaterialPageRoute(builder: (context) => const MemoriesScreen()),
    );
  }

  void _navigateToEngagement() {
    Navigator.push(
      context,
      MaterialPageRoute(builder: (context) => const EngagementScreen()),
    );
  }

  void _navigateToCategory(String category) {
    final appCategory = AppCategory.values.firstWhere(
      (c) => c.name == category,
      orElse: () => AppCategory.generic,
    );
    Navigator.push(
      context,
      MaterialPageRoute(
        builder: (context) => CategoryScreen(category: appCategory),
      ),
    );
  }

  void _navigateToPatterns() {
    Navigator.push(
      context,
      MaterialPageRoute(builder: (context) => const PatternsScreen()),
    );
  }

  void _navigateToAchievements() {
    Navigator.push(
      context,
      MaterialPageRoute(builder: (context) => const AchievementsScreen()),
    );
  }

  void _toggleHabit(Habit habit, bool completed) async {
    final app = context.read<AppProvider>();
    await app.habitsService.completeHabit(habit.id, completed: completed);
    // Refresh feed after toggling
    if (mounted) {
      context.read<FeedProvider>().refreshFeed();
    }
  }

  void _createHabitFromInsight(Insight insight) {
    Navigator.push(
      context,
      MaterialPageRoute(builder: (context) => const HabitsScreen()),
    );
  }

  void _showQuickLog() {
    Navigator.push(
      context,
      MaterialPageRoute(
        fullscreenDialog: true,
        builder: (context) => const InputModalScreen(),
      ),
    );
  }
}
