import 'package:flutter/material.dart';
import 'package:provider/provider.dart';
import '../../config/app_colors.dart';
import '../../config/app_typography.dart';
import '../../config/app_spacing.dart';
import '../../config/config.dart';
import '../../models/input_models.dart';
import '../../providers/app_provider.dart';
import '../../widgets/common/category_chip.dart';

/// Memory Explorer Screen - Browse and search all memories
class MemoriesScreen extends StatefulWidget {
  final AppCategory? initialCategory;

  const MemoriesScreen({super.key, this.initialCategory});

  @override
  State<MemoriesScreen> createState() => _MemoriesScreenState();
}

class _MemoriesScreenState extends State<MemoriesScreen> {
  final _searchController = TextEditingController();
  final _scrollController = ScrollController();

  List<Memory> _memories = [];
  bool _isLoading = true;
  bool _isLoadingMore = false;
  AppCategory? _selectedCategory;
  String _sortBy = 'recent';
  int _page = 1;
  bool _hasMore = true;

  @override
  void initState() {
    super.initState();
    _selectedCategory = widget.initialCategory;
    _loadMemories();
    _scrollController.addListener(_onScroll);
  }

  @override
  void dispose() {
    _searchController.dispose();
    _scrollController.dispose();
    super.dispose();
  }

  void _onScroll() {
    if (_scrollController.position.pixels >=
            _scrollController.position.maxScrollExtent - 200 &&
        !_isLoadingMore &&
        _hasMore) {
      _loadMoreMemories();
    }
  }

  Future<void> _loadMemories() async {
    setState(() {
      _isLoading = true;
      _page = 1;
    });

    final app = context.read<AppProvider>();
    final result = await app.memoryService.getMemories(
      category: _selectedCategory?.name,
      limit: 20,
      offset: 0,
    );

    if (result.success && mounted) {
      setState(() {
        _memories = result.data ?? [];
        _isLoading = false;
        _hasMore = (_memories.length) >= 20;
      });
    } else if (mounted) {
      setState(() {
        _isLoading = false;
      });
    }
  }

  Future<void> _loadMoreMemories() async {
    if (_isLoadingMore) return;

    setState(() {
      _isLoadingMore = true;
      _page++;
    });

    final app = context.read<AppProvider>();
    final result = await app.memoryService.getMemories(
      category: _selectedCategory?.name,
      limit: 20,
      offset: (_page - 1) * 20,
    );

    if (result.success && mounted) {
      final newMemories = result.data ?? [];
      setState(() {
        _memories.addAll(newMemories);
        _isLoadingMore = false;
        _hasMore = newMemories.length >= 20;
      });
    } else if (mounted) {
      setState(() {
        _isLoadingMore = false;
      });
    }
  }

  void _onCategorySelected(AppCategory? category) {
    setState(() {
      _selectedCategory = category;
    });
    _loadMemories();
  }

  void _onSortChanged(String sort) {
    setState(() {
      _sortBy = sort;
    });
    _sortMemories();
  }

  void _sortMemories() {
    setState(() {
      if (_sortBy == 'recent') {
        _memories.sort((a, b) => b.timestamp.compareTo(a.timestamp));
      } else if (_sortBy == 'oldest') {
        _memories.sort((a, b) => a.timestamp.compareTo(b.timestamp));
      }
    });
  }

