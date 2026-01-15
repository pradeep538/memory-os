import 'api_client.dart';
import '../models/query_models.dart';

/// Service for natural language queries
class QueryService {
  final ApiClient _client;

  QueryService(this._client);

  /// Ask a question about user's data
  Future<ApiResponse<QueryResult>> askQuestion(String question) async {
    return _client.post<QueryResult>(
      '/query',
      body: {'question': question},
      fromJson: (json) => QueryResult.fromJson(json),
    );
  }
}
