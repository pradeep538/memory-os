import 'dart:async';
import 'dart:io';
import 'package:flutter/foundation.dart';
import 'package:record/record.dart';
import 'package:path_provider/path_provider.dart';
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

/// Source of the input
enum InputSource { text, voice }

/// Provider for voice/text input handling
class InputProvider extends ChangeNotifier {
  final InputService _inputService;
  final AudioRecorder _audioRecorder = AudioRecorder();

  InputProvider(this._inputService);

  InputState _state = InputState.idle;
  InputState get state => _state;

  InputSource? _activeSource;
  InputSource? get activeSource => _activeSource;

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

  String? _lastFeedbackMessage;
  String? get lastFeedbackMessage => _lastFeedbackMessage;

  String? _error;
  String? get error => _error;

  // Recording state
  int _recordingDuration = 0;
  int get recordingDuration => _recordingDuration;
  String? _currentRecordingPath;

  int _maxRecordingDuration = Config.defaultRecordingDuration;
  int get maxRecordingDuration => _maxRecordingDuration;

  // Amplitude stream for visualization
  final _amplitudeController = StreamController<double>.broadcast();
  Stream<double> get amplitudeStream => _amplitudeController.stream;
  Timer? _amplitudeTimer;

  // Retry state
  int _retryCount = 0;
  static const int _maxRetries = 1;

