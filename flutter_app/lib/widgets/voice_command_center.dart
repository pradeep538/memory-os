import 'package:flutter/material.dart';
import 'dart:async';

/// Voice Command Center
/// Floating mic button with glowing Cyberpunk animation
class VoiceCommandCenter extends StatefulWidget {
  final Function(String) onTextInput;
  final Function()? onVoiceStart;
  final Function()? onVoiceEnd;

  const VoiceCommandCenter({
    Key? key,
    required this.onTextInput,
    this.onVoiceStart,
    this.onVoiceEnd,
  }) : super(key: key);

  @override
  _VoiceCommandCenterState createState() => _VoiceCommandCenterState();
}

class _VoiceCommandCenterState extends State<VoiceCommandCenter>
    with SingleTickerProviderStateMixin {
  bool _isListening = false;
  bool _showKeyboard = false;
  final TextEditingController _textController = TextEditingController();
  final FocusNode _focusNode = FocusNode();

  late AnimationController _pulseController;
  late Animation<double> _pulseAnimation;

  @override
  void initState() {
    super.initState();

    // Pulse animation for listening state
    _pulseController = AnimationController(
      vsync: this,
      duration: const Duration(milliseconds: 800),
    );

    _pulseAnimation = Tween<double>(begin: 1.0, end: 1.3).animate(
      CurvedAnimation(parent: _pulseController, curve: Curves.easeInOut),
    );

    // Auto-repeat pulse
    _pulseController.addStatusListener((status) {
      if (status == AnimationStatus.completed) {
        _pulseController.reverse();
      } else if (status == AnimationStatus.dismissed) {
        _pulseController.forward();
      }
    });
  }

  void _startListening() {
    setState(() => _isListening = true);
    _pulseController.forward();
    widget.onVoiceStart?.call();

    // TODO: Start voice recording
    // For now, simulate with a delay
    Future.delayed(Duration(seconds: 2), () {
      _stopListening();
    });
  }

  void _stopListening() {
    setState(() => _isListening = false);
    _pulseController.stop();
    _pulseController.reset();
    widget.onVoiceEnd?.call();

    // TODO: Stop voice recording and transcribe
  }

  void _toggleKeyboard() {
    setState(() {
      _showKeyboard = !_showKeyboard;
      if (_showKeyboard) {
        Future.delayed(Duration(milliseconds: 100), () {
          _focusNode.requestFocus();
        });
      }
    });
  }

  void _sendText() {
    if (_textController.text.trim().isNotEmpty) {
      widget.onTextInput(_textController.text);
      _textController.clear();
      setState(() => _showKeyboard = false);
    }
  }

  @override
  void dispose() {
    _pulseController.dispose();
    _textController.dispose();
    _focusNode.dispose();
    super.dispose();
  }

  @override
  Widget build(BuildContext context) {
    return Container(
      height: _showKeyboard ? 160 : 100,
      decoration: BoxDecoration(
        gradient: LinearGradient(
          begin: Alignment.bottomCenter,
          end: Alignment.topCenter,
          colors: [
            const Color(0xFF0F172A), // Slate 900
            const Color(0xFF0F172A).withOpacity(0.0),
          ],
        ),
      ),
      child: Column(
        mainAxisAlignment: MainAxisAlignment.end,
        children: [
          // Keyboard input (slides up)
          if (_showKeyboard) _buildKeyboardInput(),

          const SizedBox(height: 12),

          // Main controls
          Row(
            mainAxisAlignment: MainAxisAlignment.center,
            children: [
              // Keyboard toggle
              _buildKeyboardButton(),

              const SizedBox(width: 20),

              // Mic button (main)
              _buildMicButton(),

              const SizedBox(width: 72), // Balance space
            ],
          ),

          const SizedBox(height: 20),
        ],
      ),
    );
  }

  Widget _buildKeyboardInput() {
    return Container(
      margin: const EdgeInsets.symmetric(horizontal: 24),
      padding: const EdgeInsets.symmetric(horizontal: 16, vertical: 8),
      decoration: BoxDecoration(
        color: const Color(0xFF1E293B), // Slate 800
        borderRadius: BorderRadius.circular(24),
        border: Border.all(
          color: const Color(0xFF06B6D4).withOpacity(0.3), // Cyan
          width: 1,
        ),
      ),
      child: Row(
        children: [
          Expanded(
            child: TextField(
              controller: _textController,
              focusNode: _focusNode,
              style: const TextStyle(color: Colors.white),
              decoration: const InputDecoration(
                hintText: 'Type a message...',
                hintStyle: TextStyle(color: Colors.white38),
                border: InputBorder.none,
              ),
              onSubmitted: (_) => _sendText(),
            ),
          ),
          IconButton(
            icon: const Icon(Icons.send, color: Color(0xFF06B6D4)),
            onPressed: _sendText,
          ),
        ],
      ),
    );
  }

  Widget _buildKeyboardButton() {
    return GestureDetector(
      onTap: _toggleKeyboard,
      child: Container(
        width: 48,
        height: 48,
        decoration: BoxDecoration(
          shape: BoxShape.circle,
          color: const Color(0xFF1E293B), // Slate 800
          border: Border.all(
            color: _showKeyboard ? const Color(0xFF06B6D4) : Colors.white10,
            width: 2,
          ),
        ),
        child: Icon(
          _showKeyboard ? Icons.close : Icons.keyboard,
          color: _showKeyboard ? const Color(0xFF06B6D4) : Colors.white54,
          size: 24,
        ),
      ),
    );
  }

  Widget _buildMicButton() {
    return GestureDetector(
      onTapDown: (_) => _startListening(),
      onTapUp: (_) => _stopListening(),
      onTapCancel: () => _stopListening(),
      child: AnimatedBuilder(
        animation: _pulseAnimation,
        builder: (context, child) {
          return Transform.scale(
            scale: _isListening ? _pulseAnimation.value : 1.0,
            child: Container(
              width: _isListening ? 80 : 72,
              height: _isListening ? 80 : 72,
              decoration: BoxDecoration(
                shape: BoxShape.circle,
                gradient: LinearGradient(
                  colors: _isListening
                      ? [
                          const Color(0xFFA855F7), // Purple
                          const Color(0xFFEC4899), // Pink
                        ]
                      : [
                          const Color(0xFF06B6D4), // Teal
                          const Color(0xFF3B82F6), // Blue
                        ],
                ),
                boxShadow: [
                  BoxShadow(
                    color:
                        (_isListening
                                ? const Color(0xFFA855F7)
                                : const Color(0xFF06B6D4))
                            .withOpacity(_isListening ? 0.6 : 0.4),
                    blurRadius: _isListening ? 30 : 20,
                    spreadRadius: _isListening ? 10 : 5,
                  ),
                ],
              ),
              child: Icon(
                _isListening ? Icons.graphic_eq : Icons.mic,
                color: Colors.white,
                size: 36,
              ),
            ),
          );
        },
      ),
    );
  }
}