  @override
  Widget build(BuildContext context) {
    return Scaffold(
      backgroundColor: AppColors.background,
      appBar: AppBar(
        title: const Text('Memory Explorer'),
        actions: [
          PopupMenuButton<String>(
            icon: const Icon(Icons.sort_rounded),
            onSelected: _onSortChanged,
            itemBuilder: (context) => [
              PopupMenuItem(
                value: 'recent',
                child: Row(
                  children: [
                    if (_sortBy == 'recent')
                      const Icon(Icons.check, size: 18, color: AppColors.primary),
                    if (_sortBy == 'recent') const SizedBox(width: 8),
                    const Text('Most Recent'),
                  ],
                ),
              ),
              PopupMenuItem(
                value: 'oldest',
                child: Row(
                  children: [
                    if (_sortBy == 'oldest')
                      const Icon(Icons.check, size: 18, color: AppColors.primary),
                    if (_sortBy == 'oldest') const SizedBox(width: 8),
                    const Text('Oldest First'),
                  ],
                ),
              ),
            ],
          ),
        ],
      ),
      body: Column(
        children: [
          // Search bar
          Padding(
            padding: const EdgeInsets.all(AppSpacing.md),
            child: TextField(
              controller: _searchController,
              decoration: InputDecoration(
                hintText: 'Search memories...',
                prefixIcon: const Icon(Icons.search_rounded),
                suffixIcon: _searchController.text.isNotEmpty
                    ? IconButton(
                        icon: const Icon(Icons.clear_rounded),
                        onPressed: () {
                          _searchController.clear();
                          _loadMemories();
                        },
                      )
                    : null,
              ),
              onSubmitted: (_) => _loadMemories(),
            ),
          ),

          // Category filter chips
          SizedBox(
            height: 40,
            child: ListView(
              scrollDirection: Axis.horizontal,
              padding: const EdgeInsets.symmetric(horizontal: AppSpacing.md),
              children: [
                _FilterChip(
                  label: 'All',
                  isSelected: _selectedCategory == null,
                  onTap: () => _onCategorySelected(null),
                ),
                const SizedBox(width: AppSpacing.sm),
                ...AppCategory.values.map((category) {
                  return Padding(
                    padding: const EdgeInsets.only(right: AppSpacing.sm),
                    child: _FilterChip(
                      label: category.displayName,
                      isSelected: _selectedCategory == category,
                      onTap: () => _onCategorySelected(category),
                      color: category.color,
                    ),
                  );
                }),
              ],
            ),
          ),

          const SizedBox(height: AppSpacing.md),

          // Memory list
          Expanded(
            child: _isLoading
                ? const Center(child: CircularProgressIndicator())
                : _memories.isEmpty
                    ? _buildEmptyState()
                    : RefreshIndicator(
                        onRefresh: _loadMemories,
                        child: ListView.builder(
                          controller: _scrollController,
                          padding: const EdgeInsets.symmetric(
                            horizontal: AppSpacing.md,
                          ),
                          itemCount: _memories.length + (_isLoadingMore ? 1 : 0),
                          itemBuilder: (context, index) {
                            if (index == _memories.length) {
                              return const Center(
                                child: Padding(
                                  padding: EdgeInsets.all(AppSpacing.md),
                                  child: CircularProgressIndicator(),
                                ),
                              );
                            }
                            return _MemoryCard(
                              memory: _memories[index],
                              onTap: () => _showMemoryDetail(_memories[index]),
                            );
                          },
                        ),
                      ),
          ),
        ],
      ),
    );
  }

  Widget _buildEmptyState() {
    return Center(
      child: Column(
        mainAxisAlignment: MainAxisAlignment.center,
        children: [
          Icon(
            Icons.memory_rounded,
            size: 64,
            color: AppColors.textTertiary,
          ),
          const SizedBox(height: AppSpacing.md),
          Text(
            'No memories found',
            style: AppTypography.h4.copyWith(color: AppColors.textSecondary),
          ),
          const SizedBox(height: AppSpacing.sm),
          Text(
            _selectedCategory != null
                ? 'Try a different category'
                : 'Start logging to create memories',
            style: AppTypography.body.copyWith(color: AppColors.textTertiary),
          ),
        ],
      ),
    );
  }

  void _showMemoryDetail(Memory memory) {
    showModalBottomSheet(
      context: context,
      isScrollControlled: true,
      backgroundColor: Colors.transparent,
      builder: (context) => _MemoryDetailSheet(memory: memory),
    );
  }
}

/// Filter chip widget
class _FilterChip extends StatelessWidget {
  final String label;
  final bool isSelected;
  final VoidCallback onTap;
  final Color? color;

  const _FilterChip({
    required this.label,
    required this.isSelected,
    required this.onTap,
    this.color,
  });

  @override
  Widget build(BuildContext context) {
    final effectiveColor = color ?? AppColors.primary;

    return GestureDetector(
      onTap: onTap,
      child: AnimatedContainer(
        duration: const Duration(milliseconds: 200),
        padding: const EdgeInsets.symmetric(
          horizontal: AppSpacing.md,
          vertical: AppSpacing.sm,
        ),
        decoration: BoxDecoration(
          color: isSelected ? effectiveColor : AppColors.surface,
          borderRadius: BorderRadius.circular(AppSpacing.radiusFull),
          border: Border.all(
            color: isSelected ? effectiveColor : AppColors.border,
          ),
        ),
        child: Text(
          label,
          style: AppTypography.labelSmall.copyWith(
            color: isSelected ? AppColors.textOnPrimary : AppColors.textSecondary,
          ),
        ),
      ),
    );
  }
}

