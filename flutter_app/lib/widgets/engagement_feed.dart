import 'dart:async';
import 'package:flutter/material.dart';
import 'package:provider/provider.dart';
import '../providers/input_provider.dart';
import '../services/engagement_service.dart';
import '../config/app_colors.dart';
import '../config/app_typography.dart';
import '../config/app_spacing.dart';
import 'common/base_card.dart';

class EngagementFeed extends StatefulWidget {
  final EngagementService engagementService;

  const EngagementFeed({Key? key, required this.engagementService})
      : super(key: key);

  @override
  State<EngagementFeed> createState() => _EngagementFeedState();
}

class _EngagementFeedState extends State<EngagementFeed> {
  List<FeedItem> _items = [];
  bool _isLoading = true;

  @override
  void initState() {
    super.initState();
    _loadFeed();
  }

  Future<void> _loadFeed() async {
    try {
      final items = await widget.engagementService.getFeed().timeout(
            const Duration(seconds: 5),
            onTimeout: () => [],
          );

      if (mounted) {
        // Simple deduplication
        final uniqueItems = <FeedItem>[];
        final seenContent = <String>{};

        for (var item in items) {
          final key = '${item.title}|${item.body}';
          if (!seenContent.contains(key)) {
            seenContent.add(key);
            uniqueItems.add(item);
          }
        }

        setState(() {
          _items = uniqueItems;
          _isLoading = false;
        });
      }
    } catch (e) {
      if (mounted) {
        setState(() {
          _isLoading = false;
        });
      }
      debugPrint('Error loading feed: $e');
    }
  }

  Future<void> _markRead(String id) async {
    try {
      await widget.engagementService.markRead(id);
      if (mounted) {
        setState(() {
          _items.removeWhere((item) => item.id == id);
        });
      }
    } catch (e) {
      debugPrint('Error marking feed item as read: $e');
    }
  }

  @override
  Widget build(BuildContext context) {
    if (_isLoading) {
      return const Padding(
        padding: EdgeInsets.all(AppSpacing.xl),
        child: Center(child: CircularProgressIndicator(strokeWidth: 2)),
      );
    }

    return Column(
      crossAxisAlignment: CrossAxisAlignment.start,
      children: [
        Padding(
          padding: const EdgeInsets.fromLTRB(20, 16, 20, 4),
          child: Text(
            "Daily Brief",
            style: AppTypography.h3.copyWith(
              color: AppColors.mindfulness,
              fontSize: 18,
            ),
          ),
        ),
        if (_items.isEmpty)
          const Padding(
            padding: EdgeInsets.symmetric(horizontal: 16.0, vertical: 8.0),
            child: _AnimatedNudge(),
          )
        else
          ListView.builder(
            shrinkWrap: true,
            physics: const NeverScrollableScrollPhysics(),
            itemCount: _items.length,
            itemBuilder: (context, index) {
              final item = _items[index];

              return Padding(
                padding:
                    const EdgeInsets.symmetric(horizontal: 16.0, vertical: 6.0),
                child: Dismissible(
                  key: Key(item.id),
                  onDismissed: (_) => _markRead(item.id),
                  child: BaseCard(
                    padding: const EdgeInsets.all(AppSpacing.cardPadding),
                    child: Row(
                      crossAxisAlignment: CrossAxisAlignment.start,
                      children: [
                        _getContainerIcon(item.type),
                        const SizedBox(width: AppSpacing.md),
                        Expanded(
                          child: Column(
                            crossAxisAlignment: CrossAxisAlignment.start,
                            children: [
                              Text(
                                item.title,
                                style: AppTypography.widgetTitle,
                              ),
                              const SizedBox(height: AppSpacing.xs),
                              Text(
                                item.body,
                                style: AppTypography.bodySmall,
                              ),
                            ],
                          ),
                        ),
                        IconButton(
                          padding: EdgeInsets.zero,
                          constraints: const BoxConstraints(),
                          icon: const Icon(Icons.close,
                              size: 18, color: AppColors.textTertiary),
                          onPressed: () => _markRead(item.id),
                        ),
                      ],
                    ),
                  ),
                ),
              );
            },
          ),
      ],
    );
  }

  Widget _getContainerIcon(String type) {
    Color color;
    IconData icon;

    switch (type) {
      case 'insight':
        color = AppColors.warning;
        icon = Icons.lightbulb_outline;
        break;
      case 'reflection':
        color = AppColors.mindfulness;
        icon = Icons.self_improvement;
        break;
      case 'voice_replay':
        color = AppColors.primary;
        icon = Icons.mic;
        break;
      case 'pattern':
        color = AppColors.info;
        icon = Icons.analytics_outlined;
        break;
      default:
        color = AppColors.generic;
        icon = Icons.article_outlined;
    }

    return Container(
      padding: const EdgeInsets.all(8),
      decoration: BoxDecoration(
        color: color.withOpacity(0.1),
        borderRadius: BorderRadius.circular(8),
      ),
      child: Icon(icon, color: color, size: 20),
    );
  }
}

