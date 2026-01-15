import 'dart:async';
import 'dart:io';
import 'package:flutter/material.dart';
import 'package:flutter/services.dart';
import 'package:provider/provider.dart';
import 'package:record/record.dart';
import 'package:path_provider/path_provider.dart';
import '../../config/app_colors.dart';
import '../../config/app_typography.dart';
import '../../config/app_spacing.dart';
import '../../providers/input_provider.dart';
import 'marquee_examples.dart';

/// Voice/Text input bar - the primary input mechanism
class VoiceInputBar extends StatefulWidget {
  final VoidCallback? onExpandToFullscreen;

  const VoiceInputBar({
    super.key,
    this.onExpandToFullscreen,
  });

  @override
  State<VoiceInputBar> createState() => _VoiceInputBarState();
}

class _VoiceInputBarState extends State<VoiceInputBar>
    with SingleTickerProviderStateMixin {
  final _textController = TextEditingController();
  final _focusNode = FocusNode();
  final _audioRecorder = AudioRecorder();

  bool _isRecording = false;
  bool _hasText = false;
  int _recordingSeconds = 0;
  Timer? _recordingTimer;
  String? _recordingPath;

  late AnimationController _pulseController;
  late Animation<double> _pulseAnimation;

  @override
  void initState() {
    super.initState();
    _textController.addListener(_onTextChanged);

    _pulseController = AnimationController(
      duration: const Duration(milliseconds: 1000),
      vsync: this,
    );
    _pulseAnimation = Tween<double>(begin: 1.0, end: 1.15).animate(
      CurvedAnimation(parent: _pulseController, curve: Curves.easeInOut),
    );
  }

  @override
  void dispose() {
    _textController.dispose();
    _focusNode.dispose();
    _recordingTimer?.cancel();
    _audioRecorder.dispose();
    _pulseController.dispose();
    super.dispose();
  }

  void _onTextChanged() {
    final hasText = _textController.text.trim().isNotEmpty;
    if (hasText != _hasText) {
      setState(() => _hasText = hasText);
    }
  }

  Future<void> _startRecording() async {
    // Check permission
    if (!await _audioRecorder.hasPermission()) {
      return;
    }

    final inputProvider = context.read<InputProvider>();
    final maxDuration = inputProvider.maxRecordingDuration;

    // Get temp directory for recording
    final tempDir = await getTemporaryDirectory();
    _recordingPath = '${tempDir.path}/voice_input_${DateTime.now().millisecondsSinceEpoch}.m4a';

    // Start recording
    await _audioRecorder.start(
      const RecordConfig(
        encoder: AudioEncoder.aacLc,
        bitRate: 128000,
        sampleRate: 44100,
      ),
      path: _recordingPath!,
    );

    // Haptic feedback
    HapticFeedback.mediumImpact();

    setState(() {
      _isRecording = true;
      _recordingSeconds = 0;
    });

    inputProvider.startRecording();
    _pulseController.repeat(reverse: true);

    // Start timer
    _recordingTimer = Timer.periodic(const Duration(seconds: 1), (timer) {
      setState(() {
        _recordingSeconds++;
      });
      inputProvider.updateRecordingDuration(_recordingSeconds);

      // Auto-stop at max duration
      if (_recordingSeconds >= maxDuration) {
        _stopRecording();
      }
    });
  }

  Future<void> _stopRecording() async {
    _recordingTimer?.cancel();
    _pulseController.stop();
    _pulseController.reset();

    final path = await _audioRecorder.stop();
    HapticFeedback.lightImpact();

    setState(() {
      _isRecording = false;
    });

    if (path != null && _recordingSeconds > 0) {
      final inputProvider = context.read<InputProvider>();
      inputProvider.stopRecording();

      // Process the audio
      final file = File(path);
      await inputProvider.processAudio(file);

      // Clean up temp file
      try {
        await file.delete();
      } catch (_) {}
    } else {
      context.read<InputProvider>().cancelRecording();
    }
  }

  void _cancelRecording() async {
    _recordingTimer?.cancel();
    _pulseController.stop();
    _pulseController.reset();
    await _audioRecorder.stop();
    HapticFeedback.lightImpact();

    setState(() {
      _isRecording = false;
      _recordingSeconds = 0;
    });

    context.read<InputProvider>().cancelRecording();

    // Clean up temp file
    if (_recordingPath != null) {
      try {
        await File(_recordingPath!).delete();
      } catch (_) {}
    }
  }

  Future<void> _submitText() async {
    final text = _textController.text.trim();
    if (text.isEmpty) return;

    _focusNode.unfocus();
    final success = await context.read<InputProvider>().processText(text);

    if (success) {
      _textController.clear();
    }
  }

  void _onExampleTap(MarqueeExample example) {
    _textController.text = example.text;
    _focusNode.requestFocus();
  }

  @override
  Widget build(BuildContext context) {
    return Consumer<InputProvider>(
      builder: (context, inputProvider, _) {
        final state = inputProvider.state;
        final isProcessing = state == InputState.transcribing ||
            state == InputState.enhancing ||
            state == InputState.processing;

        return Column(
          mainAxisSize: MainAxisSize.min,
          children: [
            // Marquee examples (above input bar)
            if (!_isRecording && !_hasText && !isProcessing)
              Padding(
                padding: const EdgeInsets.only(bottom: AppSpacing.sm),
                child: MarqueeExamples(onExampleTap: _onExampleTap),
              ),

            // Main input bar
            Container(
              padding: const EdgeInsets.symmetric(
                horizontal: AppSpacing.sm,
                vertical: AppSpacing.sm,
              ),
              decoration: BoxDecoration(
                color: AppColors.surface,
                borderRadius: BorderRadius.circular(AppSpacing.radiusXl),
                boxShadow: [
                  BoxShadow(
                    color: AppColors.textPrimary.withOpacity(0.08),
                    blurRadius: 16,
                    offset: const Offset(0, -4),
                  ),
                ],
              ),
              child: _isRecording
                  ? _buildRecordingState(inputProvider)
                  : _buildDefaultState(isProcessing),
            ),
          ],
        );
      },
    );
  }

  Widget _buildDefaultState(bool isProcessing) {
    return Row(
      children: [
        // Mic button
        _MicButton(
          isProcessing: isProcessing,
          onPressed: _startRecording,
          onLongPressStart: _startRecording,
          onLongPressEnd: _stopRecording,
        ),
        const SizedBox(width: AppSpacing.sm),

        // Text input
        Expanded(
          child: TextField(
            controller: _textController,
            focusNode: _focusNode,
            enabled: !isProcessing,
            style: AppTypography.input,
            decoration: InputDecoration(
              hintText: 'What did you do?',
              hintStyle: AppTypography.inputHint,
              border: InputBorder.none,
              contentPadding: const EdgeInsets.symmetric(
                horizontal: AppSpacing.sm,
                vertical: AppSpacing.sm,
              ),
              isDense: true,
            ),
            textInputAction: TextInputAction.send,
            onSubmitted: (_) => _submitText(),
          ),
        ),

        // Submit button
        _SubmitButton(
          hasText: _hasText,
          isProcessing: isProcessing,
          onPressed: _submitText,
        ),
      ],
    );
  }

  Widget _buildRecordingState(InputProvider inputProvider) {
    final maxDuration = inputProvider.maxRecordingDuration;
    final progress = _recordingSeconds / maxDuration;

    return Row(
      children: [
        // Recording indicator
        ScaleTransition(
          scale: _pulseAnimation,
          child: Container(
            width: 12,
            height: 12,
            decoration: const BoxDecoration(
              color: AppColors.recording,
              shape: BoxShape.circle,
            ),
          ),
        ),
        const SizedBox(width: AppSpacing.sm),

        // REC label
        Text(
          'REC',
          style: AppTypography.label.copyWith(color: AppColors.recording),
        ),
        const SizedBox(width: AppSpacing.sm),

        // Timer
        Text(
          '${_recordingSeconds}s',
          style: AppTypography.label.copyWith(color: AppColors.textSecondary),
        ),
        const SizedBox(width: AppSpacing.md),

        // Progress bar
        Expanded(
          child: ClipRRect(
            borderRadius: BorderRadius.circular(4),
            child: LinearProgressIndicator(
              value: progress,
              backgroundColor: AppColors.recordingLight,
              valueColor: const AlwaysStoppedAnimation<Color>(AppColors.recording),
              minHeight: 6,
            ),
          ),
        ),
        const SizedBox(width: AppSpacing.sm),

        // Max duration
        Text(
          '${maxDuration}s',
          style: AppTypography.caption,
        ),
        const SizedBox(width: AppSpacing.md),

        // Cancel button
        IconButton(
          onPressed: _cancelRecording,
          icon: const Icon(Icons.close_rounded),
          iconSize: 24,
          color: AppColors.textSecondary,
          padding: EdgeInsets.zero,
          constraints: const BoxConstraints(minWidth: 36, minHeight: 36),
        ),

        // Send button
        IconButton(
          onPressed: _stopRecording,
          icon: const Icon(Icons.check_rounded),
          iconSize: 24,
          color: AppColors.primary,
          padding: EdgeInsets.zero,
          constraints: const BoxConstraints(minWidth: 36, minHeight: 36),
        ),
      ],
    );
  }
}

