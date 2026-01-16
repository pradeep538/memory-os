import 'package:flutter/material.dart';
import 'package:provider/provider.dart';
import '../providers/kairo_state.dart';
import '../widgets/rpg_micro_dashboard.dart';
import '../widgets/adherence_chart_widget.dart';
import '../models/kairo_models.dart';

/// Kairo Chat Screen
/// Custom lightweight implementation (No external chat packages)
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
  final TextEditingController _textController = TextEditingController();
  final ScrollController _scrollController = ScrollController();

  @override
  void initState() {
    super.initState();
    // Connect WebSocket
    WidgetsBinding.instance.addPostFrameCallback((_) {
      context.read<KairoState>().connectWebSocket(widget.userId);
    });
  }

  void _scrollToBottom() {
    if (_scrollController.hasClients) {
      _scrollController.animateTo(
        _scrollController.position.maxScrollExtent,
        duration: const Duration(milliseconds: 300),
        curve: Curves.easeOut,
      );
    }
  }

  void _handleSend() {
    final text = _textController.text.trim();
    if (text.isNotEmpty) {
      context.read<KairoState>().sendMessage(text);
      _textController.clear();
      // Scroll to bottom after frame
      Future.delayed(const Duration(milliseconds: 100), _scrollToBottom);
    }
  }

  @override
  Widget build(BuildContext context) {
    return Scaffold(
      backgroundColor: const Color(0xFF0F172A), // Slate 900
      appBar: AppBar(
        backgroundColor: Colors.transparent,
        elevation: 0,
        title: const Text('Partner with Kairo',
            style: TextStyle(color: Colors.white, fontSize: 16)),
        leading: IconButton(
          icon: const Icon(Icons.arrow_back, color: Colors.white),
          onPressed: () => Navigator.pop(context),
        ),
      ),
      body: SafeArea(
        child: Column(
          children: [
            // RPG Header (Optional context)
            Consumer<KairoState>(
              builder: (context, kairo, child) {
                return RpgMicroDashboard(
                  stats: kairo.stats,
                  onTap: () {},
                );
              },
            ),

            // Message List
            Expanded(
              child: Consumer<KairoState>(
                builder: (context, kairo, _) {
                  if (kairo.messages.isNotEmpty) {
                    Future.delayed(Duration.zero, _scrollToBottom);
                  }

                  return ListView.builder(
                    controller: _scrollController,
                    padding: const EdgeInsets.all(16),
                    itemCount: kairo.messages.length,
                    itemBuilder: (context, index) {
                      final msg = kairo.messages[index];
                      return _buildMessageBubble(msg);
                    },
                  );
                },
              ),
            ),

            // Input Area
            Container(
              padding: const EdgeInsets.all(16),
              color: const Color(0xFF1E293B),
              child: Row(
                children: [
                  Expanded(
                    child: TextField(
                      controller: _textController,
                      style: const TextStyle(color: Colors.white),
                      decoration: InputDecoration(
                        hintText: 'Type your goal...',
                        hintStyle: const TextStyle(color: Colors.white38),
                        border: OutlineInputBorder(
                          borderRadius: BorderRadius.circular(24),
                          borderSide: BorderSide.none,
                        ),
                        filled: true,
                        fillColor: const Color(0xFF0F172A),
                        contentPadding: const EdgeInsets.symmetric(
                            horizontal: 20, vertical: 12),
                      ),
                      onSubmitted: (_) => _handleSend(),
                    ),
                  ),
                  const SizedBox(width: 8),
                  IconButton(
                    icon: const Icon(Icons.send, color: Color(0xFF06B6D4)),
                    onPressed: _handleSend,
                  ),
                ],
              ),
            ),
          ],
        ),
      ),
    );
  }

  Widget _buildMessageBubble(ChatMessage msg) {
    // Check for Plan Preview Card
    if (msg.messageType == 'plan_generated' && msg.planData != null) {
      return _buildPlanPreviewCard(msg);
    }

    // Check for Charts
    if (msg.chartData != null) {
      return Align(
        alignment: Alignment.centerLeft,
        child: Container(
          margin: const EdgeInsets.only(bottom: 12),
          width: MediaQuery.of(context).size.width * 0.8,
          child: AdherenceChartWidget(chartData: msg.chartData!),
        ),
      );
    }

    // Standard Text Bubble
    return Align(
      alignment: msg.isUser ? Alignment.centerRight : Alignment.centerLeft,
      child: Container(
        margin: const EdgeInsets.only(bottom: 12),
        padding: const EdgeInsets.symmetric(horizontal: 16, vertical: 12),
        constraints:
            BoxConstraints(maxWidth: MediaQuery.of(context).size.width * 0.75),
        decoration: BoxDecoration(
          color: msg.isUser ? const Color(0xFF06B6D4) : const Color(0xFF1E293B),
          borderRadius: BorderRadius.only(
            topLeft: const Radius.circular(16),
            topRight: const Radius.circular(16),
            bottomLeft: Radius.circular(msg.isUser ? 16 : 4),
            bottomRight: Radius.circular(msg.isUser ? 4 : 16),
          ),
        ),
        child: Text(
          msg.text,
          style: TextStyle(
            color: msg.isUser ? Colors.black : Colors.white,
            fontSize: 15,
          ),
        ),
      ),
    );
  }

  Widget _buildPlanPreviewCard(ChatMessage msg) {
    final plan = msg.planData!;
    final planData = plan['plan_data'] as Map<String, dynamic>;

    return Align(
      alignment: Alignment.centerLeft,
      child: Container(
        margin: const EdgeInsets.only(bottom: 12),
        width: MediaQuery.of(context).size.width * 0.85,
        padding: const EdgeInsets.all(16),
        decoration: BoxDecoration(
            color: const Color(0xFF1E293B), // Slate 800
            borderRadius: BorderRadius.circular(16),
            border: Border.all(color: const Color(0xFF06B6D4).withOpacity(0.5)),
            boxShadow: [
              BoxShadow(
                  color: const Color(0xFF06B6D4).withOpacity(0.1),
                  blurRadius: 10,
                  offset: const Offset(0, 4))
            ]),
        child: Column(
          crossAxisAlignment: CrossAxisAlignment.start,
          children: [
            Row(
              children: [
                const Icon(Icons.rocket_launch_rounded,
                    color: Color(0xFF06B6D4)),
                const SizedBox(width: 8),
                Expanded(
                    child: Text(
                  plan['plan_name'] ?? 'Action Plan',
                  style: const TextStyle(
                      fontWeight: FontWeight.bold,
                      color: Colors.white,
                      fontSize: 16),
                  overflow: TextOverflow.ellipsis,
                )),
              ],
            ),
            const SizedBox(height: 8),
            Text(
              planData['description'] ?? 'Your custom plan is ready.',
              style: const TextStyle(color: Colors.white70, fontSize: 13),
            ),
            const Divider(color: Colors.white10, height: 24),
            SizedBox(
              width: double.infinity,
              child: ElevatedButton(
                onPressed: () {
                  Navigator.pushNamed(context, '/plans');
                },
                style: ElevatedButton.styleFrom(
                  backgroundColor: const Color(0xFF06B6D4),
                  foregroundColor: Colors.white,
                  shape: RoundedRectangleBorder(
                      borderRadius: BorderRadius.circular(8)),
                ),
                child: const Text('Review & Start Plan'),
              ),
            )
          ],
        ),
      ),
    );
  }
}
