/// Engagement data model
class Engagement {
  final String userId;
  final int engagementScore;
  final String engagementTrend; // increasing, stable, declining, inactive
  final bool isAtRisk;
  final int currentLoggingStreak;
  final int longestLoggingStreak;
  final int totalEvents;
  final DateTime? lastActivityDate;
  final DateTime? updatedAt;

  Engagement({
    required this.userId,
    required this.engagementScore,
    required this.engagementTrend,
    required this.isAtRisk,
    required this.currentLoggingStreak,
    required this.longestLoggingStreak,
    required this.totalEvents,
    this.lastActivityDate,
    this.updatedAt,
  });

  factory Engagement.fromJson(Map<String, dynamic> json) {
    // Handle nested objects from backend response
    final streak = json['streak'] is Map<String, dynamic>
        ? json['streak']
        : <String, dynamic>{};
    final activity = json['activity'] is Map<String, dynamic>
        ? json['activity']
        : <String, dynamic>{};

    return Engagement(
      userId: json['user_id'] ?? json['userId'] ?? '',
      // Debug print
      // ignore: avoid_print
      // print('Engagement Parsing: Stats inside? ${json.containsKey('stats')} Streak cached? ${json['streak']}');
      // Backend sends 'score', model expects 'engagementScore'
      engagementScore: json['score'] ??
          json['engagement_score'] ??
          json['engagementScore'] ??
          0,
      engagementTrend:
          json['engagement_trend'] ?? json['engagementTrend'] ?? 'stable',
      isAtRisk: json['is_at_risk'] ?? json['isAtRisk'] ?? false,
      // Backend sends nested streak object
      currentLoggingStreak: streak['current'] ??
          json['stats']?['current_streak'] ??
          json['current_logging_streak'] ??
          json['currentLoggingStreak'] ??
          0,
      longestLoggingStreak: streak['longest'] ??
          json['longest_logging_streak'] ??
          json['longestLoggingStreak'] ??
          0,
      // Backend sends nested activity object or stats
      totalEvents: activity['total_events'] ??
          json['stats']?['events_30d'] ?? // Proxy for total if not available
          json['total_events'] ??
          json['totalEvents'] ??
          0,
      lastActivityDate: json['last_activity'] != null
          ? DateTime.parse(json['last_activity'])
          : (json['last_activity_date'] != null
              ? DateTime.parse(json['last_activity_date'])
              : null),
      updatedAt: json['updated_at'] != null
          ? DateTime.parse(json['updated_at'])
          : null,
    );
  }

  String get trendEmoji {
    switch (engagementTrend) {
      case 'increasing':
        return '📈';
      case 'declining':
        return '📉';
      case 'inactive':
        return '💤';
      default:
        return '➡️';
    }
  }
}

/// Comprehensive engagement summary
class EngagementSummary {
  final Engagement engagement;
  final Map<String, int> categoryBreakdown;
  final List<EngagementTip> tips;
  final int todayEvents;
  final int weekEvents;

  EngagementSummary({
    required this.engagement,
    required this.categoryBreakdown,
    required this.tips,
    required this.todayEvents,
    required this.weekEvents,
  });

  factory EngagementSummary.fromJson(Map<String, dynamic> json) {
    // Debug print
    // ignore: avoid_print
    // print('EngagementSummary Parsing: Keys: ${json.keys.toList()}');
    // ignore: avoid_print
    // print('EngagementSummary Stats value: ${json['stats']}');

    return EngagementSummary(
      engagement: Engagement.fromJson(json['engagement'] ?? json),
      categoryBreakdown: Map<String, int>.from(
        json['category_breakdown'] ?? json['categoryBreakdown'] ?? {},
      ),
      tips: (json['tips'] as List?)
              ?.map((e) => EngagementTip.fromJson(e))
              .toList() ??
          [],
      // Map from backend stats
      todayEvents: json['today_events'] ??
          json['todayEvents'] ??
          (json['stats']?['days_since_last'] == 0 ? 1 : 0),
      weekEvents: json['week_events'] ??
          json['weekEvents'] ??
          json['stats']?['events_7d'] ??
          0,
    );
  }

  /// Convenience getters
  int get currentScore => engagement.engagementScore;
  int get trend {
    switch (engagement.engagementTrend) {
      case 'increasing':
        return 5;
      case 'declining':
        return -5;
      default:
        return 0;
    }
  }
}

/// Engagement tip
class EngagementTip {
  final String tip;
  final String? action;

  EngagementTip({required this.tip, this.action});

  factory EngagementTip.fromJson(Map<String, dynamic> json) {
    return EngagementTip(tip: json['tip'] ?? '', action: json['action']);
  }
}

