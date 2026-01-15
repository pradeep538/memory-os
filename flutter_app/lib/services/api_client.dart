import 'dart:convert';
import 'dart:io';
import 'package:http/http.dart' as http;
import '../config/config.dart';

/// API Response wrapper
class ApiResponse<T> {
  final bool success;
  final T? data;
  final String? message;
  final int? count;
  final String? error;

  ApiResponse({
    required this.success,
    this.data,
    this.message,
    this.count,
    this.error,
  });

  factory ApiResponse.fromJson(
    Map<String, dynamic> json,
    T Function(dynamic)? fromJson,
  ) {
    return ApiResponse(
      success: json['success'] ?? false,
      data: json['data'] != null && fromJson != null
          ? fromJson(json['data'])
          : json['data'],
      message: json['message'],
      count: json['count'],
      error: json['error'],
    );
  }

  factory ApiResponse.error(String message) {
    return ApiResponse(success: false, error: message);
  }
}

/// HTTP API Client for Memory OS Backend
class ApiClient {
  final String baseUrl;
  final http.Client _client;

  ApiClient({
    String? baseUrl,
    http.Client? client,
  })  : baseUrl = baseUrl ?? Config.apiBaseUrl,
        _client = client ?? http.Client();

  Map<String, String> get _headers => {
        'Content-Type': 'application/json',
        'Accept': 'application/json',
      };

  Uri _buildUri(String path, [Map<String, dynamic>? queryParams]) {
    final uri = Uri.parse('$baseUrl$path');
    if (queryParams != null && queryParams.isNotEmpty) {
      return uri.replace(
        queryParameters: queryParams.map((k, v) => MapEntry(k, v.toString())),
      );
    }
    return uri;
  }

  Future<ApiResponse<T>> get<T>(
    String path, {
    Map<String, dynamic>? queryParams,
    T Function(dynamic)? fromJson,
  }) async {
    try {
      final uri = _buildUri(path, queryParams);
      final response = await _client
          .get(uri, headers: _headers)
          .timeout(Config.apiTimeout);

      return _handleResponse(response, fromJson);
    } catch (e) {
      return ApiResponse.error(_getErrorMessage(e));
    }
  }

  Future<ApiResponse<T>> post<T>(
    String path, {
    Map<String, dynamic>? body,
    T Function(dynamic)? fromJson,
  }) async {
    try {
      final uri = _buildUri(path);
      final response = await _client
          .post(
            uri,
            headers: _headers,
            body: body != null ? jsonEncode(body) : null,
          )
          .timeout(Config.apiTimeout);

      return _handleResponse(response, fromJson);
    } catch (e) {
      return ApiResponse.error(_getErrorMessage(e));
    }
  }

  Future<ApiResponse<T>> patch<T>(
    String path, {
    Map<String, dynamic>? body,
    T Function(dynamic)? fromJson,
  }) async {
    try {
      final uri = _buildUri(path);
      final response = await _client
          .patch(
            uri,
            headers: _headers,
            body: body != null ? jsonEncode(body) : null,
          )
          .timeout(Config.apiTimeout);

      return _handleResponse(response, fromJson);
    } catch (e) {
      return ApiResponse.error(_getErrorMessage(e));
    }
  }

  Future<ApiResponse<T>> delete<T>(
    String path, {
    T Function(dynamic)? fromJson,
  }) async {
    try {
      final uri = _buildUri(path);
      final response = await _client
          .delete(uri, headers: _headers)
          .timeout(Config.apiTimeout);

      return _handleResponse(response, fromJson);
    } catch (e) {
      return ApiResponse.error(_getErrorMessage(e));
    }
  }

  Future<ApiResponse<T>> postMultipart<T>(
    String path, {
    required File file,
    required String fileField,
    Map<String, String>? fields,
    T Function(dynamic)? fromJson,
  }) async {
    try {
      final uri = _buildUri(path);
      final request = http.MultipartRequest('POST', uri);

      request.files.add(await http.MultipartFile.fromPath(fileField, file.path));
      if (fields != null) {
        request.fields.addAll(fields);
      }

      final streamedResponse = await request.send().timeout(Config.apiTimeout);
      final response = await http.Response.fromStream(streamedResponse);

      return _handleResponse(response, fromJson);
    } catch (e) {
      return ApiResponse.error(_getErrorMessage(e));
    }
  }

  ApiResponse<T> _handleResponse<T>(
    http.Response response,
    T Function(dynamic)? fromJson,
  ) {
    try {
      final json = jsonDecode(response.body) as Map<String, dynamic>;

      if (response.statusCode >= 200 && response.statusCode < 300) {
        return ApiResponse.fromJson(json, fromJson);
      } else {
        return ApiResponse(
          success: false,
          error: json['error'] ?? json['message'] ?? 'Request failed',
        );
      }
    } catch (e) {
      return ApiResponse.error('Failed to parse response: $e');
    }
  }

  String _getErrorMessage(dynamic error) {
    if (error is SocketException) {
      return 'Network error: Unable to connect to server';
    } else if (error is http.ClientException) {
      return 'Network error: ${error.message}';
    } else if (error is FormatException) {
      return 'Invalid response format';
    } else {
      return error.toString();
    }
  }

  void dispose() {
    _client.close();
  }
}
