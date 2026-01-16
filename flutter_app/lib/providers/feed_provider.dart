import 'package:flutter/foundation.dart';
import '../models/models.dart';
import '../services/services.dart';

/// Feed widget type for priority calculation
enum FeedWidgetType {
  quickInput,
  habitsChecklist,
  recentMemories,
  engagementScore,
  fitnessSummary,
  financeSummary,
  healthDashboard,
  mindfulnessTracker,
  routineTimeline,
  patternDetected,
  aiRecommendation,
  gapWarning,
  streakMilestone,
  achievementUnlocked,
}

/// Feed widget data wrapper
class FeedWidgetData {
  final FeedWidgetType type;
  final String id;
  final double priority;
  final DateTime lastUpdated;
  final dynamic data;
  final bool isNew;

  FeedWidgetData({
    required this.type,
    required this.id,
    required this.priority,
    required this.lastUpdated,
    this.data,
    this.isNew = false,
  });

  FeedWidgetData copyWith({double? priority, dynamic data, bool? isNew}) {
    return FeedWidgetData(
      type: type,
      id: id,
      priority: priority ?? this.priority,
      lastUpdated: DateTime.now(),
      data: data ?? this.data,
      isNew: isNew ?? this.isNew,
    );
  }
}

/// Provider for managing the feed widget stream
class FeedProvider extends ChangeNotifier {
  final MemoryService _memoryService;
  final HabitsService _habitsService;
  final InsightsService _insightsService;
  final EngagementService _engagementService;
  final NotificationsService _notificationsService;
  final FeatureFlagService _featureFlagService;

  FeedProvider({
    required MemoryService memoryService,
    required HabitsService habitsService,
    required InsightsService insightsService,
    required EngagementService engagementService,
    required NotificationsService notificationsService,
    required FeatureFlagService featureFlagService,
  })  : _memoryService = memoryService,
        _habitsService = habitsService,
        _insightsService = insightsService,
        _engagementService = engagementService,
        _notificationsService = notificationsService,
        _featureFlagService = featureFlagService;

  bool _isLoading = false;
  bool get isLoading => _isLoading;

  bool _isRefreshing = false;
  bool get isRefreshing => _isRefreshing;

  String? _error;
  String? get error => _error;

  // Data stores
  List<Memory> _recentMemories = [];
  List<Memory> get recentMemories => _recentMemories;

  List<Habit> _habits = [];
  List<Habit> get habits => _habits;

  List<Insight> _insights = [];
  List<Insight> get insights => _insights;

  EngagementSummary? _engagementSummary;
  EngagementSummary? get engagementSummary => _engagementSummary;

  List<AppNotification> _notifications = [];
  List<AppNotification> get notifications => _notifications;

  Map<String, int> _categoryStats = {};
  Map<String, int> get categoryStats => _categoryStats;

  // Computed widgets list sorted by priority
  List<FeedWidgetData> _widgets = [];
  List<FeedWidgetData> get widgets => _widgets;

  /// Initial load of all feed data
  Future<void> loadFeed() async {
    if (_isLoading) return;

    _isLoading = true;
    _error = null;
    notifyListeners();

    try {
      await Future.wait([
        _loadMemories(),
        _loadHabits(),
        _loadInsights(),
        _loadEngagement(),
        _loadNotifications(),
        _loadCategoryStats(),
      ]);

      _calculateWidgetPriorities();
    } catch (e) {
      _error = e.toString();
    }

    _isLoading = false;
    notifyListeners();
  }

  /// Refresh feed data
  Future<void> refreshFeed() async {
    if (_isRefreshing) return;

    _isRefreshing = true;
    notifyListeners();

    await loadFeed();

    _isRefreshing = false;
    notifyListeners();
  }

  Future<void> _loadMemories() async {
    final response = await _memoryService.getMemories(limit: 10);
    if (response.success && response.data != null) {
      _recentMemories = response.data!;
    }
  }

