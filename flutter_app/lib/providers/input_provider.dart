import 'dart:io';
import 'package:flutter/foundation.dart';
import '../models/models.dart';
import '../services/services.dart';
import '../config/config.dart';

/// Input state enum matching architecture doc
enum InputState {
  idle,
  recording,
  transcribing,
  enhancing,
  confirming,
  processing,
  success,
  error,
}

/// Provider for voice/text input handling
class InputProvider extends ChangeNotifier {
  final InputService _inputService;

  InputProvider(this._inputService);

  InputState _state = InputState.idle;
  InputState get state => _state;

  String _inputText = '';
  String get inputText => _inputText;

  InputResult? _pendingResult;
  InputResult? get pendingResult => _pendingResult;

  AudioInputResult? _audioResult;
  AudioInputResult? get audioResult => _audioResult;

  VoiceQuota? _voiceQuota;
  VoiceQuota? get voiceQuota => _voiceQuota;

  Memory? _lastMemory;
  Memory? get lastMemory => _lastMemory;

  String? _error;
  String? get error => _error;

  // Recording state
  int _recordingDuration = 0;
  int get recordingDuration => _recordingDuration;

  int _maxRecordingDuration = Config.defaultRecordingDuration;
  int get maxRecordingDuration => _maxRecordingDuration;

  void setMaxRecordingDuration(int seconds) {
    _maxRecordingDuration = seconds;
    notifyListeners();
  }

  void updateRecordingDuration(int seconds) {
    _recordingDuration = seconds;
    notifyListeners();
  }

  void setInputText(String text) {
    _inputText = text;
    notifyListeners();
  }

  void clearInput() {
    _inputText = '';
    _pendingResult = null;
    _audioResult = null;
    _error = null;
    _state = InputState.idle;
    notifyListeners();
  }

  /// Start recording state
  void startRecording() {
    _state = InputState.recording;
    _recordingDuration = 0;
    _error = null;
    notifyListeners();
  }

  /// Stop recording state
  void stopRecording() {
    if (_state == InputState.recording) {
      _state = InputState.transcribing;
      notifyListeners();
    }
  }

  /// Cancel recording
  void cancelRecording() {
    _state = InputState.idle;
    _recordingDuration = 0;
    notifyListeners();
  }

  /// Process text input
  Future<bool> processText(String text) async {
    if (text.trim().isEmpty) return false;

    _state = InputState.enhancing;
    _inputText = text;
    _error = null;
    notifyListeners();

    final response = await _inputService.processText(text);

    if (!response.success || response.data == null) {
      _state = InputState.error;
      _error = response.error ?? 'Failed to process input';
      notifyListeners();
      return false;
    }

    final result = response.data!;

    if (result.needsConfirmation) {
      // Low confidence - show confirmation overlay
      _state = InputState.confirming;
      _pendingResult = result;
      notifyListeners();
      return true;
    } else {
      // High confidence - auto-processed
      _state = InputState.success;
      _lastMemory = result.memory;
      _pendingResult = null;
      notifyListeners();

      // Auto-clear after delay
      Future.delayed(Config.successToastDuration, () {
        if (_state == InputState.success) {
          clearInput();
        }
      });
      return true;
    }
  }

  /// Process audio file
  Future<bool> processAudio(File audioFile) async {
    _state = InputState.transcribing;
    _error = null;
    notifyListeners();

    final response = await _inputService.processAudio(audioFile);

    if (!response.success || response.data == null) {
      _state = InputState.error;
      _error = response.error ?? 'Failed to process audio';
      notifyListeners();
      return false;
    }

    final result = response.data!;
    _audioResult = result;
    _voiceQuota = result.quota;

    if (result.needsConfirmation) {
      // Low confidence - show confirmation
      _state = InputState.confirming;
      _pendingResult = InputResult(
        needsConfirmation: true,
        rawInput: result.transcription,
        enhancedText: result.enhancedText,
        detectedCategory: result.detectedCategory,
        detectedEntities: result.detectedEntities,
        confidenceScore: result.confidenceScore,
      );
      notifyListeners();
      return true;
    } else {
      // High confidence - auto-processed
      _state = InputState.success;
      _lastMemory = result.memory;
      notifyListeners();

      Future.delayed(Config.successToastDuration, () {
        if (_state == InputState.success) {
          clearInput();
        }
      });
      return true;
    }
  }

  /// Confirm pending input
  Future<bool> confirmInput({
    String? editedText,
    String? category,
    Map<String, dynamic>? entities,
  }) async {
    if (_pendingResult == null) return false;

    _state = InputState.processing;
    notifyListeners();

    final response = await _inputService.confirmInput(
      enhancedText: editedText ?? _pendingResult!.enhancedText,
      category: category ?? _pendingResult!.detectedCategory,
      entities: entities ?? _pendingResult!.detectedEntities,
    );

    if (!response.success || response.data == null) {
      _state = InputState.error;
      _error = response.error ?? 'Failed to confirm input';
      notifyListeners();
      return false;
    }

    _state = InputState.success;
    _lastMemory = response.data!.memory;
    _pendingResult = null;
    notifyListeners();

    Future.delayed(Config.successToastDuration, () {
      if (_state == InputState.success) {
        clearInput();
      }
    });
    return true;
  }

  /// Cancel confirmation and return to editing
  void cancelConfirmation() {
    _state = InputState.idle;
    _inputText = _pendingResult?.enhancedText ?? _inputText;
    _pendingResult = null;
    notifyListeners();
  }

  /// Undo last memory creation
  void undoLastMemory() {
    _lastMemory = null;
    _state = InputState.idle;
    notifyListeners();
  }

  /// Fetch voice quota
  Future<void> fetchVoiceQuota() async {
    final response = await _inputService.getVoiceQuota();
    if (response.success && response.data != null) {
      _voiceQuota = response.data;
      notifyListeners();
    }
  }
}
