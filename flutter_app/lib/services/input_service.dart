import 'dart:io';
import 'api_client.dart';
import '../models/input_models.dart';

/// Service for handling voice/text input processing
class InputService {
  final ApiClient _client;

  InputService(this._client);

  /// Process text input
  /// Returns enhanced text with confidence score
  Future<ApiResponse<InputResult>> processText(String text) async {
    return _client.post<InputResult>(
      '/input/text',
      body: {'text': text},
      fromJson: (json) => InputResult.fromJson(json),
    );
  }

  /// Confirm low-confidence enhancement
  Future<ApiResponse<ConfirmResult>> confirmInput({
    required String enhancedText,
    required String category,
    required Map<String, dynamic> entities,
  }) async {
    return _client.post<ConfirmResult>(
      '/input/confirm',
      body: {
        'enhanced_text': enhancedText,
        'category': category,
        'entities': entities,
      },
      fromJson: (json) => ConfirmResult.fromJson(json),
    );
  }

  /// Process audio input (Async)
  Future<ApiResponse<AsyncUploadResult>> processAudio(File audioFile) async {
    return _client.postMultipart<AsyncUploadResult>(
      '/input/audio',
      file: audioFile,
      fileField: 'audio',
      fromJson: (json) => AsyncUploadResult.fromJson(json),
    );
  }

  /// Get voice quota status
  Future<ApiResponse<VoiceQuota>> getVoiceQuota() async {
    return _client.get<VoiceQuota>(
      '/input/audio/quota',
      fromJson: (json) => VoiceQuota.fromJson(json),
    );
  }
}