/// Memory card widget
class _MemoryCard extends StatelessWidget {
  final Memory memory;
  final VoidCallback onTap;

  const _MemoryCard({
    required this.memory,
    required this.onTap,
  });

  @override
  Widget build(BuildContext context) {
    return GestureDetector(
      onTap: onTap,
      child: Container(
        margin: const EdgeInsets.only(bottom: AppSpacing.md),
        padding: const EdgeInsets.all(AppSpacing.md),
        decoration: BoxDecoration(
          color: AppColors.surface,
          borderRadius: BorderRadius.circular(AppSpacing.radiusLg),
          border: Border.all(color: AppColors.border),
        ),
        child: Column(
          crossAxisAlignment: CrossAxisAlignment.start,
          children: [
            // Header with category and time
            Row(
              children: [
                CategoryChip(category: memory.category),
                const Spacer(),
                Text(
                  memory.timeAgo,
                  style: AppTypography.caption,
                ),
              ],
            ),
            const SizedBox(height: AppSpacing.sm),

            // Content
            Text(
              memory.displayText,
              style: AppTypography.body,
              maxLines: 3,
              overflow: TextOverflow.ellipsis,
            ),

            // Metadata
            if (memory.metadata != null && memory.metadata!.isNotEmpty) ...[
              const SizedBox(height: AppSpacing.sm),
              _buildMetadata(memory),
            ],
          ],
        ),
      ),
    );
  }

  Widget _buildMetadata(Memory memory) {
    final metadata = memory.metadata!;
    final items = <Widget>[];

    if (metadata['duration_minutes'] != null) {
      items.add(_MetadataTag(
        icon: Icons.timer_outlined,
        label: '${metadata['duration_minutes']}min',
      ));
    }
    if (metadata['amount'] != null) {
      items.add(_MetadataTag(
        icon: Icons.attach_money_rounded,
        label: '\$${metadata['amount']}',
      ));
    }
    if (metadata['calories'] != null) {
      items.add(_MetadataTag(
        icon: Icons.local_fire_department_outlined,
        label: '${metadata['calories']} cal',
      ));
    }

    if (items.isEmpty) return const SizedBox.shrink();

    return Wrap(
      spacing: AppSpacing.sm,
      children: items,
    );
  }
}

class _MetadataTag extends StatelessWidget {
  final IconData icon;
  final String label;

  const _MetadataTag({
    required this.icon,
    required this.label,
  });

  @override
  Widget build(BuildContext context) {
    return Container(
      padding: const EdgeInsets.symmetric(
        horizontal: AppSpacing.sm,
        vertical: 2,
      ),
      decoration: BoxDecoration(
        color: AppColors.backgroundSecondary,
        borderRadius: BorderRadius.circular(AppSpacing.radiusSm),
      ),
      child: Row(
        mainAxisSize: MainAxisSize.min,
        children: [
          Icon(icon, size: 14, color: AppColors.textSecondary),
          const SizedBox(width: 4),
          Text(label, style: AppTypography.caption),
        ],
      ),
    );
  }
}

/// Memory detail bottom sheet
class _MemoryDetailSheet extends StatelessWidget {
  final Memory memory;

  const _MemoryDetailSheet({required this.memory});

