import 'dart:async';
import 'dart:convert';
import 'dart:io';
import 'package:flutter/foundation.dart'; // For debugPrint
import 'package:http/http.dart' as http;
import 'package:firebase_auth/firebase_auth.dart';
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

/// HTTP API Client for Kairo Backend
/// Automatically includes Firebase Auth token in requests
class ApiClient {
  final String baseUrl;
  final http.Client _client;

  ApiClient({String? baseUrl, http.Client? client})
    : baseUrl = baseUrl ?? Config.apiBaseUrl,
      _client = client ?? http.Client();

  /// Get headers with auth token
  Future<Map<String, String>> _getHeaders() async {
    final headers = {
      'Content-Type': 'application/json',
      'Accept': 'application/json',
    };

    // Get Firebase token from authenticated user
    final user = FirebaseAuth.instance.currentUser;
    if (user != null) {
      try {
        final token = await user.getIdToken();
        if (token != null) {
          headers['Authorization'] = 'Bearer $token';
        }
      } catch (e) {
        debugPrint('Failed to get auth token: $e');
        // Continue without auth - backend will use demo user in dev
      }
    }

    return headers;
  }

  Uri _buildUri(String path, [Map<String, dynamic>? queryParams]) {
    final uri = Uri.parse('$baseUrl$path');
    if (queryParams != null && queryParams.isNotEmpty) {
      return uri.replace(
        queryParameters: queryParams.map((k, v) => MapEntry(k, v.toString())),
      );
    }
    return uri;
  }

  void _logRequest(String method, Uri uri, [Object? body]) {
    debugPrint(
      '🌐 [API] $method $uri (Timeout: ${Config.apiTimeout.inSeconds}s)',
    );
    if (body != null) {
      debugPrint('   Body: $body');
    }
  }

  void _logResponse(String method, Uri uri, http.Response response) {
    final status = response.statusCode;
    final emoji = (status >= 200 && status < 300) ? '✅' : '❌';
    debugPrint('$emoji [API] $status $method $uri');
    // Always print body for debugging
    if (response.body.isNotEmpty) {
      debugPrint('   Body: ${response.body}');
    }
  }

  void _logError(String method, Uri uri, dynamic error) {
    debugPrint('🚨 [API] Error $method $uri: $error');
  }

  Future<ApiResponse<T>> get<T>(
    String path, {
    Map<String, dynamic>? queryParams,
    T Function(dynamic)? fromJson,
  }) async {
    final uri = _buildUri(path, queryParams);
    _logRequest('GET', uri);

    try {
      final headers = await _getHeaders();
      final response = await _client
          .get(uri, headers: headers)
          .timeout(Config.apiTimeout);

      _logResponse('GET', uri, response);
      return _handleResponse(response, fromJson);
    } catch (e) {
      _logError('GET', uri, e);
      return ApiResponse.error(_getErrorMessage(e));
    }
  }

  Future<ApiResponse<T>> post<T>(
    String path, {
    Map<String, dynamic>? body,
    T Function(dynamic)? fromJson,
  }) async {
    final uri = _buildUri(path);
    _logRequest('POST', uri, body);

    try {
      final headers = await _getHeaders();
      final response = await _client
          .post(
            uri,
            headers: headers,
            body: body != null ? jsonEncode(body) : null,
          )
          .timeout(Config.apiTimeout);

      _logResponse('POST', uri, response);
      return _handleResponse(response, fromJson);
    } catch (e) {
      _logError('POST', uri, e);
      return ApiResponse.error(_getErrorMessage(e));
    }
  }

  Future<ApiResponse<T>> patch<T>(
    String path, {
    Map<String, dynamic>? body,
    T Function(dynamic)? fromJson,
  }) async {
    final uri = _buildUri(path);
    _logRequest('PATCH', uri, body);

    try {
      final headers = await _getHeaders();
      final response = await _client
          .patch(
            uri,
            headers: headers,
            body: body != null ? jsonEncode(body) : null,
          )
          .timeout(Config.apiTimeout);

      _logResponse('PATCH', uri, response);
      return _handleResponse(response, fromJson);
    } catch (e) {
      _logError('PATCH', uri, e);
      return ApiResponse.error(_getErrorMessage(e));
    }
  }

  Future<ApiResponse<T>> delete<T>(
    String path, {
    T Function(dynamic)? fromJson,
  }) async {
    final uri = _buildUri(path);
    _logRequest('DELETE', uri);

    try {
      final headers = await _getHeaders();
      final response = await _client
          .delete(uri, headers: headers)
          .timeout(Config.apiTimeout);

      _logResponse('DELETE', uri, response);
      return _handleResponse(response, fromJson);
    } catch (e) {
      _logError('DELETE', uri, e);
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
    final uri = _buildUri(path);
    _logRequest('POST(Multipart)', uri, fields);

    try {
      final request = http.MultipartRequest('POST', uri);

      // Add auth header to multipart request
      final user = FirebaseAuth.instance.currentUser;
      if (user != null) {
        try {
          final token = await user.getIdToken();
          if (token != null) {
            request.headers['Authorization'] = 'Bearer $token';
          }
        } catch (e) {
          // Continue without auth
        }
      }

      request.files.add(
        await http.MultipartFile.fromPath(fileField, file.path),
      );
      if (fields != null) {
        request.fields.addAll(fields);
      }

      final streamedResponse = await request.send().timeout(Config.apiTimeout);
      final response = await http.Response.fromStream(streamedResponse);

      _logResponse('POST(Multipart)', uri, response);
      return _handleResponse(response, fromJson);
    } catch (e) {
      _logError('POST(Multipart)', uri, e);
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
        // Handle auth errors specifically
        if (response.statusCode == 401) {
          final code = json['code'];
          if (code == 'TOKEN_EXPIRED') {
            return ApiResponse(
              success: false,
              error: 'Session expired. Please sign in again.',
            );
          }
          return ApiResponse(
            success: false,
            error: json['error'] ?? 'Authentication required',
          );
        }
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
    } else if (error is TimeoutException) {
      // Explicitly handle timeout
      return 'Network error: Connection timed out';
    } else {
      return error.toString();
    }
  }

  void dispose() {
    _client.close();
  }
}
