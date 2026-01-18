import 'dart:async';
import 'dart:io';
import 'package:flutter/material.dart';
import 'package:flutter/services.dart';
import 'package:provider/provider.dart';
import '../../config/app_colors.dart';

import '../../providers/input_provider.dart';
import 'package:vibration/vibration.dart';

/// Hold-to-Talk Mic Button for bottom navigation
class MicFab extends StatefulWidget {
  final bool isEnabled;
  final bool isCompact; // Added for compact mode support
  final Function(bool)? onStateChanged; // Added for state change support
  final Function(String)?
      onResult; // Added for result support (though we use onRecordingFinished for file)
  final Function(File)? onRecordingFinished; // NEW: Custom handler

  const MicFab({
    super.key,
    this.isEnabled = true,
    this.isCompact = false,
    this.onStateChanged,
    this.onResult,
    this.onRecordingFinished,
  });

  @override
  State<MicFab> createState() => _MicFabState();
}

class _MicFabState extends State<MicFab> with SingleTickerProviderStateMixin {
  late AnimationController _pulseController;
  late Animation<double> _pulseAnimation;

  Timer? _countdownTimer;
  int _elapsedSeconds = 0;

  @override
  void initState() {
    super.initState();
    _pulseController = AnimationController(
      duration: const Duration(milliseconds: 700), // Faster pulse
      vsync: this,
    );
    _pulseAnimation = Tween<double>(begin: 1.0, end: 1.35).animate(
      CurvedAnimation(parent: _pulseController, curve: Curves.easeInOutSine),
    );
  }

  Timer? _holdTimer;
  bool _isHolding = false;

  @override
  void dispose() {
    _pulseController.dispose();
    _countdownTimer?.cancel();
    _holdTimer?.cancel();
    super.dispose();
  }

  void _onTapDown(TapDownDetails details) {
    if (!widget.isEnabled || _isHolding) return;
    setState(() => _isHolding = true);

    // Feedback that we are waiting
    HapticFeedback.selectionClick();

    _holdTimer = Timer(const Duration(milliseconds: 500), () {
      if (mounted && _isHolding) {
        _startRecording();
      }
    });
  }

  void _onTapUp(TapUpDetails details) {
    _handleRelease();
  }

  void _onTapCancel() {
    _handleRelease();
  }

  void _handleRelease() {
    _holdTimer?.cancel();
    setState(() => _isHolding = false);

    final provider = context.read<InputProvider>();
    // Stop if recording OR if we are initializing (to catch the race condition)
    if (provider.state == InputState.recording || _isInitializingRecording) {
      _stopRecording();
    }
  }

  bool _isInitializingRecording = false;

  Future<void> _startRecording() async {
    final provider = context.read<InputProvider>();
    if (provider.state != InputState.idle &&
        provider.state != InputState.success &&
        provider.state != InputState.error) {
      return;
    }

    _isInitializingRecording = true;

    // Vibrate FIRST to signal "Ready"
    if (await Vibration.hasVibrator()) {
      Vibration.vibrate(duration: 100);
    } else {
      HapticFeedback.heavyImpact();
    }

    // Then start recording
    final success = await provider.startRecording();
    _isInitializingRecording = false;

    if (!success) return;

    // CRITICAL FIX: If user released while we were initializing, stop immediately.
    if (!_isHolding && mounted) {
      _stopRecording();
      return;
    }

    _pulseController.repeat(reverse: true);

    setState(() {
      _elapsedSeconds = 0;
    });

    _countdownTimer = Timer.periodic(const Duration(seconds: 1), (timer) {
      setState(() {
        _elapsedSeconds++;
      });
      provider.updateRecordingDuration(_elapsedSeconds);

      // Warning Haptic: 2 seconds remaining (Double tap)
      if (provider.maxRecordingDuration - _elapsedSeconds == 2) {
        if (mounted) HapticFeedback.heavyImpact();
      }

      if (_elapsedSeconds >= provider.maxRecordingDuration) {
        _stopRecording();
      }
    });
  }

  Future<void> _stopRecording() async {
    _countdownTimer?.cancel();
    _pulseController.stop();
    _pulseController.reset();
    HapticFeedback.lightImpact();

    final provider = context.read<InputProvider>();
    final file = await provider.stopRecording();

    // Allow even short recordings (e.g. "Lights on")
    if (file != null) {
      // NEW: Custom handler check
      if (widget.onRecordingFinished != null) {
        widget.onRecordingFinished!(file);
        // Reset provider to idle since external handler took over
        provider.clearInput();
        return;
      }

      await provider.processAudio(file);

      // Removed redundant SnackBar as SuccessToast handles feedback now.

      try {
        await file.delete();
      } catch (_) {}
    } else {
      provider.cancelRecording();
    }
  }

  void _checkAndStartPulse(InputState state) {
    if (state == InputState.processing ||
        state == InputState.enhancing ||
        state == InputState.transcribing) {
      if (!_pulseController.isAnimating) {
        _pulseController.repeat(reverse: true);
      }
    } else if (state == InputState.recording) {
      // Handled in _startRecording
    } else {
      if (!_isHolding && _pulseController.isAnimating) {
        _pulseController.stop();
        _pulseController.reset();
      }
    }
  }

