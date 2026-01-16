import 'dart:async';
import 'dart:convert';
import 'package:shared_preferences/shared_preferences.dart';

/// Offline Queue Service
/// Queues messages when offline and syncs when connection restored
class OfflineQueueService {
  static const String _queueKey = 'offline_message_queue';

  final Function(Map<String, dynamic>) onSync;
  final SharedPreferences _prefs;

  List<Map<String, dynamic>> _queue = [];
  bool _isSyncing = false;

  OfflineQueueService({
    required this.onSync,
    required SharedPreferences prefs,
  }) : _prefs = prefs {
    _loadQueue();
  }

  /// Load queue from local storage
  Future<void> _loadQueue() async {
    try {
      final queueJson = _prefs.getString(_queueKey);
      if (queueJson != null) {
        final List<dynamic> decoded = jsonDecode(queueJson);
        _queue = decoded.map((e) => Map<String, dynamic>.from(e)).toList();
        print('📥 Loaded ${_queue.length} queued messages');
      }
    } catch (e) {
      print('❌ Failed to load queue: $e');
      _queue = [];
    }
  }

  /// Save queue to local storage
  Future<void> _saveQueue() async {
    try {
      final queueJson = jsonEncode(_queue);
      await _prefs.setString(_queueKey, queueJson);
    } catch (e) {
      print('❌ Failed to save queue: $e');
    }
  }

  /// Add message to queue
  Future<void> enqueue(Map<String, dynamic> message) async {
    message['queuedAt'] = DateTime.now().toIso8601String();
    message['synced'] = false;

    _queue.add(message);
    await _saveQueue();

    print('📤 Queued message (${_queue.length} total)');
  }

  /// Sync all pending messages
  Future<void> syncAll() async {
    if (_isSyncing || _queue.isEmpty) return;

    _isSyncing = true;
    print('🔄 Syncing ${_queue.length} messages...');

    final List<Map<String, dynamic>> failedMessages = [];

    for (final message in _queue) {
      if (message['synced'] == true) continue;

      try {
        // Call sync callback
        await onSync(message);

        // Mark as synced
        message['synced'] = true;
        message['syncedAt'] = DateTime.now().toIso8601String();

        print('✅ Synced: ${message['text']}');

        // Small delay between syncs
        await Future.delayed(Duration(milliseconds: 200));
      } catch (e) {
        print('❌ Sync failed: ${message['text']} - $e');
        failedMessages.add(message);
      }
    }

    // Remove successfully synced messages
    _queue.removeWhere((msg) => msg['synced'] == true);
    await _saveQueue();

    _isSyncing = false;

    if (_queue.isEmpty) {
      print('✅ All messages synced');
    } else {
      print('⚠️ ${_queue.length} messages remain queued');
    }
  }

  /// Get pending message count
  int getPendingCount() {
    return _queue.where((msg) => msg['synced'] != true).length;
  }

  /// Clear all queued messages
  Future<void> clear() async {
    _queue.clear();
    await _saveQueue();
    print('🗑️ Queue cleared');
  }
}
