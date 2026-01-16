import 'package:web_socket_channel/web_socket_channel.dart';
import 'dart:convert';
import 'dart:async';

/// WebSocket Service for Kairo Chat
/// Handles real-time messaging with the backend
class WebSocketService {
  WebSocketChannel? _channel;
  final String userId;
  final String wsUrl;

  StreamController<Map<String, dynamic>> _messageController =
      StreamController<Map<String, dynamic>>.broadcast();

  Stream<Map<String, dynamic>> get messageStream => _messageController.stream;

  bool _isConnected = false;
  bool get isConnected => _isConnected;

  WebSocketService({
    required this.userId,
    this.wsUrl = 'ws://localhost:3001/chat',
  });

  /// Connect to WebSocket server
  void connect() {
    print('🚫 WebSocket disabled temporarily');
    return;
    try {
      _channel = WebSocketChannel.connect(Uri.parse(wsUrl));
      _isConnected = true;

      print('✅ WebSocket connected');

      // Listen to incoming messages
      _channel!.stream.listen(
        (message) {
          try {
            final data = jsonDecode(message);
            _messageController.add(data);
            print('📥 Received: ${data['type']}');
          } catch (e) {
            print('❌ Failed to parse message: $e');
          }
        },
        onError: (error) {
          print('❌ WebSocket error: $error');
          _isConnected = false;
          _reconnect();
        },
        onDone: () {
          print('🔌 WebSocket connection closed');
          _isConnected = false;
          _reconnect();
        },
      );
    } catch (e) {
      print('❌ Failed to connect: $e');
      _isConnected = false;
      _reconnect();
    }
  }

  /// Reconnect after delay
  void _reconnect() {
    Future.delayed(Duration(seconds: 3), () {
      if (!_isConnected) {
        print('🔄 Reconnecting...');
        connect();
      }
    });
  }

  /// Send text message
  void sendMessage(String text) {
    if (!_isConnected) {
      print('❌ Not connected');
      return;
    }

    final message = jsonEncode({
      'type': 'message',
      'text': text,
      'userId': userId,
      'messageId': _generateId(),
      'timestamp': DateTime.now().toIso8601String(),
    });

    _channel!.sink.add(message);
    print('📤 Sent: $text');
  }

  /// Send voice message
  void sendVoice(String base64Audio) {
    if (!_isConnected) {
      print('❌ Not connected');
      return;
    }

    final message = jsonEncode({
      'type': 'voice',
      'audio': base64Audio,
      'userId': userId,
      'messageId': _generateId(),
      'timestamp': DateTime.now().toIso8601String(),
    });

    _channel!.sink.add(message);
    print('📤 Sent voice message');
  }

  /// Send clarification response
  void sendClarificationResponse(String sessionId, int selectedOption) {
    if (!_isConnected) {
      print('❌ Not connected');
      return;
    }

    final message = jsonEncode({
      'type': 'clarification_response',
      'sessionId': sessionId,
      'selectedOption': selectedOption,
      'userId': userId,
    });

    _channel!.sink.add(message);
    print('📤 Sent clarification response: $selectedOption');
  }

  /// Request stats update
  void requestStats() {
    if (!_isConnected) {
      print('❌ Not connected');
      return;
    }

    final message = jsonEncode({'type': 'get_stats', 'userId': userId});

    _channel!.sink.add(message);
    print('📤 Requested stats');
  }

  /// Send command (undo, export, etc.)
  void sendCommand(String command, [Map<String, dynamic>? params]) {
    if (!_isConnected) {
      print('❌ Not connected');
      return;
    }

    final message = jsonEncode({
      'type': 'command',
      'command': command,
      'params': params ?? {},
      'userId': userId,
    });

    _channel!.sink.add(message);
    print('📤 Sent command: $command');
  }

  /// Generate unique ID
  String _generateId() {
    return 'msg_${DateTime.now().millisecondsSinceEpoch}_${_random()}';
  }

  String _random() {
    return (DateTime.now().microsecondsSinceEpoch % 100000).toString();
  }

  /// Close connection
  void dispose() {
    _channel?.sink.close();
    _messageController.close();
    _isConnected = false;
  }
}