  @override
  Widget build(BuildContext context) {
    return Consumer<InputProvider>(
      builder: (context, inputProvider, _) {
        final state = inputProvider.state;
        final maxDuration = inputProvider.maxRecordingDuration;
        final progress = _elapsedSeconds / maxDuration;

        // Auto-start pulse for background states
        _checkAndStartPulse(state);

        return Column(
          mainAxisSize: MainAxisSize.min,
          children: [
            // The FAB
            GestureDetector(
              onTapDown: _onTapDown,
              onTapUp: _onTapUp,
              onTapCancel: _onTapCancel,
              child: Stack(
                alignment: Alignment.center,
                children: [
                  // Hold Ring (Visual feedback for 1s hold)
                  if (_isHolding && state != InputState.recording)
                    SizedBox(
                      width: 64,
                      height: 64,
                      child: CircularProgressIndicator(
                        value:
                            null, // Indeterminate or animate 1s? For now simple
                        strokeWidth: 2,
                        valueColor: AlwaysStoppedAnimation(
                          AppColors.primary.withOpacity(0.5),
                        ),
                      ),
                    ),

                  // Pulse Effect (Recording or Thinking)
                  if (state == InputState.recording ||
                      state == InputState.processing ||
                      state == InputState.enhancing ||
                      state == InputState.transcribing)
                    ScaleTransition(
                      scale: _pulseAnimation,
                      child: Container(
                        width: 56,
                        height: 56,
                        decoration: BoxDecoration(
                          shape: BoxShape.circle,
                          color: (state == InputState.recording
                                  ? AppColors.primary
                                  : AppColors.mindfulness)
                              .withOpacity(0.3),
                        ),
                      ),
                    ),

                  // Progress Indicator (Recording)
                  if (state == InputState.recording)
                    SizedBox(
                      width: 64,
                      height: 64,
                      child: CircularProgressIndicator(
                        value: progress,
                        valueColor: const AlwaysStoppedAnimation(
                          AppColors.primary,
                        ),
                        backgroundColor: Colors.transparent,
                        strokeWidth: 4,
                      ),
                    ),

                  // Main Button Container
                  Container(
                    width: 56,
                    height: 56,
                    alignment: Alignment.center,
                    decoration: BoxDecoration(
                      gradient: !widget.isEnabled
                          ? const LinearGradient(
                              colors: [Color(0xFFE2E8F0), Color(0xFFE2E8F0)],
                            )
                          : state == InputState.error
                              ? LinearGradient(
                                  colors: [AppColors.error, AppColors.error],
                                )
                              : (state == InputState.processing ||
                                      state == InputState.enhancing ||
                                      state == InputState.transcribing)
                                  ? const LinearGradient(
                                      colors: [
                                        AppColors.mindfulness,
                                        AppColors.mindfulnessLight
                                      ],
                                    )
                                  : state == InputState.success
                                      ? LinearGradient(
                                          colors: [
                                            AppColors.success,
                                            AppColors.success
                                          ],
                                        )
                                      : AppColors.primaryGradient,
                      shape: BoxShape.circle,
                      boxShadow: [
                        if (widget.isEnabled)
                          BoxShadow(
                            color: (state == InputState.error
                                    ? AppColors.error
                                    : AppColors.primary)
                                .withOpacity(0.3),
                            blurRadius: 12,
                            offset: const Offset(0, 4),
                          ),
                      ],
                    ),
                    child: _buildIcon(state, inputProvider.activeSource),
                  ),
                ],
              ),
            ),
          ],
        );
      },
    );
  }

  Widget _buildIcon(InputState state, InputSource? activeSource) {
    if (!widget.isEnabled) {
      return Icon(
        Icons.mic_off_rounded,
        color: AppColors.textTertiary.withOpacity(0.5),
        size: 24,
      );
    }

    final isVoiceActive = activeSource == InputSource.voice;

    if (isVoiceActive &&
        (state == InputState.processing ||
            state == InputState.transcribing ||
            state == InputState.enhancing)) {
      return TweenAnimationBuilder<double>(
        tween: Tween(begin: 0.0, end: 1.0),
        duration: const Duration(seconds: 2),
        builder: (context, value, child) {
          return const Icon(
            Icons.auto_awesome_rounded,
            color: Colors.white,
            size: 28,
          );
        },
      );
    }

    if (isVoiceActive && state == InputState.success) {
      return const Icon(Icons.check_rounded, color: Colors.white, size: 28);
    }

    if (state == InputState.recording) {
      // Return mic icon (active state implied by external timer and pulse)
      return const Icon(Icons.mic, color: Colors.white, size: 28);
    }

    if (isVoiceActive && state == InputState.error) {
      return const Icon(
        Icons.error_outline_rounded,
        color: Colors.white,
        size: 28,
      );
    }

    // Idle or Recording (Recording shows mic)
    return const Icon(Icons.mic_rounded, color: Colors.white, size: 28);
  }
}
