import 'api_client.dart';
import '../models/insight_models.dart';

/// Service for insights and patterns
class InsightsService {
  final ApiClient _client;

  InsightsService(this._client);

  /// Get all insights
  Future<ApiResponse<List<Insight>>> getInsights({bool refresh = false}) async {
    return _client.get<List<Insight>>(
      '/insights',
      queryParams: {'refresh': refresh},
      fromJson: (json) => (json as List).map((e) => Insight.fromJson(e)).toList(),
    );
  }

  /// Get insights for specific category
  Future<ApiResponse<List<Insight>>> getCategoryInsights(String category) async {
    return _client.get<List<Insight>>(
      '/insights/category/$category',
      fromJson: (json) => (json as List).map((e) => Insight.fromJson(e)).toList(),
    );
  }

  /// Force refresh insights
  Future<ApiResponse<List<Insight>>> refreshInsights() async {
    return _client.post<List<Insight>>(
      '/insights/refresh',
      fromJson: (json) => (json as List).map((e) => Insight.fromJson(e)).toList(),
    );
  }

  /// Get patterns
  Future<ApiResponse<List<Pattern>>> getPatterns({bool refresh = false}) async {
    return _client.get<List<Pattern>>(
      '/insights/patterns',
      queryParams: {'refresh': refresh},
      fromJson: (json) => (json as List).map((e) => Pattern.fromJson(e)).toList(),
    );
  }
}
