import 'package:flutter/material.dart';
import '../../config/app_colors.dart';
import '../../config/app_typography.dart';
import '../../config/app_spacing.dart';
import '../../models/input_models.dart';
import '../common/base_card.dart';
import '../common/category_chip.dart';
import '../common/shimmer_loading.dart';

/// Recent memories widget showing latest logged entries
class RecentMemoriesWidget extends StatelessWidget {
  final List<Memory> memories;
  final VoidCallback? onTap;
  final Function(Memory)? onMemoryTap;

  const RecentMemoriesWidget({
    super.key,
    required this.memories,
    this.onTap,
    this.onMemoryTap,
  });

  @override
  Widget build(BuildContext context) {
    return BaseCard(
      onTap: onTap,
      child: Column(
        crossAxisAlignment: CrossAxisAlignment.start,
        children: [
          // Header
          Row(
            children: [
              Container(
                padding: const EdgeInsets.all(AppSpacing.sm),
                decoration: BoxDecoration(
                  color: AppColors.info.withOpacity(0.15),
                  borderRadius: BorderRadius.circular(AppSpacing.radiusSm),
                ),
                child: const Icon(
                  Icons.history_rounded,
                  color: AppColors.info,
                  size: 20,
                ),
              ),
              const SizedBox(width: AppSpacing.md),
              Expanded(
                child: Text(
                  'Recent Memories',
                  style: AppTypography.widgetTitle,
                ),
              ),
              Icon(
                Icons.chevron_right_rounded,
                color: AppColors.textTertiary,
              ),
            ],
          ),

          if (memories.isNotEmpty) ...[
            const SizedBox(height: AppSpacing.md),

            // Memory list (show max 5)
            ...memories.take(5).map((memory) => _MemoryRow(
                  memory: memory,
                  onTap: () => onMemoryTap?.call(memory),
                )),
          ] else ...[
            const SizedBox(height: AppSpacing.lg),
            Center(
              child: Column(
                children: [
                  Icon(
                    Icons.note_add_rounded,
                    size: 32,
                    color: AppColors.textTertiary,
                  ),
                  const SizedBox(height: AppSpacing.sm),
                  Text(
                    'No memories yet',
                    style: AppTypography.body.copyWith(
                      color: AppColors.textTertiary,
                    ),
                  ),
                  const SizedBox(height: AppSpacing.xs),
                  Text(
                    'Start logging with voice or text',
                    style: AppTypography.caption,
                  ),
                ],
              ),
            ),
          ],
        ],
      ),
    );
  }
}

class _MemoryRow extends StatelessWidget {
  final Memory memory;
  final VoidCallback? onTap;

  const _MemoryRow({
    required this.memory,
    this.onTap,
  });

  @override
  Widget build(BuildContext context) {
    // Check if it's the specific placeholder we want to animate
    final bool isProcessing = memory.rawInput == '[Realtime Audio]';

    return GestureDetector(
      onTap: isProcessing ? null : onTap, // Disable tap while processing
      behavior: HitTestBehavior.opaque,
      child: Padding(
        padding: const EdgeInsets.symmetric(vertical: AppSpacing.sm),
        child: Row(
          crossAxisAlignment: CrossAxisAlignment.start,
          children: [
            // Category indicator
            Container(
              width: 4,
              height: 44, // Slightly taller
              decoration: BoxDecoration(
                color: isProcessing
                    ? AppColors.primary.withOpacity(0.5)
                    : AppColors.getCategoryColor(memory.category),
                borderRadius: BorderRadius.circular(2),
              ),
            ),
            const SizedBox(width: AppSpacing.md),

            // Content
            Expanded(
              child: Column(
                crossAxisAlignment: CrossAxisAlignment.start,
                children: [
                  if (isProcessing) ...[
                    // Shimmer lines instead of text
                    const ShimmerLoading(width: 200, height: 14),
                    const SizedBox(height: 6),
                    const ShimmerLoading(width: 140, height: 14),
                  ] else ...[
                    Text(
                      memory.displayText,
                      style: AppTypography.body,
                      maxLines: 2,
                      overflow: TextOverflow.ellipsis,
                    ),
                  ],
                  const SizedBox(height: AppSpacing.sm),
                  Row(
                    children: [
                      if (isProcessing) ...[
                        // Custom processing chip
                        Container(
                          padding: const EdgeInsets.symmetric(
                            horizontal: 8,
                            vertical: 4,
                          ),
                          decoration: BoxDecoration(
                            color: AppColors.primary.withOpacity(0.1),
                            borderRadius: BorderRadius.circular(4),
                            border: Border.all(
                              color: AppColors.primary.withOpacity(0.2),
                            ),
                          ),
                          child: Row(
                            mainAxisSize: MainAxisSize.min,
                            children: [
                              const SizedBox(
                                width: 10,
                                height: 10,
                                child: CircularProgressIndicator(
                                  strokeWidth: 2,
                                  valueColor: AlwaysStoppedAnimation<Color>(
                                      AppColors.primary),
                                ),
                              ),
                              const SizedBox(width: 6),
                              Text(
                                'AI processing...',
                                style: AppTypography.caption.copyWith(
                                  color: AppColors.primary,
                                  fontWeight: FontWeight.bold,
                                ),
                              ),
                            ],
                          ),
                        ),
                      ] else ...[
                        CategoryChip(
                          category: memory.category,
                          compact: true,
                          showIcon: false,
                        ),
                      ],
                      const SizedBox(width: AppSpacing.sm),
                      Text(
                        _getTimeAgo(memory.createdAt),
                        style: AppTypography.caption,
                      ),
                      if (memory.source == 'voice' && !isProcessing) ...[
                        const SizedBox(width: AppSpacing.sm),
                        Icon(
                          Icons.mic_rounded,
                          size: 12,
                          color: AppColors.textTertiary,
                        ),
                      ],
                    ],
                  ),
                ],
              ),
            ),
          ],
        ),
      ),
    );
  }

  String _getTimeAgo(DateTime dateTime) {
    final now = DateTime.now();
    final diff = now.difference(dateTime);

    if (diff.inMinutes < 1) return 'Just now';
    if (diff.inMinutes < 60) return '${diff.inMinutes}m ago';
    if (diff.inHours < 24) return '${diff.inHours}h ago';
    if (diff.inDays < 7) return '${diff.inDays}d ago';
    return '${dateTime.day}/${dateTime.month}';
  }
}
