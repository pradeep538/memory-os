import 'dart:async';
import 'package:flutter/material.dart';
import 'package:flutter/services.dart';
import 'package:provider/provider.dart';
import '../../config/app_colors.dart';
import '../../config/app_typography.dart';
import '../../config/app_spacing.dart';
import '../../providers/input_provider.dart';
import 'marquee_examples.dart';

/// Text-only input bar (Voice is handled by MicFab)
/// Becomes a waveform visualizer during recording
class VoiceInputBar extends StatefulWidget {
  final VoidCallback? onExpandToFullscreen;

  const VoiceInputBar({super.key, this.onExpandToFullscreen});

  @override
  State<VoiceInputBar> createState() => _VoiceInputBarState();
}

class _VoiceInputBarState extends State<VoiceInputBar> {
  final _textController = TextEditingController();
  final _focusNode = FocusNode();
  bool _hasText = false;

  @override
  void initState() {
    super.initState();
    _textController.addListener(_onTextChanged);
  }

  @override
  void dispose() {
    _textController.dispose();
    _focusNode.dispose();
    super.dispose();
  }

  void _onTextChanged() {
    final hasText = _textController.text.trim().isNotEmpty;
    if (hasText != _hasText) {
      setState(() => _hasText = hasText);
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
            state == InputState.processing ||
            state == InputState.confirming;
        final isRecording = state == InputState.recording;

        return Column(
          mainAxisSize: MainAxisSize.min,
          children: [
            // status message now handled by MicFab

            // Marquee examples (above input bar), show only when idle
            if (!_hasText &&
                !isProcessing &&
                !isRecording &&
                state == InputState.idle)
              Padding(
                padding: const EdgeInsets.only(bottom: AppSpacing.sm),
                child: MarqueeExamples(onExampleTap: _onExampleTap),
              ),

            // Main input bar container
            if (isRecording)
              Padding(
                padding: const EdgeInsets.only(bottom: AppSpacing.sm),
                child: Container(
                  padding: const EdgeInsets.symmetric(
                    horizontal: 12,
                    vertical: 6,
                  ),
                  decoration: BoxDecoration(
                    color: AppColors.surface,
                    borderRadius: BorderRadius.circular(24),
                    boxShadow: [
                      BoxShadow(
                        color: Colors.black.withOpacity(0.05),
                        blurRadius: 8,
                        offset: const Offset(0, 2),
                      ),
                    ],
                  ),
                  child: Row(
                    mainAxisSize: MainAxisSize.min,
                    children: [
                      const Icon(
                        Icons.fiber_manual_record,
                        color: Colors.red,
                        size: 12,
                      ),
                      const SizedBox(width: 8),
                      Text(
                        '${inputProvider.maxRecordingDuration - inputProvider.recordingDuration}s',
                        style: AppTypography.label.copyWith(
                          color: AppColors.textPrimary,
                          fontWeight: FontWeight.bold,
                        ),
                      ),
                    ],
                  ),
                ),
              ),

            // Main input bar container
            AnimatedContainer(
              duration: const Duration(milliseconds: 300),
              curve: Curves.easeInOut,
              padding: const EdgeInsets.symmetric(
                horizontal: AppSpacing.sm,
                vertical: AppSpacing.sm,
              ),
              decoration: BoxDecoration(
                color: isRecording
                    ? AppColors.primary.withOpacity(0.05)
                    : AppColors.surface,
                borderRadius: BorderRadius.circular(AppSpacing.radiusXl),
                boxShadow: [
                  BoxShadow(
                    color: isRecording
                        ? AppColors.primary.withOpacity(0.1)
                        : AppColors.textPrimary.withOpacity(0.08),
                    blurRadius: 16,
                    offset: const Offset(0, -4),
                  ),
                ],
                border: isRecording
                    ? Border.all(color: AppColors.primary.withOpacity(0.3))
                    : null,
              ),
              child: AnimatedSwitcher(
                duration: const Duration(milliseconds: 200),
                child: isRecording
                    ? _buildRecordingState(context, inputProvider)
                    : _buildTextState(
                        isProcessing,
                        state,
                        inputProvider.activeSource,
                      ),
              ),
            ),
          ],
        );
      },
    );
  }

  Widget _buildTextState(
    bool isProcessing,
    InputState state,
    InputSource? activeSource,
  ) {
    return Row(
      key: const ValueKey('text_state'),
      children: [
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
          state: state,
          activeSource: activeSource,
          onPressed: _submitText,
        ),
      ],
    );
  }

  Widget _buildRecordingState(BuildContext context, InputProvider provider) {
    return Row(
      key: const ValueKey('recording_state'),
      children: [
        const SizedBox(width: AppSpacing.md),

        // Recording Label with Icon
        Icon(Icons.graphic_eq_rounded, color: AppColors.primary, size: 20),
        const SizedBox(width: AppSpacing.sm),
        Text(
          'Listening...',
          style: AppTypography.label.copyWith(color: AppColors.primary),
        ),

        const SizedBox(width: AppSpacing.md),

        // Waveform Graph
        Expanded(
          child: SizedBox(
            height: 30,
            child: WaveformWidget(amplitudeStream: provider.amplitudeStream),
          ),
        ),

        const SizedBox(width: AppSpacing.md),
      ],
    );
  }
}

