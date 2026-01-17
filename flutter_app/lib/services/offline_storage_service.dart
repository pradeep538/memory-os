import 'dart:convert';
import 'package:shared_preferences/shared_preferences.dart';

enum OfflineInputType { text, audio }

class OfflineInput {
  final String id;
  final OfflineInputType type;
  final String content; // Text content or Audio file path
  final int timestamp;
  final int retryCount;

  OfflineInput({
    required this.id,
    required this.type,
    required this.content,
    required this.timestamp,
    this.retryCount = 0,
  });

  Map<String, dynamic> toJson() => {
        'id': id,
        'type': type.toString(),
        'content': content,
        'timestamp': timestamp,
        'retryCount': retryCount,
      };

  factory OfflineInput.fromJson(Map<String, dynamic> json) {
    return OfflineInput(
      id: json['id'],
      type: json['type'] == 'OfflineInputType.audio'
          ? OfflineInputType.audio
          : OfflineInputType.text,
      content: json['content'],
      timestamp: json['timestamp'],
      retryCount: json['retryCount'] ?? 0,
    );
  }
}

class OfflineStorageService {
  static const String _storageKey = 'offline_pending_inputs';

  // Singleton pattern
  static final OfflineStorageService _instance =
      OfflineStorageService._internal();
  factory OfflineStorageService() => _instance;
  OfflineStorageService._internal();

  Future<void> saveInput(OfflineInput input) async {
    final prefs = await SharedPreferences.getInstance();
    List<String> inputs = prefs.getStringList(_storageKey) ?? [];

    // Add new input as JSON string
    inputs.add(jsonEncode(input.toJson()));

    await prefs.setStringList(_storageKey, inputs);
  }

  Future<List<OfflineInput>> getPendingInputs() async {
    final prefs = await SharedPreferences.getInstance();
    List<String> inputs = prefs.getStringList(_storageKey) ?? [];

    return inputs.map((str) => OfflineInput.fromJson(jsonDecode(str))).toList();
  }

  Future<void> removeInput(String id) async {
    final prefs = await SharedPreferences.getInstance();
    List<String> inputs = prefs.getStringList(_storageKey) ?? [];

    inputs.removeWhere((str) {
      final json = jsonDecode(str);
      return json['id'] == id;
    });

    await prefs.setStringList(_storageKey, inputs);
  }
}