/// Historical engagement analytics
class EngagementAnalytics {
  final List<DailyEngagement> dailyData;
  final int averageScore;
  final int peakScore;
  final DateTime? peakDate;

  EngagementAnalytics({
    required this.dailyData,
    required this.averageScore,
    required this.peakScore,
    this.peakDate,
  });

  factory EngagementAnalytics.fromJson(Map<String, dynamic> json) {
    return EngagementAnalytics(
      dailyData: (json['daily_data'] ?? json['dailyData'] as List?)
              ?.map((e) => DailyEngagement.fromJson(e))
              .toList() ??
          [],
      averageScore: json['average_score'] ?? json['averageScore'] ?? 0,
      peakScore: json['peak_score'] ?? json['peakScore'] ?? 0,
      peakDate:
          json['peak_date'] != null ? DateTime.parse(json['peak_date']) : null,
    );
  }
}

/// Daily engagement data point
class DailyEngagement {
  final DateTime date;
  final int score;
  final int events;

  DailyEngagement({
    required this.date,
    required this.score,
    required this.events,
  });

  factory DailyEngagement.fromJson(Map<String, dynamic> json) {
    return DailyEngagement(
      date: DateTime.parse(json['date']),
      score: json['score'] ?? 0,
      events: json['events'] ?? 0,
    );
  }
}

/// Streak data
class StreakData {
  final String? name;
  final int currentStreak;
  final int longestStreak;
  final List<StreakDay> calendar;
  final DateTime? streakStartDate;
  final bool isActive;

  StreakData({
    this.name,
    required this.currentStreak,
    required this.longestStreak,
    required this.calendar,
    this.streakStartDate,
    this.isActive = true,
  });

  factory StreakData.fromJson(Map<String, dynamic> json) {
    return StreakData(
      name: json['name'] ?? 'Logging',
      currentStreak: json['current_streak'] ?? json['currentStreak'] ?? 0,
      longestStreak: json['longest_streak'] ?? json['longestStreak'] ?? 0,
      calendar: (json['calendar'] as List?)
              ?.map((e) => StreakDay.fromJson(e))
              .toList() ??
          [],
      streakStartDate: json['streak_start_date'] != null
          ? DateTime.parse(json['streak_start_date'])
          : null,
      isActive: json['is_active'] ?? json['isActive'] ?? true,
    );
  }
}

/// Single day in streak calendar
class StreakDay {
  final DateTime date;
  final bool hasActivity;
  final int eventCount;

  StreakDay({
    required this.date,
    required this.hasActivity,
    required this.eventCount,
  });

  factory StreakDay.fromJson(Map<String, dynamic> json) {
    return StreakDay(
      date: DateTime.parse(json['date']),
      hasActivity: json['has_activity'] ?? json['hasActivity'] ?? false,
      eventCount: json['event_count'] ?? json['eventCount'] ?? 0,
    );
  }
}

/// Milestones data
class MilestonesData {
  final List<Milestone> achieved;
  final List<Milestone> upcoming;
  final int totalPoints;

  MilestonesData({
    required this.achieved,
    required this.upcoming,
    required this.totalPoints,
  });

  factory MilestonesData.fromJson(Map<String, dynamic> json) {
    return MilestonesData(
      achieved: (json['achieved'] as List?)
              ?.map((e) => Milestone.fromJson(e))
              .toList() ??
          [],
      upcoming: (json['upcoming'] as List?)
              ?.map((e) => Milestone.fromJson(e))
              .toList() ??
          [],
      totalPoints: json['total_points'] ?? json['totalPoints'] ?? 0,
    );
  }
}

/// Single milestone/achievement
class Milestone {
  final String id;
  final String name;
  final String description;
  final String icon;
  final int points;
  final bool isAchieved;
  final DateTime? achievedAt;
  final double progress;
  final String? type;

  Milestone({
    required this.id,
    required this.name,
    required this.description,
    required this.icon,
    required this.points,
    required this.isAchieved,
    this.achievedAt,
    this.progress = 0,
    this.type,
  });

  factory Milestone.fromJson(Map<String, dynamic> json) {
    return Milestone(
      id: json['id'] ?? '',
      name: json['name'] ?? '',
      description: json['description'] ?? '',
      icon: json['icon'] ?? '🏆',
      points: json['points'] ?? 0,
      isAchieved: json['is_achieved'] ?? json['isAchieved'] ?? false,
      achievedAt: json['achieved_at'] != null
          ? DateTime.parse(json['achieved_at'])
          : null,
      progress: (json['progress'] ?? 0).toDouble(),
      type: json['type'],
    );
  }

  /// Alias for isAchieved
  bool get achieved => isAchieved;

  /// Alias for name
  String get title => name;
}