  @override
  void dispose() {
    _audioRecorder.dispose();
    _amplitudeController.close();
    _amplitudeTimer?.cancel();
    super.dispose();
  }

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
    _retryCount = 0;
    _lastFeedbackMessage = null;
    _updateState(InputState.idle);
    _activeSource = null; // Reset source
    notifyListeners();
  }

  // --- Recording Management ---

  /// Start recording session
  Future<bool> startRecording() async {
    try {
      if (!await _audioRecorder.hasPermission()) {
        _handleError('Microphone permission denied');
        return false;
      }

      final tempDir = await getTemporaryDirectory();
      _currentRecordingPath =
          '${tempDir.path}/voice_input_${DateTime.now().millisecondsSinceEpoch}.m4a';

      await _audioRecorder.start(
        const RecordConfig(
          encoder: AudioEncoder.aacLc,
          bitRate: 128000,
          sampleRate: 44100,
        ),
        path: _currentRecordingPath!,
      );

      _activeSource = InputSource.voice;
      _updateState(InputState.recording);
      _recordingDuration = 0;
      _error = null;
      notifyListeners();

      _startAmplitudeMonitoring();
      return true;
    } catch (e) {
      _handleError('Failed to start recording: $e');
      return false;
    }
  }

  /// Stop recording and return file path
  Future<File?> stopRecording() async {
    _stopAmplitudeMonitoring();

    if (_state != InputState.recording) return null;

    try {
      final path = await _audioRecorder.stop();
      _updateState(InputState.transcribing);
      notifyListeners();

      if (path != null) {
        return File(path);
      }
      return null;
    } catch (e) {
      _handleError('Failed to stop recording: $e');
      return null;
    }
  }

  /// Cancel recording and cleanup
  Future<void> cancelRecording() async {
    _stopAmplitudeMonitoring();
    await _audioRecorder.stop();

    if (_currentRecordingPath != null) {
      try {
        await File(_currentRecordingPath!).delete();
      } catch (_) {}
    }

    _updateState(InputState.idle);
    _activeSource = null;
    _recordingDuration = 0;
    notifyListeners();
  }

  void _startAmplitudeMonitoring() {
    _amplitudeTimer?.cancel();
    _amplitudeTimer = Timer.periodic(const Duration(milliseconds: 50), (
      timer,
    ) async {
      if (_state == InputState.recording) {
        final amplitude = await _audioRecorder.getAmplitude();
        _amplitudeController.add(amplitude.current);
      }
    });
  }

  void _stopAmplitudeMonitoring() {
    _amplitudeTimer?.cancel();
    _amplitudeTimer = null;
  }

  // --- State Management Helpers ---

  void _updateState(InputState newState) {
    debugPrint('InputProvider State: $_state -> $newState');
    _state = newState;
  }

  void _handleSuccess() {
    _updateState(InputState.success);
    notifyListeners();

    debugPrint('InputProvider: handled success, scheduling reset...');
    // Auto-reset after 3 seconds
    Future.delayed(const Duration(seconds: 3), () {
      if (_state == InputState.success) {
        debugPrint('InputProvider: resetting to idle from success');
        _updateState(InputState.idle);
        _activeSource = null;
        notifyListeners();
      }
    });
  }

  void _handleError(String message) {
    debugPrint('InputProvider Error: $message');
    _updateState(InputState.error);
    _error = message;
    notifyListeners();

    // Auto-reset error after 3 seconds
    Future.delayed(const Duration(seconds: 3), () {
      if (_state == InputState.error) {
        debugPrint('InputProvider: resetting to idle from error');
        _updateState(InputState.idle);
        _activeSource = null;
        _error = null;
        notifyListeners();
      }
    });
  }

  // --- Processing ---

  /// Process text input
  Future<bool> processText(String text) async {
    debugPrint('ProcessText called: $text');
    if (text.trim().isEmpty) return false;

    _updateState(InputState.enhancing);
    _activeSource = InputSource.text;
    _inputText = text;
    _error = null;
    notifyListeners();

    try {
      final response = await _inputService.processText(text);
      debugPrint(
        'ProcessText response: success=${response.success}, data=${response.data}',
      );

      if (!response.success || response.data == null) {
        debugPrint('ProcessText failed: error=${response.error}');
        if (_retryCount < _maxRetries) {
          _retryCount++;
          debugPrint('Retrying... $_retryCount');
          await Future.delayed(const Duration(seconds: 1));
          return processText(text);
        }

        _retryCount = 0;
        _handleError(response.error ?? 'Failed to process input');
        return false;
      }

      _retryCount = 0;
      final result = response.data!;

      if (result.needsConfirmation) {
        _updateState(InputState.confirming);
        _pendingResult = result;
        notifyListeners();
        return true;
      } else {
        _lastMemory = result.memory;
        _lastFeedbackMessage = result.shortResponse ?? result.enhancedText;
        _pendingResult = null;
        _handleSuccess();
        return true;
      }
    } catch (e) {
      debugPrint('ProcessText Exception: $e');
      if (_retryCount < _maxRetries) {
        _retryCount++;
        debugPrint('Retrying exception... $_retryCount');
        await Future.delayed(const Duration(seconds: 1));
        return processText(text);
      }
      _retryCount = 0;
      _handleError(e.toString());
      return false;
    }
  }

  /// Process audio file (Async)
  Future<bool> processAudio(File audioFile) async {
    debugPrint('ProcessAudio called');
    if (_activeSource == null) _activeSource = InputSource.voice;

    _updateState(InputState.transcribing); // Or InputState.uploading if added
    _error = null;
    notifyListeners();

    try {
      final response = await _inputService.processAudio(audioFile);

      if (!response.success || response.data == null) {
        if (_retryCount < _maxRetries) {
          _retryCount++;
          await Future.delayed(const Duration(seconds: 1));
          return processAudio(audioFile);
        }

        _retryCount = 0;
        _handleError(response.error ?? 'Failed to upload audio');
        return false;
      }

      _retryCount = 0;
      final result = response.data!;
      _voiceQuota = result.quota;

      // Async success: We don't have the memory/text yet
      // Just notify user it was uploaded
      debugPrint('Audio uploaded successfully: ${result.memoryId}');
      _lastFeedbackMessage = result.message;
      _audioResult = null; // No audio result immediately available

      _handleSuccess();
      notifyListeners();
      return true;
    } catch (e) {
      if (_retryCount < _maxRetries) {
        _retryCount++;
        await Future.delayed(const Duration(seconds: 1));
        return processAudio(audioFile);
      }
      _retryCount = 0;
      _handleError(e.toString());
      return false;
    }
  }

  /// Confirm pending input
  Future<bool> confirmInput({
    String? editedText,
    String? category,
    Map<String, dynamic>? entities,
  }) async {
    if (_pendingResult == null) return false;

    _updateState(InputState.processing);
    notifyListeners();

    try {
      final response = await _inputService.confirmInput(
        enhancedText: editedText ?? _pendingResult!.enhancedText,
        category: category ?? _pendingResult!.detectedCategory,
        entities: entities ?? _pendingResult!.detectedEntities,
      );

      if (!response.success || response.data == null) {
        if (_retryCount < _maxRetries) {
          _retryCount++;
          await Future.delayed(const Duration(seconds: 1));
          return confirmInput(
            editedText: editedText,
            category: category,
            entities: entities,
          );
        }
        _retryCount = 0;
        _handleError(response.error ?? 'Failed to confirm input');
        return false;
      }

      _retryCount = 0;
      _lastMemory = response.data!.memory;
      _lastFeedbackMessage =
          response.data!.message ?? _pendingResult?.shortResponse;
      _pendingResult = null;
      _handleSuccess();
      return true;
    } catch (e) {
      if (_retryCount < _maxRetries) {
        _retryCount++;
        await Future.delayed(const Duration(seconds: 1));
        return confirmInput(
          editedText: editedText,
          category: category,
          entities: entities,
        );
      }
      _retryCount = 0;
      _handleError(e.toString());
      return false;
    }
  }

  /// Cancel confirmation
  void cancelConfirmation() {
    _updateState(InputState.idle);
    _inputText = _pendingResult?.enhancedText ?? _inputText;
    _pendingResult = null;
    notifyListeners();
  }

  /// Undo last memory creation
  void undoLastMemory() {
    _lastMemory = null;
    _lastFeedbackMessage = null;
    _updateState(InputState.idle);
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
