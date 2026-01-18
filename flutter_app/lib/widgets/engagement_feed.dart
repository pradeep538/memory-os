import 'package:flutter/material.dart';
import '../services/engagement_service.dart';

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

  @override
  void didUpdateWidget(EngagementFeed oldWidget) {
    super.didUpdateWidget(oldWidget);
    // Reload if parent tells us to (though FeedProvider is better source of truth)
  }

  Future<void> _loadFeed() async {
    final items = await widget.engagementService.getFeed();
    if (mounted) {
      // Deduplicate based on body text + title
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
  }

  Future<void> _markRead(String id) async {
    await widget.engagementService.markRead(id);
    if (mounted) {
      setState(() {
        _items.removeWhere((item) => item.id == id);
      });
    }
  }

  @override
  Widget build(BuildContext context) {
    if (_isLoading)
      return const SizedBox.shrink(); // Don't show loader, just pop in
    if (_items.isEmpty) return const SizedBox.shrink();

    return Column(
      crossAxisAlignment: CrossAxisAlignment.start,
      children: [
        Padding(
          padding: const EdgeInsets.symmetric(horizontal: 16.0, vertical: 8.0),
          child: Text(
            'Daily Brief',
            style: Theme.of(context).textTheme.titleMedium?.copyWith(
                  fontWeight: FontWeight.bold,
                  color: Theme.of(context).colorScheme.primary,
                ),
          ),
        ),
        ListView.builder(
          shrinkWrap: true,
          physics: const NeverScrollableScrollPhysics(),
          itemCount: _items.length,
          itemBuilder: (context, index) {
            final item = _items[index];
            return Dismissible(
              key: Key(item.id),
              onDismissed: (_) => _markRead(item.id),
              child: Card(
                margin: const EdgeInsets.symmetric(
                  horizontal: 16.0,
                  vertical: 4.0,
                ),
                elevation: 2,
                shape: RoundedRectangleBorder(
                  borderRadius: BorderRadius.circular(12),
                ),
                child: ListTile(
                  leading: _getIcon(item.type),
                  title: Text(
                    (item.title.isEmpty || item.title.contains('undefined'))
                        ? _getDefaultTitle(item.type)
                        : item.title,
                    style: const TextStyle(fontWeight: FontWeight.bold),
                  ),
                  subtitle: Text(item.body),
                  trailing: IconButton(
                    icon: const Icon(Icons.check, size: 16),
                    onPressed: () => _markRead(item.id),
                  ),
                ),
              ),
            );
          },
        ),
      ],
    );
  }

  Widget _getIcon(String type) {
    switch (type) {
      case 'insight':
        return const Icon(Icons.lightbulb_outline, color: Colors.amber);
      case 'reflection':
        return const Icon(Icons.self_improvement, color: Colors.purple);
      case 'voice_replay':
        return const Icon(Icons.mic, color: Colors.teal);
      case 'pattern':
        return const Icon(Icons.analytics, color: Colors.blue);
      default:
        return const Icon(Icons.article_outlined);
    }
  }

  String _getDefaultTitle(String type) {
    switch (type) {
      case 'pattern':
        return 'Pattern Detected';
      case 'insight':
        return 'New Insight';
      case 'milestone':
        return 'Milestone Reached';
      default:
        return 'Update';
    }
  }
}
