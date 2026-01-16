import 'api_client.dart';
import '../models/query_models.dart';

/// Service for natural language queries
class QueryService {
  final ApiClient _client;

  QueryService(this._client);

  /// Ask a question about user's data
  Future<ApiResponse<QueryResult>> ask(String question) async {
    return _client.post<QueryResult>(
      '/query',
      body: {'question': question},
      fromJson: (json) => QueryResult.fromJson(json),
    );
  }

  /// Ask a voice query with consistency data
  Future<QueryResult> askVoiceQuery(
    List<int> audioBytes,
    String mimeType,
  ) async {
    final response = await _client.post(
      '/query/voice',
      body: {'audio': String.fromCharCodes(audioBytes), 'mimeType': mimeType},
    );

    if (response.success) {
      return QueryResult.fromJson(response.data);
    } else {
      throw Exception(response.error ?? 'Failed to process voice query');
    }
  }

  /// Ask a text query with consistency data (for testing)
  Future<QueryResult> askTextQuery(String question) async {
    final response = await _client.post(
      '/query/text',
      body: {'question': question},
    );

    if (response.success) {
      return QueryResult.fromJson(response.data);
    } else {
      throw Exception(response.error ?? 'Failed to process text query');
    }
  }
}
