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
  final AnalyticsService _analyticsService;
  final NotificationsService _notificationsService;
  final FeatureFlagService _featureFlagService;

  FeedProvider({
    required MemoryService memoryService,
    required HabitsService habitsService,
    required InsightsService insightsService,
    required EngagementService engagementService,
    required AnalyticsService analyticsService,
    required NotificationsService notificationsService,
    required FeatureFlagService featureFlagService,
  })  : _memoryService = memoryService,
        _habitsService = habitsService,
        _insightsService = insightsService,
        _engagementService = engagementService,
        _analyticsService = analyticsService,
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

    // Run loads independently to prevent one failure from blocking others
    await Future.wait([
      _loadMemories()
          .catchError((e) => debugPrint('Error loading memories: $e')),
      _loadHabits().catchError((e) => debugPrint('Error loading habits: $e')),
      _loadInsights()
          .catchError((e) => debugPrint('Error loading insights: $e')),
      _loadEngagement()
          .catchError((e) => debugPrint('Error loading engagement: $e')),
      _loadNotifications()
          .catchError((e) => debugPrint('Error loading notifications: $e')),
      _loadCategoryStats()
          .catchError((e) => debugPrint('Error loading stats: $e')),
    ]);

    try {
      _calculateWidgetPriorities();
    } catch (e) {
      debugPrint('Error calculating priorities: $e');
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
    // Get stats for current user (use 'current' or get from auth provider if available)
    final response = await _analyticsService.getConsistencyScore('current');
    if (response.success && response.data != null) {
      _engagementSummary = response.data;
    }
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
  /// Calculate widget priorities based on time, usage, freshness, etc.
  void _calculateWidgetPriorities() {
    final now = DateTime.now();
    final List<FeedWidgetData> newWidgets = [];

    // 1. Engagement Score - ALWAYS PINNED TOP
    if (_engagementSummary != null) {
      newWidgets.add(
        FeedWidgetData(
          type: FeedWidgetType.engagementScore,
          id: 'engagement_score',
          priority: 100.0, // Absolute highest priority
          lastUpdated: now, // Always fresh
          data: _engagementSummary,
        ),
      );
    }

    // 2. Streak Milestone - High Priority (Pin below score)
    if (_engagementSummary != null &&
        _engagementSummary!.engagement.currentLoggingStreak > 0) {
      final streak = _engagementSummary!.engagement.currentLoggingStreak;
      // Show if hitting a milestone (7, 14, 30, 60, 90, etc.)
      if (streak == 7 || streak == 14 || streak == 30 || streak % 30 == 0) {
        newWidgets.add(
          FeedWidgetData(
            type: FeedWidgetType.streakMilestone,
            id: 'streak_milestone',
            priority: 99.0,
            lastUpdated: now,
            data: streak,
            isNew: true,
          ),
        );
      }
    }

    // 3. Dynamic Widgets (Sorted by Time)

    // Habits Checklist (Daily)
    // We treat this as "Today's" widget, so updated at start of day or now.
    final showHabits = _habits.isNotEmpty ||
        _featureFlagService.isFeatureVisible('widget_habits');

    if (showHabits) {
      final completedToday = _habits.where((h) => h.currentStreak > 0).length;
      newWidgets.add(
        FeedWidgetData(
          type: FeedWidgetType.habitsChecklist,
          id: 'habits_checklist',
          priority: 50.0,
          lastUpdated: now, // Always relevant "now"
          data: {
            'habits': _habits,
            'completedToday': completedToday,
            'total': _habits.length,
          },
        ),
      );
    }

    // Recent Memories - ALWAYS ADD for debugging
    // if (_recentMemories.isNotEmpty) {
    final latestMemoryTime = _recentMemories.isNotEmpty
        ? _recentMemories.first.createdAt
        : DateTime.now();

    newWidgets.add(
      FeedWidgetData(
        type: FeedWidgetType.recentMemories,
        id: 'recent_memories',
        priority:
            85.0, // Boost priority to ensure visibility (above habits, below score)
        lastUpdated: latestMemoryTime,
        data: _recentMemories,
      ),
    );
    // }

    // Insights/Patterns
    for (final insight in _insights.take(3)) {
      newWidgets.add(
        FeedWidgetData(
          type: FeedWidgetType.patternDetected,
          id: 'pattern_${insight.id}',
          priority: insight.isNew ? 60.0 : 30.0,
          lastUpdated: insight.lastUpdated ?? DateTime.now(), // Use real time
          data: insight,
          isNew: insight.isNew,
        ),
      );
    }

    // Gap warnings
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
          priority: 70.0,
          lastUpdated: notif.createdAt, // Use real time
          data: notif,
        ),
      );
    }

    // Category Summaries - Only show if relevant recently
    // We can assume they are "Weekly" summaries, so maybe show them if not shown recently?
    // For "Minimal", let's ONLY show them if they have high activity TODAY.
    // Simplifying: Just let them fall into the feed based on "now".

    void addCategoryWidget(String category, FeedWidgetType type, String id) {
      if (_categoryStats[category] != null && _categoryStats[category]! > 0) {
        newWidgets.add(
          FeedWidgetData(
            type: type,
            id: id,
            priority: 20.0,
            lastUpdated: now.subtract(
                const Duration(hours: 2)), // Slightly older to push down
            data: _recentMemories
                .where((m) => m.category == category)
                .take(5)
                .toList(),
          ),
        );
      }
    }

    addCategoryWidget(
        'fitness', FeedWidgetType.fitnessSummary, 'fitness_summary');
    addCategoryWidget(
        'finance', FeedWidgetType.financeSummary, 'finance_summary');
    addCategoryWidget(
        'health', FeedWidgetType.healthDashboard, 'health_dashboard');
    addCategoryWidget('mindfulness', FeedWidgetType.mindfulnessTracker,
        'mindfulness_tracker');
    addCategoryWidget(
        'routine', FeedWidgetType.routineTimeline, 'routine_timeline');

    // SORTING LOGIC:
    // 1. Pinned items (Priority > 90) stay at top.
    // 2. Rest are sorted by Date (Newest First).

    newWidgets.sort((a, b) {
      // Use a threshold for "Pinned"
      final aPinned = a.priority > 90;
      final bPinned = b.priority > 90;

      if (aPinned && bPinned) {
        return b.priority.compareTo(a.priority); // Higher priority first
      }
      if (aPinned) return -1; // a comes first
      if (bPinned) return 1; // b comes first

      // Otherwise sort by Time
      return b.lastUpdated.compareTo(a.lastUpdated);
    });

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