/// Simple waveform visualizer
class WaveformWidget extends StatefulWidget {
  final Stream<double> amplitudeStream;

  const WaveformWidget({super.key, required this.amplitudeStream});

  @override
  State<WaveformWidget> createState() => _WaveformWidgetState();
}

class _WaveformWidgetState extends State<WaveformWidget> {
  final List<double> _history = List.filled(30, 0.0, growable: true);
  StreamSubscription? _subscription;

  @override
  void initState() {
    super.initState();
    _subscription = widget.amplitudeStream.listen((amp) {
      if (mounted) {
        setState(() {
          // Normalize amplitude roughly between 0 and 1 (assuming dbFS kind of input, but record gives db?)
          // record package `getAmplitude()` returns `current` in dBFS (typically -160 to 0).
          // We need to map -60dB (silence) to 0, and -0dB (loud) to 1.

          double normalized = (amp + 60) / 60;
          if (normalized < 0) normalized = 0;
          if (normalized > 1) normalized = 1;

          _history.removeAt(0);
          _history.add(normalized);
        });
      }
    });
  }

  @override
  void dispose() {
    _subscription?.cancel();
    super.dispose();
  }

  @override
  Widget build(BuildContext context) {
    return CustomPaint(
      painter: WaveformPainter(data: _history, color: AppColors.primary),
      size: Size.infinite,
    );
  }
}

class WaveformPainter extends CustomPainter {
  final List<double> data;
  final Color color;

  WaveformPainter({required this.data, required this.color});

  @override
  void paint(Canvas canvas, Size size) {
    final paint = Paint()
      ..color = color
      ..strokeWidth = 3
      ..strokeCap = StrokeCap.round;

    final stepX = size.width / (data.length - 1);
    final midY = size.height / 2;

    for (int i = 0; i < data.length; i++) {
      final val = data[i]; // 0 to 1
      final height = val * size.height * 0.8; // utilize 80% height

      // Draw centered vertical line
      final x = i * stepX;
      final top = midY - (height / 2);
      final bottom = midY + (height / 2);

      // Min height for visibility
      final actualTop = (bottom - top < 2) ? midY - 1 : top;
      final actualBottom = (bottom - top < 2) ? midY + 1 : bottom;

      canvas.drawLine(Offset(x, actualTop), Offset(x, actualBottom), paint);
    }
  }

  @override
  bool shouldRepaint(covariant WaveformPainter oldDelegate) {
    return true;
  }
}

/// Submit button with state feedback
class _SubmitButton extends StatelessWidget {
  final bool hasText;
  final InputState state;
  final InputSource? activeSource; // Add source
  final VoidCallback onPressed;

  const _SubmitButton({
    required this.hasText,
    required this.state,
    this.activeSource,
    required this.onPressed,
  });

  @override
  Widget build(BuildContext context) {
    final isTextActive = activeSource == InputSource.text;
    final isProcessing = isTextActive &&
        (state == InputState.processing ||
            state == InputState.transcribing ||
            state == InputState.enhancing ||
            state == InputState.confirming);

    // Only enable if has text and NOT processing/recording
    final isEnabled = hasText && !isProcessing && state != InputState.recording;

    return GestureDetector(
      onTap: isEnabled ? onPressed : null,
      child: AnimatedContainer(
        duration: const Duration(milliseconds: 200),
        width: 40,
        height: 40,
        decoration: BoxDecoration(
          color: (isTextActive && state == InputState.success)
              ? AppColors.success
              : (isTextActive && state == InputState.error)
                  ? AppColors.error
                  : isEnabled
                      ? AppColors.primary
                      : AppColors.borderLight,
          shape: BoxShape.circle,
        ),
        child: _buildIcon(isTextActive),
      ),
    );
  }

  Widget _buildIcon(bool isTextActive) {
    if (isTextActive &&
        (state == InputState.processing ||
            state == InputState.transcribing ||
            state == InputState.enhancing ||
            state == InputState.confirming)) {
      return const Padding(
        padding: EdgeInsets.all(10),
        child: CircularProgressIndicator(color: Colors.white, strokeWidth: 2),
      );
    }

    if (isTextActive && state == InputState.success) {
      return const Icon(Icons.check_rounded, color: Colors.white, size: 20);
    }

    if (isTextActive && state == InputState.error) {
      return const Icon(
        Icons.error_outline_rounded,
        color: Colors.white,
        size: 20,
      );
    }

    return Icon(
      Icons.arrow_upward_rounded,
      color: state == InputState.recording // Dimmed during recording
          ? AppColors.textDisabled
          : const Color(0xFFFFFFFF),
      size: 22,
    );
  }
}
