import 'api_client.dart';
import '../models/engagement_models.dart';

/// Service for engagement and gamification
class EngagementService {
  final ApiClient _client;

  EngagementService(this._client);

  /// Get current engagement data
  Future<ApiResponse<Engagement>> getEngagement() async {
    return _client.get<Engagement>(
      '/engagement',
      fromJson: (json) => Engagement.fromJson(json),
    );
  }

  /// Get comprehensive engagement summary
  Future<ApiResponse<EngagementSummary>> getSummary() async {
    return _client.get<EngagementSummary>(
      '/engagement/summary',
      fromJson: (json) => EngagementSummary.fromJson(json),
    );
  }

  /// Get historical analytics
  Future<ApiResponse<EngagementAnalytics>> getAnalytics({int days = 30}) async {
    return _client.get<EngagementAnalytics>(
      '/engagement/analytics',
      queryParams: {'days': days},
      fromJson: (json) => EngagementAnalytics.fromJson(json),
    );
  }

  /// Get streak history
  Future<ApiResponse<StreakData>> getStreaks() async {
    return _client.get<StreakData>(
      '/engagement/streaks',
      fromJson: (json) => StreakData.fromJson(json),
    );
  }

  /// Get milestones
  Future<ApiResponse<MilestonesData>> getMilestones() async {
    return _client.get<MilestonesData>(
      '/engagement/milestones',
      fromJson: (json) => MilestonesData.fromJson(json),
    );
  }

  /// Refresh engagement score
  Future<ApiResponse<Engagement>> refreshEngagement() async {
    return _client.post<Engagement>(
      '/engagement/refresh',
      fromJson: (json) => Engagement.fromJson(json),
    );
  }
}
