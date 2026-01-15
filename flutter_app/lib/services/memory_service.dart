import 'api_client.dart';
import '../models/memory_models.dart';

/// Service for memory CRUD operations
class MemoryService {
  final ApiClient _client;

  MemoryService(this._client);

  /// Get memories with optional filters
  Future<ApiResponse<List<Memory>>> getMemories({
    String? category,
    String? eventType,
    DateTime? startDate,
    DateTime? endDate,
    int limit = 50,
    int offset = 0,
  }) async {
    final queryParams = <String, dynamic>{
      'limit': limit,
      'offset': offset,
    };

    if (category != null) queryParams['category'] = category;
    if (eventType != null) queryParams['eventType'] = eventType;
    if (startDate != null) queryParams['startDate'] = startDate.toIso8601String();
    if (endDate != null) queryParams['endDate'] = endDate.toIso8601String();

    return _client.get<List<Memory>>(
      '/memory',
      queryParams: queryParams,
      fromJson: (json) => (json as List).map((e) => Memory.fromJson(e)).toList(),
    );
  }

  /// Get single memory by ID
  Future<ApiResponse<Memory>> getMemory(String id) async {
    return _client.get<Memory>(
      '/memory/$id',
      fromJson: (json) => Memory.fromJson(json),
    );
  }

  /// Get memory stats by category
  Future<ApiResponse<Map<String, int>>> getCategoryStats() async {
    return _client.get<Map<String, int>>(
      '/memory/stats/categories',
      fromJson: (json) => Map<String, int>.from(json),
    );
  }

  /// Correct a memory (creates new version)
  Future<ApiResponse<Memory>> correctMemory(
    String id, {
    required String correctedText,
    String? category,
    Map<String, dynamic>? entities,
  }) async {
    return _client.post<Memory>(
      '/memory/$id/correct',
      body: {
        'corrected_text': correctedText,
        if (category != null) 'category': category,
        if (entities != null) 'entities': entities,
      },
      fromJson: (json) => Memory.fromJson(json),
    );
  }
}
