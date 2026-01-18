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
  late Animation<double> _shimmerAnimation;

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
    _shimmerAnimation = Tween<double>(begin: -1.0, end: 2.0).animate(
      CurvedAnimation(parent: _pulseController, curve: Curves.linear),
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

  void _onTapDown(TapDownDetails details) async {
    if (!widget.isEnabled || _isHolding) return;

    // Set holding state EARLY so onTapCancel can clear it if a dialog ruins the focus
    setState(() => _isHolding = true);

    final provider = context.read<InputProvider>();
    final hasPerm = await provider.hasPermission();

    if (!mounted) return;

    // If permission was denied OR if the gesture was cancelled (e.g. by focus loss during dialog)
    if (!hasPerm || !_isHolding) {
      if (_isHolding) setState(() => _isHolding = false);

      // If we were interrupted by a dialog but now have permission,
      // show a guided message instead of auto-starting.
      if (hasPerm && !_isHolding) {
        ScaffoldMessenger.of(context).showSnackBar(
          const SnackBar(
            content: Text("Microphone ready! Now hold the button to speak."),
            duration: Duration(seconds: 3),
            behavior: SnackBarBehavior.floating,
          ),
        );
      }
      return;
    }

    // Feedback that we are starting the hold timer
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

    // Discard recordings < 0.5s (likely ghost recordings or accidental taps)
    if (_elapsedSeconds < 1 && file != null) {
      // If duration is 0 (less than a second), check if it's really useful
      // Usually ghost recordings are 0-0.3s.
      debugPrint('🎙️ Recording too short (${_elapsedSeconds}s). Discarding.');
      await file.delete();
      provider.cancelRecording();
      return;
    }

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

      try {
        await file.delete();
      } catch (_) {}
    } else {
      // If file is null, we might be in Realtime mode (handled in provider)
      // Only cancel if we are still in recording state.
      // If already 'processing', let provider handle completion.
      if (provider.state == InputState.recording) {
        provider.cancelRecording();
      }
    }
  }

  void _checkAndStartPulse(InputState state) {
    if (state == InputState.recording) {
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

                  // Pulse Effect (Only during Recording)
                  if (state == InputState.recording)
                    ScaleTransition(
                      scale: _pulseAnimation,
                      child: Container(
                        width: 56,
                        height: 56,
                        decoration: BoxDecoration(
                          shape: BoxShape.circle,
                          color: AppColors.primary.withOpacity(0.3),
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

                  AnimatedBuilder(
                    animation: _shimmerAnimation,
                    builder: (context, child) {
                      return AnimatedContainer(
                        duration: const Duration(milliseconds: 600),
                        curve: Curves.elasticOut,
                        width: (state == InputState.processing ||
                                state == InputState.enhancing ||
                                state == InputState.transcribing)
                            ? 170 // Slightly more room
                            : 56,
                        height: 56,
                        alignment: Alignment.center,
                        decoration: BoxDecoration(
                          gradient: !widget.isEnabled
                              ? const LinearGradient(
                                  colors: [
                                    Color(0xFFE2E8F0),
                                    Color(0xFFE2E8F0)
                                  ],
                                )
                              : state == InputState.error
                                  ? LinearGradient(
                                      colors: [
                                        AppColors.error,
                                        AppColors.error
                                      ],
                                    )
                                  : (state == InputState.processing ||
                                          state == InputState.enhancing ||
                                          state == InputState.transcribing)
                                      ? LinearGradient(
                                          begin: Alignment.topLeft,
                                          end: Alignment.bottomRight,
                                          colors: [
                                            AppColors.primary,
                                            AppColors.primaryLight
                                                .withOpacity(0.6),
                                            AppColors.primary,
                                          ],
                                          stops: [
                                            (_shimmerAnimation.value - 0.3)
                                                .clamp(0.0, 1.0),
                                            _shimmerAnimation.value
                                                .clamp(0.0, 1.0),
                                            (_shimmerAnimation.value + 0.3)
                                                .clamp(0.0, 1.0),
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
                          borderRadius: (state == InputState.processing ||
                                  state == InputState.enhancing ||
                                  state == InputState.transcribing)
                              ? BorderRadius.circular(20)
                              : BorderRadius.circular(28),
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
                        child: child,
                      );
                    },
                    child: Center(
                      child: Row(
                        mainAxisAlignment: MainAxisAlignment.center,
                        children: [
                          _buildIcon(state, inputProvider.activeSource),
                          if (state == InputState.processing ||
                              state == InputState.enhancing ||
                              state == InputState.transcribing) ...[
                            const SizedBox(width: 12),
                            Flexible(
                              child: Text(
                                inputProvider.statusMessage ?? 'Analyzing...',
                                style: const TextStyle(
                                  color: Colors.white,
                                  fontSize: 13,
                                  fontWeight: FontWeight.bold,
                                  letterSpacing: 0.2,
                                ),
                                maxLines: 1,
                                overflow: TextOverflow.clip,
                              ),
                            ),
                          ],
                        ],
                      ),
                    ),
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
      return ConstrainedBox(
        constraints: const BoxConstraints(minWidth: 28),
        child: _VerticalAnalysisIcon(),
      );
    }

    if (isVoiceActive && state == InputState.success) {
      return const Icon(Icons.check_rounded, color: Colors.white, size: 28);
    }

    if (state == InputState.recording) {
      return const Icon(Icons.mic, color: Colors.white, size: 28);
    }

    if (isVoiceActive && state == InputState.error) {
      return const Icon(
        Icons.error_outline_rounded,
        color: Colors.white,
        size: 28,
      );
    }

    return const Icon(Icons.mic_rounded, color: Colors.white, size: 28);
  }
}

/// A vertical animated frequency line for analysis state
class _VerticalAnalysisIcon extends StatefulWidget {
  @override
  State<_VerticalAnalysisIcon> createState() => _VerticalAnalysisIconState();
}

class _VerticalAnalysisIconState extends State<_VerticalAnalysisIcon>
    with SingleTickerProviderStateMixin {
  late AnimationController _controller;

  @override
  void initState() {
    super.initState();
    _controller = AnimationController(
      vsync: this,
      duration: const Duration(milliseconds: 600),
    )..repeat(reverse: true);
  }

  @override
  void dispose() {
    _controller.dispose();
    super.dispose();
  }

  @override
  Widget build(BuildContext context) {
    return Row(
      mainAxisSize: MainAxisSize.min,
      children: List.generate(3, (index) {
        return AnimatedBuilder(
          animation: _controller,
          builder: (context, child) {
            final delay = index * 0.2;
            final val =
                (Curves.easeInOut.transform((_controller.value + delay) % 1.0));
            return Container(
              width: 3.5,
              height: 10 + (10 * val),
              margin: const EdgeInsets.symmetric(horizontal: 1.5),
              decoration: BoxDecoration(
                color: Colors.white,
                borderRadius: BorderRadius.circular(2),
              ),
            );
          },
        );
      }),
    );
  }
}