  @override
  Widget build(BuildContext context) {
    return Container(
      decoration: const BoxDecoration(
        color: AppColors.surface,
        borderRadius: BorderRadius.vertical(
          top: Radius.circular(AppSpacing.radiusXl),
        ),
      ),
      child: Column(
        mainAxisSize: MainAxisSize.min,
        crossAxisAlignment: CrossAxisAlignment.start,
        children: [
          // Handle
          Center(
            child: Container(
              margin: const EdgeInsets.symmetric(vertical: AppSpacing.md),
              width: 40,
              height: 4,
              decoration: BoxDecoration(
                color: AppColors.border,
                borderRadius: BorderRadius.circular(2),
              ),
            ),
          ),

          Padding(
            padding: const EdgeInsets.all(AppSpacing.lg),
            child: Column(
              crossAxisAlignment: CrossAxisAlignment.start,
              children: [
                // Header
                Row(
                  children: [
                    CategoryChip(category: memory.category),
                    const Spacer(),
                    Text(
                      _formatDate(memory.timestamp),
                      style: AppTypography.caption,
                    ),
                  ],
                ),
                const SizedBox(height: AppSpacing.lg),

                // Original text
                Text('Original', style: AppTypography.label),
                const SizedBox(height: AppSpacing.xs),
                Container(
                  width: double.infinity,
                  padding: const EdgeInsets.all(AppSpacing.md),
                  decoration: BoxDecoration(
                    color: AppColors.backgroundSecondary,
                    borderRadius: BorderRadius.circular(AppSpacing.radiusMd),
                  ),
                  child: Text(
                    memory.originalText,
                    style: AppTypography.body.copyWith(
                      color: AppColors.textSecondary,
                    ),
                  ),
                ),
                const SizedBox(height: AppSpacing.lg),

                // Enhanced text
                Text('Enhanced', style: AppTypography.label),
                const SizedBox(height: AppSpacing.xs),
                Container(
                  width: double.infinity,
                  padding: const EdgeInsets.all(AppSpacing.md),
                  decoration: BoxDecoration(
                    color: AppColors.primaryLight,
                    borderRadius: BorderRadius.circular(AppSpacing.radiusMd),
                    border: Border.all(color: AppColors.primary.withAlpha(51)),
                  ),
                  child: Text(
                    memory.displayText,
                    style: AppTypography.body,
                  ),
                ),
                const SizedBox(height: AppSpacing.lg),

                // Metadata
                if (memory.metadata != null && memory.metadata!.isNotEmpty) ...[
                  Text('Details', style: AppTypography.label),
                  const SizedBox(height: AppSpacing.sm),
                  _buildDetailedMetadata(),
                  const SizedBox(height: AppSpacing.lg),
                ],

                // Confidence score
                Row(
                  children: [
                    Text('Confidence', style: AppTypography.label),
                    const Spacer(),
                    Container(
                      padding: const EdgeInsets.symmetric(
                        horizontal: AppSpacing.sm,
                        vertical: 2,
                      ),
                      decoration: BoxDecoration(
                        color: _confidenceColor.withAlpha(26),
                        borderRadius: BorderRadius.circular(AppSpacing.radiusSm),
                      ),
                      child: Text(
                        '${(memory.confidenceScore * 100).round()}%',
                        style: AppTypography.labelSmall.copyWith(
                          color: _confidenceColor,
                        ),
                      ),
                    ),
                  ],
                ),
                const SizedBox(height: AppSpacing.xl),

                // Actions
                Row(
                  children: [
                    Expanded(
                      child: OutlinedButton.icon(
                        onPressed: () => Navigator.pop(context),
                        icon: const Icon(Icons.edit_outlined, size: 18),
                        label: const Text('Edit'),
                      ),
                    ),
                    const SizedBox(width: AppSpacing.md),
                    Expanded(
                      child: ElevatedButton.icon(
                        onPressed: () => Navigator.pop(context),
                        icon: const Icon(Icons.share_outlined, size: 18),
                        label: const Text('Share'),
                      ),
                    ),
                  ],
                ),
              ],
            ),
          ),
        ],
      ),
    );
  }

  Color get _confidenceColor {
    if (memory.confidenceScore >= 0.9) return AppColors.success;
    if (memory.confidenceScore >= 0.8) return AppColors.primary;
    if (memory.confidenceScore >= 0.7) return AppColors.warning;
    return AppColors.error;
  }

  Widget _buildDetailedMetadata() {
    final metadata = memory.metadata!;
    final items = <Widget>[];

    metadata.forEach((key, value) {
      if (value != null) {
        items.add(
          Padding(
            padding: const EdgeInsets.only(bottom: AppSpacing.sm),
            child: Row(
              children: [
                Text(
                  _formatMetadataKey(key),
                  style: AppTypography.body.copyWith(
                    color: AppColors.textSecondary,
                  ),
                ),
                const Spacer(),
                Text(
                  value.toString(),
                  style: AppTypography.body.copyWith(
                    fontWeight: FontWeight.w600,
                  ),
                ),
              ],
            ),
          ),
        );
      }
    });

    return Column(children: items);
  }

  String _formatMetadataKey(String key) {
    return key.split('_').map((word) {
      return word[0].toUpperCase() + word.substring(1);
    }).join(' ');
  }

  String _formatDate(DateTime date) {
    final months = [
      'Jan', 'Feb', 'Mar', 'Apr', 'May', 'Jun',
      'Jul', 'Aug', 'Sep', 'Oct', 'Nov', 'Dec'
    ];
    return '${months[date.month - 1]} ${date.day}, ${date.year} at ${date.hour}:${date.minute.toString().padLeft(2, '0')}';
  }
}
