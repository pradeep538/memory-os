import 'package:flutter/material.dart';
import 'package:provider/provider.dart';
import 'package:chatview/chatview.dart';
import '../providers/kairo_state.dart';
import '../widgets/rpg_micro_dashboard.dart';
import '../widgets/voice_command_center.dart';
import '../widgets/adherence_chart_widget.dart';
import '../models/kairo_models.dart' as kairo_models;

/// Kairo Chat Screen
/// Cyberpunk Zen chat interface with RPG header and voice-first input
class KairoChatScreen extends StatefulWidget {
  final String userId;

  const KairoChatScreen({
    Key? key,
    required this.userId,
  }) : super(key: key);

  @override
  _KairoChatScreenState createState() => _KairoChatScreenState();
}

class _KairoChatScreenState extends State<KairoChatScreen> {
  late ChatController _chatController;

  @override
  void initState() {
    super.initState();

    // Initialize chatview controller (chatview 2.4.0 API)
    _chatController = ChatController(
      initialMessageList: [],
      scrollController: ScrollController(),
      currentUser: ChatUser(id: widget.userId, name: 'You'),
      otherUsers: [ChatUser(id: 'kairo_bot', name: 'Kairo')],
    );

    // Connect WebSocket
    WidgetsBinding.instance.addPostFrameCallback((_) {
      context.read<KairoState>().connectWebSocket(widget.userId);
    });
  }

  @override
  Widget build(BuildContext context) {
    return Scaffold(
      backgroundColor: const Color(0xFF0F172A), // Slate 900
      body: SafeArea(
        child: Stack(
          children: [
            // Main column
            Column(
              children: [
                // RPG Header
                Consumer<KairoState>(
                  builder: (context, kairo, child) {
                    return RpgMicroDashboard(
                      stats: kairo.stats,
                      onTap: () {
                        // TODO: Show full stats modal
                      },
                    );
                  },
                ),

                // Chat messages
                Expanded(
                  child: _buildChatView(),
                ),

                // Spacer for voice dock
                const SizedBox(height: 100),
              ],
            ),

            // Voice Command Center (floating)
            Positioned(
              bottom: 0,
              left: 0,
              right: 0,
              child: Consumer<KairoState>(
                builder: (context, kairo, child) {
                  return VoiceCommandCenter(
                    onTextInput: kairo.sendMessage,
                    onVoiceStart: () {
                      print('🎤 Voice started');
                    },
                    onVoiceEnd: () {
                      print('🎤 Voice ended');
                    },
                  );
                },
              ),
            ),
          ],
        ),
      ),
    );
  }

  Widget _buildChatView() {
    return Consumer<KairoState>(
      builder: (context, kairo, child) {
        // Convert Kairo messages to chatview messages (chatview 2.2.0 API)
        final chatViewMessages = kairo.messages.map((msg) {
          return Message(
            id: msg.id,
            message: msg.text,
            createdAt: msg.timestamp,
            sentBy:
                msg.isUser ? widget.userId : 'kairo_bot', // Changed from sendBy
            messageType: msg.messageType == 'chart'
                ? MessageType.custom
                : MessageType.text,
          );
        }).toList();

        // Update chat controller if messages changed
        if (chatViewMessages.isNotEmpty) {
          _chatController.initialMessageList = chatViewMessages.cast<Message>();
        }

        return Container(
          color: const Color(0xFF0F172A),
          child: ChatView(
            // currentUser removed in 2.2.0
            chatController: _chatController,
            chatViewState: chatViewMessages.isEmpty
                ? ChatViewState.noData
                : ChatViewState.hasMessages,

            // Styling (Cyberpunk Zen)
            chatBubbleConfig: ChatBubbleConfiguration(
              inComingChatBubbleConfig: ChatBubble(
                color: const Color(0xFF1E293B), // Slate 800
                textStyle: const TextStyle(color: Colors.white),
                borderRadius: const BorderRadius.only(
                  topLeft: Radius.circular(16),
                  topRight: Radius.circular(16),
                  bottomRight: Radius.circular(16),
                ),
              ),
              outgoingChatBubbleConfig: ChatBubble(
                color: const Color(0xFF06B6D4), // Cyan
                textStyle: const TextStyle(color: Colors.black),
                borderRadius: const BorderRadius.only(
                  topLeft: Radius.circular(16),
                  topRight: Radius.circular(16),
                  bottomLeft: Radius.circular(16),
                ),
              ),
            ),

            // Background
            chatBackgroundConfig: ChatBackgroundConfiguration(
              backgroundColor: const Color(0xFF0F172A),
            ),

            // Custom message builder for charts
            messageConfig: MessageConfiguration(
              customMessageBuilder: (message) {
                // Find corresponding Kairo message
                final kairoMsg = kairo.messages.firstWhere(
                  (m) => m.id == message.id,
                  orElse: () => kairo_models.ChatMessage(
                    id: message.id,
                    text: message.message,
                    timestamp: message.createdAt,
                    isUser: false,
                  ),
                );

                if (kairoMsg.chartData != null) {
                  return AdherenceChartWidget(
                    chartData: kairoMsg.chartData!,
                  );
                }

                return const SizedBox.shrink(); // Use default text bubble
              },
            ),

            // Typing indicator removed in 2.2.0 API

            // onSendTap - required (3 params in 2.4.0)
            onSendTap: (message, replyTo, messageType) {
              // Not using default input - handled by Voice Command Center
            },
          ),
        );
      },
    );
  }
}
