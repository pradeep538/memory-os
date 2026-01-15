import 'dart:async';
import 'dart:io';
import 'package:flutter/material.dart';
import 'package:flutter/services.dart';
import 'package:provider/provider.dart';
import 'package:record/record.dart';
import 'package:path_provider/path_provider.dart';
import '../config/app_colors.dart';
import '../config/app_typography.dart';
import '../config/app_spacing.dart';
import '../providers/input_provider.dart';
import '../widgets/input/marquee_examples.dart';
import '../widgets/common/category_chip.dart';
import '../widgets/common/confidence_indicator.dart';

/// Fullscreen input modal for focused logging
class InputModalScreen extends StatefulWidget {
  const InputModalScreen({super.key});

  @override
  State<InputModalScreen> createState() => _InputModalScreenState();
}

class _InputModalScreenState extends State<InputModalScreen>
    with TickerProviderStateMixin {
  final _textController = TextEditingController();
  final _focusNode = FocusNode();
  final _audioRecorder = AudioRecorder();

  bool _isRecording = false;
  int _recordingSeconds = 0;
  Timer? _recordingTimer;
  String? _recordingPath;

  late AnimationController _pulseController;
  late Animation<double> _pulseAnimation;
  late AnimationController _waveController;

  @override
  void initState() {
    super.initState();
    _pulseController = AnimationController(
      duration: const Duration(milliseconds: 1000),
      vsync: this,
    );
    _pulseAnimation = Tween<double>(begin: 1.0, end: 1.2).animate(
      CurvedAnimation(parent: _pulseController, curve: Curves.easeInOut),
    );

    _waveController = AnimationController(
      duration: const Duration(milliseconds: 1500),
      vsync: this,
    );
  }

  @override
  void dispose() {
    _textController.dispose();
    _focusNode.dispose();
    _recordingTimer?.cancel();
    _audioRecorder.dispose();
    _pulseController.dispose();
    _waveController.dispose();
    super.dispose();
  }

  Future<void> _startRecording() async {
    if (!await _audioRecorder.hasPermission()) {
      return;
    }

    final inputProvider = context.read<InputProvider>();
    final maxDuration = inputProvider.maxRecordingDuration;

    final tempDir = await getTemporaryDirectory();
    _recordingPath = '${tempDir.path}/voice_input_${DateTime.now().millisecondsSinceEpoch}.m4a';

    await _audioRecorder.start(
      const RecordConfig(
        encoder: AudioEncoder.aacLc,
        bitRate: 128000,
        sampleRate: 44100,
      ),
      path: _recordingPath!,
    );

    HapticFeedback.mediumImpact();

    setState(() {
      _isRecording = true;
      _recordingSeconds = 0;
    });

    inputProvider.startRecording();
    _pulseController.repeat(reverse: true);
    _waveController.repeat();

    _recordingTimer = Timer.periodic(const Duration(seconds: 1), (timer) {
      setState(() {
        _recordingSeconds++;
      });
      inputProvider.updateRecordingDuration(_recordingSeconds);

      if (_recordingSeconds >= maxDuration) {
        _stopRecording();
      }
    });
  }

  Future<void> _stopRecording() async {
    _recordingTimer?.cancel();
    _pulseController.stop();
    _pulseController.reset();
    _waveController.stop();
    _waveController.reset();

    final path = await _audioRecorder.stop();
    HapticFeedback.lightImpact();

    setState(() {
      _isRecording = false;
    });

    if (path != null && _recordingSeconds > 0) {
      final inputProvider = context.read<InputProvider>();
      inputProvider.stopRecording();

      final file = File(path);
      final success = await inputProvider.processAudio(file);

      try {
        await file.delete();
      } catch (_) {}

      if (success && mounted) {
        Navigator.of(context).pop(true);
      }
    } else {
      context.read<InputProvider>().cancelRecording();
    }
  }

  void _cancelRecording() async {
    _recordingTimer?.cancel();
    _pulseController.stop();
    _pulseController.reset();
    _waveController.stop();
    _waveController.reset();
    await _audioRecorder.stop();
    HapticFeedback.lightImpact();

    setState(() {
      _isRecording = false;
      _recordingSeconds = 0;
    });

    context.read<InputProvider>().cancelRecording();

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

    if (success && mounted) {
      Navigator.of(context).pop(true);
    }
  }

  void _onExampleTap(MarqueeExample example) {
    _textController.text = example.text;
    _focusNode.requestFocus();
  }

  @override
  Widget build(BuildContext context) {
    return Scaffold(
      backgroundColor: AppColors.background,
      body: SafeArea(
        child: Consumer<InputProvider>(
          builder: (context, inputProvider, _) {
            final state = inputProvider.state;
            final isProcessing = state == InputState.transcribing ||
                state == InputState.enhancing ||
                state == InputState.processing;

            return Column(
              children: [
                // Header
                _buildHeader(),

                // Main content
                Expanded(
                  child: _isRecording
                      ? _buildRecordingView(inputProvider)
                      : _buildInputView(isProcessing),
                ),

                // Confirmation section (if needed)
                if (state == InputState.confirming)
                  _buildConfirmationSection(inputProvider),
              ],
            );
          },
        ),
      ),
    );
  }

  Widget _buildHeader() {
    return Container(
      padding: const EdgeInsets.symmetric(
        horizontal: AppSpacing.md,
        vertical: AppSpacing.sm,
      ),
      child: Row(
        children: [
          IconButton(
            onPressed: () => Navigator.of(context).pop(),
            icon: const Icon(Icons.close_rounded),
            color: AppColors.textSecondary,
          ),
          const Spacer(),
          Text(
            'Log Memory',
            style: AppTypography.h4,
          ),
          const Spacer(),
          const SizedBox(width: 48), // Balance close button
        ],
      ),
    );
  }

  Widget _buildInputView(bool isProcessing) {
    return Padding(
      padding: const EdgeInsets.symmetric(horizontal: AppSpacing.screenPadding),
      child: Column(
        children: [
          const SizedBox(height: AppSpacing.xl),

          // Large mic button
          GestureDetector(
            onTap: isProcessing ? null : _startRecording,
            onLongPressStart: isProcessing ? null : (_) => _startRecording(),
            onLongPressEnd: isProcessing ? null : (_) => _stopRecording(),
            child: Container(
              width: 120,
              height: 120,
              decoration: BoxDecoration(
                color: isProcessing ? AppColors.borderLight : AppColors.primary,
                shape: BoxShape.circle,
                boxShadow: [
                  BoxShadow(
                    color: AppColors.primary.withOpacity(0.3),
                    blurRadius: 24,
                    offset: const Offset(0, 8),
                  ),
                ],
              ),
              child: isProcessing
                  ? const Center(
                      child: CircularProgressIndicator(
                        valueColor: AlwaysStoppedAnimation<Color>(AppColors.primary),
                      ),
                    )
                  : const Icon(
                      Icons.mic_rounded,
                      color: AppColors.textOnPrimary,
                      size: 48,
                    ),
            ),
          ),

          const SizedBox(height: AppSpacing.lg),

          Text(
            isProcessing ? 'Processing...' : 'Tap to speak',
            style: AppTypography.body.copyWith(
              color: AppColors.textSecondary,
            ),
          ),

          const SizedBox(height: AppSpacing.xxl),

          // Divider with "or"
          Row(
            children: [
              const Expanded(child: Divider()),
              Padding(
                padding: const EdgeInsets.symmetric(horizontal: AppSpacing.md),
                child: Text(
                  'or type',
                  style: AppTypography.caption,
                ),
              ),
              const Expanded(child: Divider()),
            ],
          ),

          const SizedBox(height: AppSpacing.lg),

          // Text input
          Container(
            decoration: BoxDecoration(
              color: AppColors.surface,
              borderRadius: BorderRadius.circular(AppSpacing.radiusLg),
              border: Border.all(color: AppColors.border),
            ),
            child: TextField(
              controller: _textController,
              focusNode: _focusNode,
              enabled: !isProcessing,
              style: AppTypography.body,
              maxLines: 4,
              minLines: 2,
              decoration: InputDecoration(
                hintText: 'What did you do?',
                hintStyle: AppTypography.inputHint,
                border: InputBorder.none,
                contentPadding: const EdgeInsets.all(AppSpacing.md),
              ),
              textInputAction: TextInputAction.done,
              onSubmitted: (_) => _submitText(),
            ),
          ),

          const SizedBox(height: AppSpacing.md),

          // Submit button
          SizedBox(
            width: double.infinity,
            child: ElevatedButton(
              onPressed: _textController.text.trim().isNotEmpty && !isProcessing
                  ? _submitText
                  : null,
              child: const Text('Log it'),
            ),
          ),

          const Spacer(),

          // Marquee examples
          MarqueeExamples(onExampleTap: _onExampleTap),

          const SizedBox(height: AppSpacing.lg),
        ],
      ),
    );
  }

  Widget _buildRecordingView(InputProvider inputProvider) {
    final maxDuration = inputProvider.maxRecordingDuration;
    final progress = _recordingSeconds / maxDuration;

    return Column(
      mainAxisAlignment: MainAxisAlignment.center,
      children: [
        // Animated recording indicator
        Stack(
          alignment: Alignment.center,
          children: [
            // Pulsing circles
            ...List.generate(3, (index) {
              return AnimatedBuilder(
                animation: _waveController,
                builder: (context, child) {
                  final delay = index * 0.3;
                  final animValue = (_waveController.value + delay) % 1.0;
                  return Container(
                    width: 120 + (animValue * 60),
                    height: 120 + (animValue * 60),
                    decoration: BoxDecoration(
                      shape: BoxShape.circle,
                      border: Border.all(
                        color: AppColors.recording.withOpacity(1 - animValue),
                        width: 2,
                      ),
                    ),
                  );
                },
              );
            }),

            // Main button
            ScaleTransition(
              scale: _pulseAnimation,
              child: Container(
                width: 120,
                height: 120,
                decoration: const BoxDecoration(
                  color: AppColors.recording,
                  shape: BoxShape.circle,
                ),
                child: const Icon(
                  Icons.mic_rounded,
                  color: AppColors.textOnPrimary,
                  size: 48,
                ),
              ),
            ),
          ],
        ),

        const SizedBox(height: AppSpacing.xl),

        // Timer
        Text(
          '${_recordingSeconds}s',
          style: AppTypography.numberLarge.copyWith(
            color: AppColors.recording,
          ),
        ),

        const SizedBox(height: AppSpacing.sm),

        Text(
          'Recording...',
          style: AppTypography.body.copyWith(
            color: AppColors.textSecondary,
          ),
        ),

        const SizedBox(height: AppSpacing.xl),

        // Progress bar
        Padding(
          padding: const EdgeInsets.symmetric(horizontal: AppSpacing.xxl),
          child: Column(
            children: [
              ClipRRect(
                borderRadius: BorderRadius.circular(4),
                child: LinearProgressIndicator(
                  value: progress,
                  backgroundColor: AppColors.recordingLight,
                  valueColor: const AlwaysStoppedAnimation<Color>(AppColors.recording),
                  minHeight: 8,
                ),
              ),
              const SizedBox(height: AppSpacing.sm),
              Row(
                mainAxisAlignment: MainAxisAlignment.spaceBetween,
                children: [
                  Text('0s', style: AppTypography.caption),
                  Text('${maxDuration}s', style: AppTypography.caption),
                ],
              ),
            ],
          ),
        ),

        const SizedBox(height: AppSpacing.xxl),

        // Control buttons
        Row(
          mainAxisAlignment: MainAxisAlignment.center,
          children: [
            // Cancel
            GestureDetector(
              onTap: _cancelRecording,
              child: Container(
                width: 64,
                height: 64,
                decoration: BoxDecoration(
                  color: AppColors.surface,
                  shape: BoxShape.circle,
                  border: Border.all(color: AppColors.border),
                ),
                child: const Icon(
                  Icons.close_rounded,
                  color: AppColors.textSecondary,
                  size: 28,
                ),
              ),
            ),

            const SizedBox(width: AppSpacing.xl),

            // Stop/Send
            GestureDetector(
              onTap: _stopRecording,
              child: Container(
                width: 64,
                height: 64,
                decoration: const BoxDecoration(
                  color: AppColors.primary,
                  shape: BoxShape.circle,
                ),
                child: const Icon(
                  Icons.check_rounded,
                  color: AppColors.textOnPrimary,
                  size: 28,
                ),
              ),
            ),
          ],
        ),
      ],
    );
  }

  Widget _buildConfirmationSection(InputProvider inputProvider) {
    final result = inputProvider.pendingResult;
    if (result == null) return const SizedBox.shrink();

    return Container(
      padding: const EdgeInsets.all(AppSpacing.lg),
      decoration: BoxDecoration(
        color: AppColors.surface,
        borderRadius: const BorderRadius.vertical(
          top: Radius.circular(AppSpacing.radiusXl),
        ),
        boxShadow: [
          BoxShadow(
            color: AppColors.textPrimary.withOpacity(0.1),
            blurRadius: 16,
            offset: const Offset(0, -4),
          ),
        ],
      ),
      child: Column(
        mainAxisSize: MainAxisSize.min,
        crossAxisAlignment: CrossAxisAlignment.start,
        children: [
          Row(
            children: [
              Text(
                'We understood:',
                style: AppTypography.label,
              ),
              const Spacer(),
              ConfidenceIndicator(confidence: result.confidenceScore),
            ],
          ),
          const SizedBox(height: AppSpacing.md),
          Container(
            width: double.infinity,
            padding: const EdgeInsets.all(AppSpacing.md),
            decoration: BoxDecoration(
              color: AppColors.backgroundSecondary,
              borderRadius: BorderRadius.circular(AppSpacing.radiusMd),
            ),
            child: Text(
              result.enhancedText,
              style: AppTypography.body,
            ),
          ),
          const SizedBox(height: AppSpacing.sm),
          Row(
            children: [
              CategoryChip(category: result.detectedCategory),
            ],
          ),
          const SizedBox(height: AppSpacing.lg),
          Row(
            children: [
              Expanded(
                child: OutlinedButton(
                  onPressed: () => inputProvider.cancelConfirmation(),
                  child: const Text('Edit'),
                ),
              ),
              const SizedBox(width: AppSpacing.md),
              Expanded(
                flex: 2,
                child: ElevatedButton(
                  onPressed: () async {
                    final success = await inputProvider.confirmInput();
                    if (success && mounted) {
                      Navigator.of(context).pop(true);
                    }
                  },
                  child: const Text('Confirm'),
                ),
              ),
            ],
          ),
        ],
      ),
    );
  }
}
