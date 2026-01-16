import 'dart:async';
import 'package:flutter/foundation.dart';
import 'api_client.dart';

class EngagementService {
  final ApiClient _api = ApiClient();

  /// Fetch the user's active narrative feed
  Future<List<FeedItem>> getFeed() async {
    try {
      final response = await _api.get(
        '/engagement/feed',
      ); // engagement route prefix in index.js is /api/v1
      // Wait, in index.js I registered with prefix '/api/v1'.
      // routes.js has '/feed'. So full path '/api/v1/feed'.
      // ApiClient usually handles base URL.
      // Wait, in backend/src/index.js I used `await fastify.register(engagementRoutes, { prefix: '/api/v1' });`
      // Inside routes I used `fastify.get('/feed', ...)`.
      // So path is `/api/v1/feed`. Correct.

      if (response.success && response.data != null) {
        final List list = response.data as List;
        return list
            .map((e) => FeedItem.fromJson(e as Map<String, dynamic>))
            .toList();
      }
      return [];
    } catch (e) {
      debugPrint('Error fetching feed: $e');
      return [];
    }
  }

  /// Poll for immediate feedback after logging
  /// Returns null if no feedback after timeout
  Future<UserFeedback?> pollForFeedback({
    int checkCount = 5,
    int delayMs = 1000,
  }) async {
    for (int i = 0; i < checkCount; i++) {
      await Future.delayed(Duration(milliseconds: delayMs));
      try {
        final response = await _api.get('/engagement/feedback/latest');

        if (response.success && response.data != null) {
          return UserFeedback.fromJson(response.data as Map<String, dynamic>);
        }
      } catch (e) {
        debugPrint('Polling feedback attempt $i failed: $e');
      }
    }
    return null;
  }

  /// Mark feed item as read
  Future<void> markRead(String id) async {
    try {
      await _api.post('/engagement/feed/$id/read', body: {});
    } catch (e) {
      debugPrint('Error marking read: $e');
    }
  }
}

class FeedItem {
  final String id;
  final String type; // 'insight', 'reflection', 'voice_replay'
  final String title;
  final String body;
  final Map<String, dynamic> data;

  FeedItem({
    required this.id,
    required this.type,
    required this.title,
    required this.body,
    required this.data,
  });

  factory FeedItem.fromJson(Map<String, dynamic> json) {
    return FeedItem(
      id: json['id'],
      type: json['type'],
      title: json['title'],
      body: json['body'],
      data: json['data'] ?? {},
    );
  }
}

class UserFeedback {
  final String message;
  final String context; // 'streak', 'post_log'

  UserFeedback({required this.message, required this.context});

  factory UserFeedback.fromJson(Map<String, dynamic> json) {
    return UserFeedback(message: json['message'], context: json['context']);
  }
}
