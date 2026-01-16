import 'api_client.dart';
import '../models/entity_models.dart';

class EntityService {
  final ApiClient _client;

  EntityService(this._client);

  /// Get top entities by frequency
  Future<ApiResponse<List<Entity>>> getTopEntities({int limit = 10}) async {
    return _client.get<List<Entity>>(
      '/entities/top?limit=$limit',
      fromJson: (json) {
        final list = json as List;
        return list.map((e) => Entity.fromJson(e)).toList();
      },
    );
  }

  /// Search entities
  Future<ApiResponse<List<Entity>>> searchEntities(String query) async {
    return _client.get<List<Entity>>(
      '/entities/search?q=$query',
      fromJson: (json) {
        final list = json as List;
        return list.map((e) => Entity.fromJson(e)).toList();
      },
    );
  }

  /// Get entity details
  Future<ApiResponse<Entity>> getEntity(String id) async {
    return _client.get<Entity>(
      '/entities/$id',
      fromJson: (json) => Entity.fromJson(json),
    );
  }
}