class _AnimatedNudge extends StatefulWidget {
  const _AnimatedNudge();

  @override
  State<_AnimatedNudge> createState() => _AnimatedNudgeState();
}

class _AnimatedNudgeState extends State<_AnimatedNudge>
    with SingleTickerProviderStateMixin {
  late AnimationController _controller;
  int _promptIndex = 0;
  Timer? _timer;

  final List<String> _prompts = [
    "Tell me about your morning...",
    "How was that workout today?",
    "Any big ideas we should save?",
    "What are you thinking about?",
    "Let's record a quick thought."
  ];

  @override
  void initState() {
    super.initState();
    _controller = AnimationController(
      vsync: this,
      duration: const Duration(seconds: 2),
    )..repeat();

    _timer = Timer.periodic(const Duration(seconds: 4), (timer) {
      if (mounted) {
        setState(() {
          _promptIndex = (_promptIndex + 1) % _prompts.length;
        });
      }
    });
  }

  @override
  void dispose() {
    _controller.dispose();
    _timer?.cancel();
    super.dispose();
  }

  @override
  Widget build(BuildContext context) {
    return BaseCard(
      padding: const EdgeInsets.symmetric(horizontal: 20, vertical: 24),
      onTap: () async {
        final provider = context.read<InputProvider>();
        final hasPerm = await provider.hasPermission();

        if (!hasPerm) {
          await provider.requestPermission();
          if (mounted) {
            ScaffoldMessenger.of(context).showSnackBar(
              const SnackBar(
                content: Text(
                    "Microphone ready! Now hold the button below to speak."),
                duration: Duration(seconds: 3),
                behavior: SnackBarBehavior.floating,
              ),
            );
          }
        } else {
          ScaffoldMessenger.of(context).showSnackBar(
            const SnackBar(
              content: Text("I'm listening! What would you like to capture?"),
              duration: Duration(seconds: 2),
            ),
          );
        }
      },
      child: Row(
        children: [
          // Fixed size container for Talking Human Silhouette & Directional Waves
          SizedBox(
            width: 80,
            height: 80,
            child: Stack(
              alignment: Alignment.centerLeft,
              children: [
                // Directional Talking Waves
                ...List.generate(3, (index) {
                  return AnimatedBuilder(
                    animation: _controller,
                    builder: (context, child) {
                      final progress = (_controller.value + index / 3) % 1.0;
                      return Positioned(
                        left: 45 + (progress * 25),
                        child: Opacity(
                          opacity: (1 - progress),
                          child: Icon(
                            Icons.graphic_eq_rounded,
                            color: AppColors.primary.withOpacity(0.5),
                            size: 16 + (progress * 12),
                          ),
                        ),
                      );
                    },
                  );
                }),
                // Side-faced Human Profile Icon
                Container(
                  padding: const EdgeInsets.all(12),
                  decoration: BoxDecoration(
                    color: AppColors.primary.withOpacity(0.1),
                    shape: BoxShape.circle,
                  ),
                  child: const Icon(
                    Icons.record_voice_over_rounded,
                    color: AppColors.primary,
                    size: 32,
                  ),
                ),
              ],
            ),
          ),
          const SizedBox(width: 8),
          // Rotating Prompts
          Expanded(
            child: Column(
              crossAxisAlignment: CrossAxisAlignment.start,
              mainAxisSize: MainAxisSize.min,
              children: [
                Text(
                  "What's on your mind?",
                  style: AppTypography.widgetTitle.copyWith(
                    color: AppColors.primaryDark,
                    letterSpacing: 0.2,
                  ),
                ),
                const SizedBox(height: 6),
                AnimatedSwitcher(
                  duration: const Duration(milliseconds: 500),
                  transitionBuilder: (child, animation) {
                    return FadeTransition(
                      opacity: animation,
                      child: SlideTransition(
                        position: Tween<Offset>(
                          begin: const Offset(0, 0.2),
                          end: Offset.zero,
                        ).animate(animation),
                        child: child,
                      ),
                    );
                  },
                  child: Text(
                    _prompts[_promptIndex],
                    key: ValueKey<int>(_promptIndex),
                    style: AppTypography.bodySmall.copyWith(
                      color: AppColors.textSecondary,
                      fontStyle: FontStyle.italic,
                    ),
                  ),
                ),
              ],
            ),
          ),
        ],
      ),
    );
  }
}
