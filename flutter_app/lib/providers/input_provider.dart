import 'dart:async';
import 'dart:io';
import 'package:flutter/foundation.dart';
import 'package:record/record.dart';
import 'package:path_provider/path_provider.dart';
import '../models/models.dart';
import '../services/services.dart';
import '../services/offline_storage_service.dart';
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

  final MemoryService _memoryService;

  InputProvider(this._inputService, this._memoryService);

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

  // --- Offline & Retry Logic ---

  final OfflineStorageService _offlineStorage = OfflineStorageService();
  bool _isSyncing = false;

  /// Try to sync any offline inputs
  Future<void> syncPendingInputs() async {
    if (_isSyncing) return;
    _isSyncing = true;

    debugPrint('Syncing pending inputs...');
    try {
      final pending = await _offlineStorage.getPendingInputs();
      if (pending.isEmpty) {
        _isSyncing = false;
        return;
      }

      for (var input in pending) {
        bool success = false;
        if (input.type == OfflineInputType.text) {
          debugPrint('Syncing text: ${input.content}');
          // We use _inputService directly to avoid triggering UI state changes
          final response = await _inputService.processText(input.content);
          success = response.success;
        } else if (input.type == OfflineInputType.audio) {
          debugPrint('Syncing audio: ${input.content}');
          final file = File(input.content);
          if (await file.exists()) {
            final response = await _inputService.processAudio(file);
            success = response.success;
          } else {
            debugPrint('Audio file missing: ${input.content}');
            await _offlineStorage.removeInput(input.id); // Remove stale
            continue;
          }
        }

        if (success) {
          debugPrint('Sync successful: ${input.id}');
          await _offlineStorage.removeInput(input.id);
        } else {
          debugPrint('Sync failed for ${input.id}, keeping in queue');
        }
      }
    } catch (e) {
      debugPrint('Sync error: $e');
    } finally {
      _isSyncing = false;
    }
  }

  Future<void> _saveToOffline(String content, OfflineInputType type) async {
    final id = DateTime.now().millisecondsSinceEpoch.toString();
    await _offlineStorage.saveInput(OfflineInput(
      id: id,
      type: type,
      content: content,
      timestamp: DateTime.now().millisecondsSinceEpoch,
    ));
    // Notify user via error message but softer
    _handleError("Network issue. Saved to queue & will retry automatically.");

    // Try to sync in background after a delay
    Future.delayed(const Duration(seconds: 30), syncPendingInputs);
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

      if (!response.success || response.data == null) {
        debugPrint('ProcessText failed: error=${response.error}');

        // If 429 or other transient error, cache it
        // Or if simple retry failed.
        // We'll use the existing retry count first.
        if (_retryCount < _maxRetries) {
          _retryCount++;
          debugPrint('Retrying... $_retryCount');
          await Future.delayed(const Duration(seconds: 1));
          return processText(text);
        }

        _retryCount = 0;
        // FAIL -> Save Offline
        await _saveToOffline(text, OfflineInputType.text);
        return false;
      }

      _retryCount = 0;
      final result = response.data!;

      // ... Success handling ...
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

        // Trigger sync of other items if this one succeeded
        syncPendingInputs();
        return true;
      }
    } catch (e) {
      debugPrint('ProcessText Exception: $e');
      if (_retryCount < _maxRetries) {
        _retryCount++;
        await Future.delayed(const Duration(seconds: 1));
        return processText(text);
      }
      _retryCount = 0;
      // Exception -> Save Offline
      await _saveToOffline(text, OfflineInputType.text);
      return false;
    }
  }

  /// Process audio file (Async)
  Future<bool> processAudio(File audioFile) async {
    debugPrint('ProcessAudio called');
    if (_activeSource == null) _activeSource = InputSource.voice;

    _updateState(InputState.transcribing);
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
        // FAIL -> Save Offline
        // Note: For audio, we must ensure the file persists!
        // tempDir might be cleared. Ideally move to app doc dir.
        // For MVP we assume temp persists for session.
        // Better: Copy audioFile to app doc dir in _saveToOffline logic or here.
        await _saveToOffline(audioFile.path, OfflineInputType.audio);
        return false;
      }

      _retryCount = 0;
      final result = response.data!;
      debugPrint('Audio uploaded successfully: ${result.memoryId}');
      _lastFeedbackMessage = result.message;
      _audioResult = null;

      _handleSuccess();

      // Update quota immediately
      fetchVoiceQuota();

      // Trigger sync
      syncPendingInputs();

      notifyListeners();
      return true;
    } catch (e) {
      if (_retryCount < _maxRetries) {
        _retryCount++;
        await Future.delayed(const Duration(seconds: 1));
        return processAudio(audioFile);
      }
      _retryCount = 0;
      await _saveToOffline(audioFile.path, OfflineInputType.audio);
      return false;
    }
  }

  Future<bool> confirmInput({String? editedText, String? category}) async {
    if (_pendingResult == null) return false;

    // Use current pending result with overrides
    final resultToConfirm = _pendingResult!;
    final textToSubmit = editedText ?? resultToConfirm.enhancedText;
    final categoryToSubmit = category ?? resultToConfirm.detectedCategory;

    _updateState(InputState.processing);
    notifyListeners();

    try {
      final response = await _inputService.confirmInput(
        enhancedText: textToSubmit,
        category: categoryToSubmit,
        entities: resultToConfirm.detectedEntities,
      );

      if (response.success && response.data != null) {
        final result = response.data!;
        _lastMemory = result.memory;
        _lastFeedbackMessage = result.message ?? "Memory saved";
        _pendingResult = null;
        _handleSuccess();

        // Trigger sync of other items
        syncPendingInputs();
        return true;
      } else {
        _handleError(response.error ?? 'Failed to confirm input');
        return false;
      }
    } catch (e) {
      _handleError('Confirmation error: $e');
      return false;
    }
  }

  void updatePendingCategory(String category) {
    if (_pendingResult != null) {
      _pendingResult = _pendingResult!.copyWith(detectedCategory: category);
      notifyListeners();
    }
  }

  void cancelConfirmation() {
    _pendingResult = null;
    _updateState(InputState.idle);
    notifyListeners();
  }

  Future<void> undoLastMemory() async {
    if (_lastMemory == null) return;

    final id = _lastMemory!.id;
    _lastMemory = null; // optimistically clear
    _lastFeedbackMessage = "Undoing...";
    notifyListeners();

    try {
      final response = await _memoryService.deleteMemory(id);
      if (response.success) {
        _lastFeedbackMessage = "Memory deleted";
      } else {
        _handleError("Failed to undo memory: ${response.error}");
      }
      notifyListeners();
    } catch (e) {
      _handleError("Failed to undo memory");
    }
  }

  String? _voiceQuotaError;
  String? get voiceQuotaError => _voiceQuotaError;

  /// Fetch voice quota
  Future<void> fetchVoiceQuota() async {
    // Try to sync pending inputs on startup/refresh
    syncPendingInputs();

    _voiceQuotaError = null;
    notifyListeners();

    try {
      final response = await _inputService.getVoiceQuota();
      if (response.success && response.data != null) {
        _voiceQuota = response.data;
        _voiceQuotaError = null;
      } else {
        _voiceQuotaError = response.error ?? 'Failed to load quota';
      }
    } catch (e) {
      _voiceQuotaError = 'Connection error';
    }
    notifyListeners();
  }
}
