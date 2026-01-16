import '../models/engagement_models.dart';
import 'api_client.dart';

class AnalyticsService {
  final ApiClient _apiClient;

  AnalyticsService(this._apiClient);

  /// Get consistency score and engagement metrics for a user
  Future<ApiResponse<EngagementSummary>> getConsistencyScore(
      String userId) async {
    try {
      final response = await _apiClient.get(
        '/analytics/consistency/$userId',
        fromJson: (json) => EngagementSummary.fromJson(json),
      );
      return response;
    } catch (e) {
      return ApiResponse.error(e.toString());
    }
  }

  /// Get detected patterns for a user
  Future<ApiResponse<List<Map<String, dynamic>>>> getPatterns(
      String userId) async {
    try {
      final response = await _apiClient.get(
        '/analytics/patterns/$userId',
        fromJson: (json) {
          final List<dynamic> patternsJson = json['frequency_patterns'] ?? [];
          return List<Map<String, dynamic>>.from(patternsJson);
        },
      );
      return response;
    } catch (e) {
      return ApiResponse.error(e.toString());
    }
  }
}
