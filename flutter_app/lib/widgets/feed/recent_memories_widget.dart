import 'package:flutter/material.dart';
import '../../config/app_colors.dart';
import '../../config/app_typography.dart';
import '../../config/app_spacing.dart';
import '../../models/input_models.dart';
import '../common/base_card.dart';
import '../common/category_chip.dart';

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
    return GestureDetector(
      onTap: onTap,
      behavior: HitTestBehavior.opaque,
      child: Padding(
        padding: const EdgeInsets.symmetric(vertical: AppSpacing.sm),
        child: Row(
          crossAxisAlignment: CrossAxisAlignment.start,
          children: [
            // Category indicator
            Container(
              width: 4,
              height: 40,
              decoration: BoxDecoration(
                color: AppColors.getCategoryColor(memory.category),
                borderRadius: BorderRadius.circular(2),
              ),
            ),
            const SizedBox(width: AppSpacing.md),

            // Content
            Expanded(
              child: Column(
                crossAxisAlignment: CrossAxisAlignment.start,
                children: [
                  Text(
                    memory.displayText,
                    style: AppTypography.body,
                    maxLines: 2,
                    overflow: TextOverflow.ellipsis,
                  ),
                  const SizedBox(height: AppSpacing.xs),
                  Row(
                    children: [
                      CategoryChip(
                        category: memory.category,
                        compact: true,
                        showIcon: false,
                      ),
                      const SizedBox(width: AppSpacing.sm),
                      Text(
                        _getTimeAgo(memory.createdAt),
                        style: AppTypography.caption,
                      ),
                      if (memory.source == 'voice') ...[
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
