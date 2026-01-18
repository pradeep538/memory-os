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
  // Make WebSocketService optional for now to avoid breaking if not passed immediately,
  // but ideally required.
  WebSocketService? _webSocketService;

  InputProvider(this._inputService, this._memoryService,
      [this._webSocketService]);

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

  String? _statusMessage;
  String? get statusMessage => _statusMessage;

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

  // Local audio buffer for offline fallback
  final List<int> _audioBuffer = [];

  // Silence detection
  double _maxSeenAmplitude = -160.0;
  static const double _silenceThreshold = -55.0; // dBFS

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
    _statusMessage = null;
    _updateState(InputState.idle);
    _activeSource = null; // Reset source
    notifyListeners();
  }

  // Update WebSocketService (e.g. on auth change)
  void updateWebSocketService(WebSocketService ws) {
    _webSocketService = ws;
    // Listen to WS messages
    _webSocketService!.messageStream.listen(_handleWebSocketMessage);
  }

  void _handleWebSocketMessage(Map<String, dynamic> data) {
    debugPrint('🧬 WS INCOMING: $data'); // DIAGNOSTIC LOG

    if (data['type'] == 'result' && data['success'] == true) {
      debugPrint('✅ WS Success condition met');
      final resultData = data['data'];
      // Map to InputResult
      final result = InputResult(
        needsConfirmation: resultData['needs_confirmation'] ?? false,
        rawInput: resultData['transcription'] ?? '',
        enhancedText: resultData['enhanced_text'] ?? '',
        detectedCategory: resultData['category'] ?? 'generic',
        detectedEntities: {}, // TODO: parse if sent
        confidenceScore: (resultData['confidence'] ?? 0.0).toDouble(),
        shortResponse:
            resultData['confirmation'] ?? resultData['confirmation_message'],
        isQuery: resultData['is_query'] ?? false,
        answer: resultData['answer'],
        memory: resultData['memory'] != null
            ? Memory.fromJson(resultData['memory'])
            : null,
      );

      if (result.needsConfirmation) {
        _updateState(InputState.confirming);
        _pendingResult = result;
      } else {
        _lastMemory = result.memory;
        _lastFeedbackMessage = result.answer ?? result.shortResponse ?? "Saved";
        _pendingResult = null;
        _handleSuccess();
        syncPendingInputs();
      }
      notifyListeners();
    } else if (data['type'] == 'answer') {
      debugPrint('✅ WS Answer received: ${data['answer']}');
      _lastFeedbackMessage = data['answer'];
      _lastMemory = null;
      _handleSuccess();
      notifyListeners();
    } else if (data['type'] == 'error') {
      _statusMessage = null;
      _handleError(data['message'] ?? 'Processing failed');
    } else if (data['type'] == 'status') {
      debugPrint('📥 Received status: ${data['status']}');
      _statusMessage = _mapStatusToMessage(data['status']);
      // If we get status, we are definitely NOT timing out yet
      _resiliencyTimer?.cancel();
      _startResiliencyTimer(); // Reset timer
      notifyListeners();
    }
  }

  String _mapStatusToMessage(String status) {
    switch (status) {
      case 'processing':
        return 'Processing...';
      case 'uploading':
        return 'Uploading...';
      case 'analyzing':
        return 'Analyzing...';
      case 'saving':
        return 'Saving...';
      default:
        return 'Working...';
    }
  }

  // ... existing members ...

  // --- Permission Management ---

  /// Check if microphone permission is already granted
  Future<bool> hasPermission() async {
    return await _audioRecorder.hasPermission();
  }

  /// Explicitly request microphone permission
  Future<bool> requestPermission() async {
    final granted = await _audioRecorder.hasPermission();
    if (!granted) {
      notifyListeners(); // Ensure UI can react if needed
    }
    return granted;
  }

  // --- Recording Management ---

  /// Start recording session (Realtime or File)
  Future<bool> startRecording() async {
    try {
      if (!await _audioRecorder.hasPermission()) {
        _handleError(
            'Microphone permission required. Please hold to record again after allowing.');
        return false;
      }

      // Check if WebSocket is available and connected for Realtime
      if (_webSocketService != null) {
        // && _webSocketService!.isConnected) {
        // Force connect if needed?
        if (!_webSocketService!.isConnected) _webSocketService!.connect();

        // Return stream
        final stream = await _audioRecorder.startStream(
          const RecordConfig(
            encoder: AudioEncoder
                .pcm16bits, // Stream supported! Backend will wrap in WAV header.
            // Gemini supports: WAV, MP3, AAC, FLAC, OGG, OPUS, WEBM.
            // Raw PCM via WS might need header?
            // Or use AAC LC stream?
            // flutter_sound/record stream is usually Uint8List.
            // Let's use pcm16bits (raw) for simplicity if Gemini accepts raw with header or if we wrap it.
            // Actually implementation plan used 'enhanceFromAudio' which expects simple buffer.
            // Sending raw PCM chunks might require wav header reconstruction on backend or stream 'audio/l16'.
            // Safest: opus or aac if supported by backend 'enhanceFromAudio' buffer concatenation.
            // File concatenation of m4a/aac isn't trivial.
            // pcm16bits is raw samples. Concatenating them on backend = valid PCM file (missing header).
            // Backend can wrap in WAV header.
            sampleRate: 16000,
            numChannels: 1,
          ),
        );

        _audioBuffer.clear();
        stream.listen((data) {
          _audioBuffer.addAll(data);
          _webSocketService!.streamAudioChunk(data);
        });
      } else {
        // Fallback to File
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
      }

      _activeSource = InputSource.voice;
      _updateState(InputState.recording);
      _recordingDuration = 0;
      _maxSeenAmplitude = -160.0; // Reset
      _error = null;
      notifyListeners();

      _startAmplitudeMonitoring();
      return true;
    } catch (e) {
      _handleError('Failed to start recording: $e');
      return false;
    }
  }

  /// Stop recording and return file path (if file mode) or null (if stream mode)
  Future<File?> stopRecording() async {
    _stopAmplitudeMonitoring();

    if (_state != InputState.recording) return null;

    try {
      final path =
          await _audioRecorder.stop(); // Stops stream or file recording

      if (_webSocketService != null) {
        // CLIENT-SIDE SILENCE DETECTION
        if (_maxSeenAmplitude < _silenceThreshold) {
          debugPrint(
              '🔇 No speech detected (Max Amplitude: $_maxSeenAmplitude). Aborting.');
          await cancelRecording();
          return null;
        }

        // Realtime mode: Signal end
        _webSocketService!.endAudioStream();

        // RESILIENCY: If we lose connection or processing takes too long,
        // we have the full buffer in _audioBuffer.
        // We'll give WS a few seconds, otherwise we fallback to offline storage.
        _startResiliencyTimer();

        _updateState(InputState.processing); // UI shows processing
        notifyListeners();
        // We expect WS message to transition to success
        return null;
      }

      // Legacy File Mode
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
        if (amplitude.current > _maxSeenAmplitude) {
          _maxSeenAmplitude = amplitude.current;
        }
      }
    });
  }

  void _stopAmplitudeMonitoring() {
    _amplitudeTimer?.cancel();
    _amplitudeTimer = null;
  }

  // --- State Management Helpers ---

  Timer? _resiliencyTimer;

  void _startResiliencyTimer() {
    _resiliencyTimer?.cancel();
    _resiliencyTimer = Timer(const Duration(seconds: 30), () async {
      if (_state == InputState.processing) {
        debugPrint('⏳ WS Processing timeout. Falling back to offline storage.');
        await _fallbackToOfflineAudio();
      }
    });
  }

  Future<void> _fallbackToOfflineAudio() async {
    if (_audioBuffer.isEmpty) return;

    try {
      final tempDir = await getTemporaryDirectory();
      final path =
          '${tempDir.path}/offline_voice_${DateTime.now().millisecondsSinceEpoch}.wav';
      final file = File(path);

      // Add WAV header (since we record in pcm16bits 16000Hz mono)
      final wavData = _addWavHeader(Uint8List.fromList(_audioBuffer), 16000);
      await file.writeAsBytes(wavData);

      await _saveToOffline(path, OfflineInputType.audio);
      _audioBuffer.clear();
    } catch (e) {
      debugPrint('Fallback to offline failed: $e');
      _handleError('Failed to save recording locally');
    }
  }

  Uint8List _addWavHeader(Uint8List pcmData, int sampleRate) {
    final int fileSize = pcmData.length + 36;
    final int byteRate = sampleRate * 2; // 16-bit mono

    final header = ByteData(44);
    // RIFF header
    header.setUint32(0, 0x52494646, Endian.big); // "RIFF"
    header.setUint32(4, fileSize, Endian.little);
    header.setUint32(8, 0x57415645, Endian.big); // "WAVE"
    // fmt chunk
    header.setUint32(12, 0x666d7420, Endian.big); // "fmt "
    header.setUint32(16, 16, Endian.little); // chunk size
    header.setUint16(20, 1, Endian.little); // PCM
    header.setUint16(22, 1, Endian.little); // mono
    header.setUint32(24, sampleRate, Endian.little);
    header.setUint32(28, byteRate, Endian.little);
    header.setUint16(32, 2, Endian.little); // block align
    header.setUint16(34, 16, Endian.little); // bits per sample
    // data chunk
    header.setUint32(36, 0x64617461, Endian.big); // "data"
    header.setUint32(40, pcmData.length, Endian.little);

    final result = Uint8List(44 + pcmData.length);
    result.setAll(0, header.buffer.asUint8List());
    result.setAll(44, pcmData);
    return result;
  }

  void _updateState(InputState newState) {
    if (newState == InputState.success || newState == InputState.error) {
      _resiliencyTimer?.cancel();
      _audioBuffer.clear();
    }
    debugPrint('InputProvider State: $_state -> $newState');
    _state = newState;
  }

  void _handleSuccess() {
    _updateState(InputState.success);

    // Notify memory creation for real-time feed updates
    if (_lastMemory != null) {
      debugPrint(
          '🪄 InputProvider: Notifying MemoryService of new memory: ${_lastMemory!.id}');
      _memoryService.notifyMemoryCreated(_lastMemory!);
    }

    notifyListeners();

    debugPrint('InputProvider: handled success, scheduling reset...');
    _statusMessage = null;
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

    // Notify user but don't hard-error (which turns button red)
    // Instead, move to idle and show a toast/status via feedback message
    _statusMessage = "Network unstable. Saved to local queue.";
    _updateState(InputState.idle);
    notifyListeners();

    // Try to sync in background after a delay
    Future.delayed(const Duration(seconds: 15), syncPendingInputs);
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
        _lastFeedbackMessage =
            result.answer ?? result.shortResponse ?? result.enhancedText;
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
        _memoryService.notifyMemoryDeleted(id);
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