  Future<void> _loadHabits() async {
    final response = await _habitsService.getHabits(status: 'active');
    if (response.success && response.data != null) {
      _habits = response.data!;
    }
  }

  Future<void> _loadInsights() async {
    final response = await _insightsService.getInsights();
    if (response.success && response.data != null) {
      _insights = response.data!;
    }
  }

  Future<void> _loadEngagement() async {
    // TODO: Implement getSummary in EngagementService
    // final response = await _engagementService.getSummary();
    // if (response.success && response.data != null) {
    //   _engagementSummary = response.data;
    // }
  }

  Future<void> _loadNotifications() async {
    final response = await _notificationsService.getNotifications(limit: 10);
    if (response.success && response.data != null) {
      _notifications = response.data!;
    }
  }

  Future<void> _loadCategoryStats() async {
    final response = await _memoryService.getCategoryStats();
    if (response.success && response.data != null) {
      _categoryStats = response.data!;
    }
  }

  /// Calculate widget priorities based on time, usage, freshness, etc.
  void _calculateWidgetPriorities() {
    final now = DateTime.now();
    final hour = now.hour;
    final List<FeedWidgetData> newWidgets = [];

    // Time-based priority multipliers
    final isMorning = hour >= 7 && hour < 10;
    final isEvening = hour >= 17 && hour < 21;

    // Habits Checklist
    // Show if: Has Habits OR Feature Flag says visible (Promo/Onboarding)
    final showHabits = _habits.isNotEmpty ||
        _featureFlagService.isFeatureVisible('widget_habits');

    if (showHabits) {
      final completedToday = _habits.where((h) => h.currentStreak > 0).length;
      newWidgets.add(
        FeedWidgetData(
          type: FeedWidgetType.habitsChecklist,
          id: 'habits_checklist',
          priority: isMorning ? 0.95 : 0.75,
          lastUpdated: now,
          data: {
            'habits': _habits,
            'completedToday': completedToday,
            'total': _habits.length,
          },
        ),
      );
    }

    // Recent Memories - always relevant
    if (_recentMemories.isNotEmpty) {
      newWidgets.add(
        FeedWidgetData(
          type: FeedWidgetType.recentMemories,
          id: 'recent_memories',
          priority: 0.80,
          lastUpdated: now,
          data: _recentMemories,
        ),
      );
    }

    // Engagement Score - higher in evening
    if (_engagementSummary != null) {
      newWidgets.add(
        FeedWidgetData(
          type: FeedWidgetType.engagementScore,
          id: 'engagement_score',
          priority: isEvening ? 0.85 : 0.70,
          lastUpdated: now,
          data: _engagementSummary,
        ),
      );
    }

    // Category summaries based on stats
    if (_categoryStats['fitness'] != null && _categoryStats['fitness']! > 0) {
      newWidgets.add(
        FeedWidgetData(
          type: FeedWidgetType.fitnessSummary,
          id: 'fitness_summary',
          priority: 0.65,
          lastUpdated: now,
          data: _recentMemories
              .where((m) => m.category == 'fitness')
              .take(5)
              .toList(),
        ),
      );
    }

    if (_categoryStats['finance'] != null && _categoryStats['finance']! > 0) {
      newWidgets.add(
        FeedWidgetData(
          type: FeedWidgetType.financeSummary,
          id: 'finance_summary',
          priority: isEvening ? 0.70 : 0.60,
          lastUpdated: now,
          data: _recentMemories
              .where((m) => m.category == 'finance')
              .take(5)
              .toList(),
        ),
      );
    }

    if (_categoryStats['health'] != null && _categoryStats['health']! > 0) {
      newWidgets.add(
        FeedWidgetData(
          type: FeedWidgetType.healthDashboard,
          id: 'health_dashboard',
          priority: 0.60,
          lastUpdated: now,
          data: _recentMemories
              .where((m) => m.category == 'health')
              .take(5)
              .toList(),
        ),
      );
    }

    if (_categoryStats['mindfulness'] != null &&
        _categoryStats['mindfulness']! > 0) {
      newWidgets.add(
        FeedWidgetData(
          type: FeedWidgetType.mindfulnessTracker,
          id: 'mindfulness_tracker',
          priority: isMorning ? 0.70 : 0.55,
          lastUpdated: now,
          data: _recentMemories
              .where((m) => m.category == 'mindfulness')
              .take(5)
              .toList(),
        ),
      );
    }

    if (_categoryStats['routine'] != null && _categoryStats['routine']! > 0) {
      newWidgets.add(
        FeedWidgetData(
          type: FeedWidgetType.routineTimeline,
          id: 'routine_timeline',
          priority: isMorning ? 0.75 : 0.50,
          lastUpdated: now,
          data: _recentMemories
              .where((m) => m.category == 'routine')
              .take(5)
              .toList(),
        ),
      );
    }

    // Insights/Patterns
    for (final insight in _insights.take(3)) {
      newWidgets.add(
        FeedWidgetData(
          type: FeedWidgetType.patternDetected,
          id: 'pattern_${insight.id}',
          priority: insight.isNew ? 0.90 : 0.65,
          lastUpdated: now,
          data: insight,
          isNew: insight.isNew,
        ),
      );
    }

    // Gap warnings from notifications
    final gapNotifications = _notifications
        .where(
          (n) => n.type == 'alert' || n.title.toLowerCase().contains('gap'),
        )
        .take(2);
    for (final notif in gapNotifications) {
      newWidgets.add(
        FeedWidgetData(
          type: FeedWidgetType.gapWarning,
          id: 'gap_${notif.id}',
          priority: 0.85,
          lastUpdated: now,
          data: notif,
        ),
      );
    }

    // Streak milestone
    if (_engagementSummary != null &&
        _engagementSummary!.engagement.currentLoggingStreak > 0) {
      final streak = _engagementSummary!.engagement.currentLoggingStreak;
      // Show if hitting a milestone (7, 14, 30, 60, 90, etc.)
      if (streak == 7 || streak == 14 || streak == 30 || streak % 30 == 0) {
        newWidgets.add(
          FeedWidgetData(
            type: FeedWidgetType.streakMilestone,
            id: 'streak_milestone',
            priority: 0.95,
            lastUpdated: now,
            data: streak,
            isNew: true,
          ),
        );
      }
    }

    // Sort by priority descending
    newWidgets.sort((a, b) => b.priority.compareTo(a.priority));
    _widgets = newWidgets;
  }

  /// Dismiss a widget temporarily
  void dismissWidget(String widgetId) {
    _widgets = _widgets.where((w) => w.id != widgetId).toList();
    notifyListeners();
  }

  /// Pin a widget to top
  void pinWidget(String widgetId) {
    final index = _widgets.indexWhere((w) => w.id == widgetId);
    if (index >= 0) {
      final widget = _widgets[index].copyWith(priority: 1.0);
      _widgets.removeAt(index);
      _widgets.insert(0, widget);
      notifyListeners();
    }
  }

  /// Update habits data (e.g., after completing a habit)
  void updateHabit(Habit updatedHabit) {
    final index = _habits.indexWhere((h) => h.id == updatedHabit.id);
    if (index >= 0) {
      _habits[index] = updatedHabit;
      _calculateWidgetPriorities();
      notifyListeners();
    }
  }

  /// Add new memory to recent memories
  void addMemory(Memory memory) {
    _recentMemories.insert(0, memory);
    if (_recentMemories.length > 10) {
      _recentMemories = _recentMemories.take(10).toList();
    }

    // Update category stats
    final category = memory.category;
    _categoryStats[category] = (_categoryStats[category] ?? 0) + 1;

    _calculateWidgetPriorities();
    notifyListeners();
  }
}
