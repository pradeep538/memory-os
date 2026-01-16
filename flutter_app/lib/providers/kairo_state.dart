import 'package:flutter/foundation.dart';
import 'package:shared_preferences/shared_preferences.dart';
import '../services/websocket_service.dart';
import '../services/offline_queue_service.dart';
import '../models/kairo_models.dart';
import 'dart:async';

/// Kairo State Management
/// Manages RPG stats, chat messages, and WebSocket connection
class KairoState extends ChangeNotifier {
  // WebSocket service
  WebSocketService? _ws;
  StreamSubscription? _messageSubscription;

  // Offline queue
  OfflineQueueService? _offlineQueue;
  int _pendingCount = 0;
  int get pendingCount => _pendingCount;
  bool _isSyncing = false;
  bool get isSyncing => _isSyncing;

  // RPG Stats
  RpgStats _stats = RpgStats.initial();
  RpgStats get stats => _stats;

  // Chat Messages
  List<ChatMessage> _messages = [];
  List<ChatMessage> get messages => _messages;

  // Current clarification
  Clarification? _pendingClarification;
  Clarification? get pendingClarification => _pendingClarification;

  // Connection status
  bool _isConnected = false;
  bool get isConnected => _isConnected;

  // Typing indicator
  bool _isBotTyping = false;
  bool get isBotTyping => _isBotTyping;

  /// Connect to WebSocket
  void connectWebSocket(String userId) {
    _ws = WebSocketService(userId: userId);
    _ws!.connect();

    // Listen to messages
    _messageSubscription = _ws!.messageStream.listen((data) {
      handleServerMessage(data);
    });

    _isConnected = true;
    notifyListeners();

    // Request initial stats
    Future.delayed(Duration(milliseconds: 500), () {
      _ws!.requestStats();
    });
  }

  /// Handle incoming WebSocket message
  void handleServerMessage(Map<String, dynamic> data) {
    final type = data['type'];

    switch (type) {
      case 'connected':
        print('✅ Connected to Kairo');
        break;

      case 'stats_update':
        updateStats(data['data']);
        break;

      case 'bot_message':
        addBotMessage(data);
        break;

      case 'clarification':
        showClarification(data);
        break;

      case 'bot_typing':
        _isBotTyping = true;
        notifyListeners();
        break;

      case 'error':
        print('❌ Error: ${data['message']}');
        addBotMessage({
          'messageId': 'error_${DateTime.now().millisecondsSinceEpoch}',
          'text': '⚠️ ${data['message']}',
          'timestamp': DateTime.now().toIso8601String(),
        });
        break;
    }
  }

  /// Update RPG stats
  void updateStats(Map<String, dynamic> statsData) {
    _stats = RpgStats.fromJson(statsData);
    notifyListeners();

    print('📊 Stats updated: Level ${_stats.level}, Streak ${_stats.streak}');
  }

  /// Add bot message to chat
  void addBotMessage(Map<String, dynamic> data) {
    _isBotTyping = false;

    final message = ChatMessage.fromJson(data, isUser: false);
    _messages.add(message);
    notifyListeners();

    print('💬 Bot: ${message.text}');
  }

  /// Show clarification options
  void showClarification(Map<String, dynamic> data) {
    _isBotTyping = false;
    _pendingClarification = Clarification.fromJson(data);
    notifyListeners();

    print('❓ Clarification: ${_pendingClarification!.question}');
  }

  /// Send user message
  void sendMessage(String text) {
    if (text.trim().isEmpty) return;

    // Add user message to UI (optimistic)
    final userMessage = ChatMessage(
      id: 'user_${DateTime.now().millisecondsSinceEpoch}',
      text: text,
      timestamp: DateTime.now(),
      isUser: true,
    );

    _messages.add(userMessage);
    notifyListeners();

    // Clear pending clarification
    _pendingClarification = null;

    // Send to server
    _ws?.sendMessage(text);

    print('💬 You: $text');
  }

  /// Send voice message
  void sendVoice(String base64Audio) {
    _ws?.sendVoice(base64Audio);
  }

  /// Send clarification response
  void sendClarificationResponse(int optionId) {
    if (_pendingClarification == null) return;

    final option = _pendingClarification!.options.firstWhere(
      (o) => o.id == optionId,
    );

    // Add user's choice to chat
    final userMessage = ChatMessage(
      id: 'clarify_${DateTime.now().millisecondsSinceEpoch}',
      text: '${option.emoji ?? ''} ${option.label}',
      timestamp: DateTime.now(),
      isUser: true,
    );

    _messages.add(userMessage);

    // Send to server
    _ws?.sendClarificationResponse(_pendingClarification!.sessionId, optionId);

    _pendingClarification = null;
    notifyListeners();
  }

  /// Send undo command
  void undo() {
    _ws?.sendCommand('undo');
  }

  /// Clear chat history (local only)
  void clearChat() {
    _messages.clear();
    notifyListeners();
  }

  @override
  void dispose() {
    _messageSubscription?.cancel();
    _ws?.dispose();
    super.dispose();
  }
}