/// Mic button with tap and long-press support
class _MicButton extends StatelessWidget {
  final bool isProcessing;
  final VoidCallback onPressed;
  final VoidCallback onLongPressStart;
  final VoidCallback onLongPressEnd;

  const _MicButton({
    required this.isProcessing,
    required this.onPressed,
    required this.onLongPressStart,
    required this.onLongPressEnd,
  });

  @override
  Widget build(BuildContext context) {
    return GestureDetector(
      onTap: isProcessing ? null : onPressed,
      onLongPressStart: isProcessing ? null : (_) => onLongPressStart(),
      onLongPressEnd: isProcessing ? null : (_) => onLongPressEnd(),
      child: Container(
        width: 44,
        height: 44,
        decoration: BoxDecoration(
          color: isProcessing ? AppColors.borderLight : AppColors.primary,
          shape: BoxShape.circle,
        ),
        child: isProcessing
            ? const Padding(
                padding: EdgeInsets.all(12),
                child: CircularProgressIndicator(
                  strokeWidth: 2,
                  valueColor: AlwaysStoppedAnimation<Color>(AppColors.primary),
                ),
              )
            : const Icon(
                Icons.mic_rounded,
                color: AppColors.textOnPrimary,
                size: 24,
              ),
      ),
    );
  }
}

/// Submit button
class _SubmitButton extends StatelessWidget {
  final bool hasText;
  final bool isProcessing;
  final VoidCallback onPressed;

  const _SubmitButton({
    required this.hasText,
    required this.isProcessing,
    required this.onPressed,
  });

  @override
  Widget build(BuildContext context) {
    final isEnabled = hasText && !isProcessing;

    return GestureDetector(
      onTap: isEnabled ? onPressed : null,
      child: AnimatedContainer(
        duration: const Duration(milliseconds: 200),
        width: 40,
        height: 40,
        decoration: BoxDecoration(
          color: isEnabled ? AppColors.primary : AppColors.borderLight,
          shape: BoxShape.circle,
        ),
        child: Icon(
          Icons.arrow_upward_rounded,
          color: isEnabled ? AppColors.textOnPrimary : AppColors.textDisabled,
          size: 22,
        ),
      ),
    );
  }
}
