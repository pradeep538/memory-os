import 'dart:io';
import 'dart:async';
import 'package:flutter/material.dart';
import '../../services/plans_service.dart';
import '../../services/input_service.dart';
import '../../config/app_colors.dart';
import '../../widgets/input/mic_fab.dart';

class ArchitectSessionDialog extends StatefulWidget {
  final PlansService plansService;
  final InputService inputService;

  const ArchitectSessionDialog({
    Key? key,
    required this.plansService,
    required this.inputService,
  }) : super(key: key);

  @override
  _ArchitectSessionDialogState createState() => _ArchitectSessionDialogState();
}

class _ArchitectSessionDialogState extends State<ArchitectSessionDialog> {
  final List<Message> _messages = [];
  bool _isLoading = true;
  final TextEditingController _textController = TextEditingController();
  final ScrollController _scrollController = ScrollController();
  String? _sessionId;

  @override
  void initState() {
    super.initState();
    _startSession();
  }

  Future<void> _startSession() async {
    try {
      final result = await widget.plansService.startArchitectSession();
      if (result != null) {
        if (mounted) {
          setState(() {
            _sessionId = result['sessionId'];
            _messages.add(Message(text: result['message'], isUser: false));
            _isLoading = false;
          });
        }
      }
    } catch (e) {
      if (mounted) Navigator.pop(context);
    }
  }

  Future<void> _sendMessage(String text) async {
    if (text.trim().isEmpty || _sessionId == null) return;

    setState(() {
      _messages.add(Message(text: text, isUser: true));
      _isLoading = true;
    });
    _scrollToBottom();
    _textController.clear();

    try {
      final result =
          await widget.plansService.sendArchitectMessage(_sessionId!, text);
      if (result != null && mounted) {
        setState(() {
          _messages.add(Message(text: result['message'], isUser: false));
          _isLoading = false;
        });
        _scrollToBottom();

        if (result['isComplete'] == true && result['blueprint'] != null) {
          // Blueprint created!
          await Future.delayed(const Duration(seconds: 2));
          if (mounted) Navigator.pop(context, true); // Return success
        }
      }
    } catch (e) {
      if (mounted) setState(() => _isLoading = false);
    }
  }

  Future<void> _handleAudio(File audioFile) async {
    setState(() => _isLoading = true);
    try {
      // 1. Transcribe audio
      final transcription =
          await widget.inputService.transcribeAudio(audioFile);
      if (transcription.success && transcription.data != null) {
        final text = transcription.data!.text;
        // 2. Send as text message
        await _sendMessage(text);
      } else {
        if (mounted) {
          setState(() {
            _isLoading = false;
            _messages.add(Message(
                text: "Sorry, I couldn't hear that clearly.", isUser: false));
          });
        }
      }
    } catch (e) {
      if (mounted) setState(() => _isLoading = false);
    }
  }

  void _scrollToBottom() {
    WidgetsBinding.instance.addPostFrameCallback((_) {
      if (_scrollController.hasClients) {
        _scrollController.animateTo(
          _scrollController.position.maxScrollExtent,
          duration: const Duration(milliseconds: 300),
          curve: Curves.easeOut,
        );
      }
    });
  }

  @override
  Widget build(BuildContext context) {
    // 80% of screen height
    return Container(
      height: MediaQuery.of(context).size.height * 0.85,
      decoration: BoxDecoration(
        color: AppColors.surface,
        borderRadius: const BorderRadius.vertical(top: Radius.circular(24)),
      ),
      child: Column(
        children: [
          // Handle
          const SizedBox(height: 12),
          Container(
            width: 40,
            height: 4,
            decoration: BoxDecoration(
                color: Colors.grey[300],
                borderRadius: BorderRadius.circular(2)),
          ),
          const SizedBox(height: 16),

          // Header
          Padding(
            padding: const EdgeInsets.symmetric(horizontal: 24),
            child: Row(
              mainAxisAlignment: MainAxisAlignment.spaceBetween,
              children: [
                Column(
                  crossAxisAlignment: CrossAxisAlignment.start,
                  children: [
                    Text("Blueprint Architect",
                        style: TextStyle(
                            color: AppColors.textPrimary,
                            fontSize: 20,
                            fontWeight: FontWeight.bold)),
                    Text("Design with Kairo",
                        style: TextStyle(
                            color: AppColors.primary,
                            fontSize: 12,
                            fontWeight: FontWeight.w600)),
                  ],
                ),
                IconButton(
                    icon: const Icon(Icons.close),
                    onPressed: () => Navigator.pop(context)),
              ],
            ),
          ),
          const Divider(),

          // Chat Area
          Expanded(
            child: ListView.builder(
              controller: _scrollController,
              padding: const EdgeInsets.all(16),
              itemCount: _messages.length,
              itemBuilder: (context, index) {
                final msg = _messages[index];
                return Align(
                  alignment:
                      msg.isUser ? Alignment.centerRight : Alignment.centerLeft,
                  child: Container(
                    margin: const EdgeInsets.only(bottom: 12),
                    padding: const EdgeInsets.all(12),
                    constraints: BoxConstraints(
                        maxWidth: MediaQuery.of(context).size.width * 0.75),
                    decoration: BoxDecoration(
                      color:
                          msg.isUser ? AppColors.primary : AppColors.background,
                      borderRadius: BorderRadius.only(
                        topLeft: const Radius.circular(12),
                        topRight: const Radius.circular(12),
                        bottomLeft: msg.isUser
                            ? const Radius.circular(12)
                            : Radius.zero,
                        bottomRight: msg.isUser
                            ? Radius.zero
                            : const Radius.circular(12),
                      ),
                    ),
                    child: Text(
                      msg.text,
                      style: TextStyle(
                          color: msg.isUser
                              ? Colors.white
                              : AppColors.textPrimary),
                    ),
                  ),
                );
              },
            ),
          ),

          if (_isLoading)
            const Padding(
              padding: EdgeInsets.all(8.0),
              child: LinearProgressIndicator(
                  minHeight: 2, color: AppColors.primary),
            ),

          // Input Area
          Padding(
            padding: EdgeInsets.only(
                left: 16,
                right: 16,
                top: 8,
                bottom: MediaQuery.of(context).viewInsets.bottom + 16),
            child: Row(
              children: [
                MicFab(
                  isCompact: true,
                  onRecordingFinished: _handleAudio,
                ),
                const SizedBox(width: 12),
                Expanded(
                  child: TextField(
                    controller: _textController,
                    decoration: InputDecoration(
                      hintText: "Describe your goal...",
                      filled: true,
                      fillColor: AppColors.background,
                      border: OutlineInputBorder(
                          borderRadius: BorderRadius.circular(24),
                          borderSide: BorderSide.none),
                      contentPadding:
                          const EdgeInsets.symmetric(horizontal: 16),
                    ),
                    onSubmitted: _sendMessage,
                  ),
                ),
                IconButton(
                  icon: const Icon(Icons.send, color: AppColors.primary),
                  onPressed: () => _sendMessage(_textController.text),
                ),
              ],
            ),
          ),
        ],
      ),
    );
  }
}

class Message {
  final String text;
  final bool isUser;
  Message({required this.text, required this.isUser});
}
