import 'package:flutter/material.dart';
import 'package:provider/provider.dart';
import '../../config/app_colors.dart';
import '../../config/app_typography.dart';
import '../../config/app_spacing.dart';
import '../../config/config.dart';
import '../../providers/input_provider.dart';
import '../common/category_chip.dart';
import '../common/confidence_indicator.dart';

/// Confirmation overlay for low-confidence inputs
class ConfirmationOverlay extends StatefulWidget {
  const ConfirmationOverlay({super.key});

  @override
  State<ConfirmationOverlay> createState() => _ConfirmationOverlayState();
}

class _ConfirmationOverlayState extends State<ConfirmationOverlay>
    with SingleTickerProviderStateMixin {
  late AnimationController _animationController;
  late Animation<double> _slideAnimation;
  late Animation<double> _fadeAnimation;

  final _textController = TextEditingController();
  bool _isEditing = false;
  String? _selectedCategory;

  @override
  void initState() {
    super.initState();
    _animationController = AnimationController(
      duration: const Duration(milliseconds: 300),
      vsync: this,
    );
    _slideAnimation = Tween<double>(begin: 1.0, end: 0.0).animate(
      CurvedAnimation(parent: _animationController, curve: Curves.easeOut),
    );
    _fadeAnimation = Tween<double>(begin: 0.0, end: 1.0).animate(
      CurvedAnimation(parent: _animationController, curve: Curves.easeOut),
    );
    _animationController.forward();

    // Initialize with pending result
    WidgetsBinding.instance.addPostFrameCallback((_) {
      final result = context.read<InputProvider>().pendingResult;
      if (result != null) {
        _textController.text = result.enhancedText;
        _selectedCategory = result.detectedCategory;
      }
    });
  }

  @override
  void dispose() {
    _animationController.dispose();
    _textController.dispose();
    super.dispose();
  }

  void _dismiss() {
    _animationController.reverse().then((_) {
      context.read<InputProvider>().cancelConfirmation();
    });
  }

  void _confirm() async {
    final inputProvider = context.read<InputProvider>();
    await inputProvider.confirmInput(
      editedText: _textController.text,
      category: _selectedCategory,
    );
  }

  void _toggleEdit() {
    setState(() {
      _isEditing = !_isEditing;
    });
  }

  @override
  Widget build(BuildContext context) {
    return Consumer<InputProvider>(
      builder: (context, inputProvider, _) {
        final result = inputProvider.pendingResult;
        if (result == null) return const SizedBox.shrink();

        final isProcessing = inputProvider.state == InputState.processing;

        return AnimatedBuilder(
          animation: _animationController,
          builder: (context, child) {
            return Stack(
              children: [
                // Backdrop
                GestureDetector(
                  onTap: _dismiss,
                  child: FadeTransition(
                    opacity: _fadeAnimation,
                    child: Container(color: AppColors.overlay),
                  ),
                ),

                // Content card
                Positioned(
                  left: AppSpacing.md,
                  right: AppSpacing.md,
                  bottom:
                      AppSpacing.xl +
                      (MediaQuery.of(context).size.height *
                          _slideAnimation.value *
                          0.5),
                  child: FadeTransition(
                    opacity: _fadeAnimation,
                    child: _buildCard(result, isProcessing),
                  ),
                ),
              ],
            );
          },
        );
      },
    );
  }

  Widget _buildCard(dynamic result, bool isProcessing) {
    final confidence = result.confidenceScore;
    final rawInput = result.rawInput ?? '';
    final suggestions = result.suggestions as List<String>?;
    final isLowConfidence = confidence < Config.lowConfidenceThreshold;

    return Container(
      padding: const EdgeInsets.all(AppSpacing.lg),
      decoration: BoxDecoration(
        color: AppColors.surface,
        borderRadius: BorderRadius.circular(AppSpacing.radiusXl),
        boxShadow: [
          BoxShadow(
            color: AppColors.textPrimary.withOpacity(0.16),
            blurRadius: 32,
            offset: const Offset(0, 8),
          ),
        ],
      ),
      child: Column(
        mainAxisSize: MainAxisSize.min,
        crossAxisAlignment: CrossAxisAlignment.start,
        children: [
          // Header
          Row(
            children: [
              Container(
                padding: const EdgeInsets.all(8),
                decoration: BoxDecoration(
                  color: AppColors.primary.withOpacity(0.1),
                  shape: BoxShape.circle,
                ),
                child: const Icon(
                  Icons.question_answer_rounded,
                  color: AppColors.primary,
                  size: 20,
                ),
              ),
              const SizedBox(width: AppSpacing.sm),
              Text('Review', style: AppTypography.h4),
              const Spacer(),
              ConfidenceIndicator(confidence: confidence),
            ],
          ),
          const SizedBox(height: AppSpacing.lg),

          // Question (Raw Input)
          if (rawInput.isNotEmpty) ...[
            Row(
              children: [
                Text(
                  'Question',
                  style: AppTypography.label.copyWith(
                    color: AppColors.textSecondary,
                  ),
                ),
                const SizedBox(width: AppSpacing.xs),
                const Icon(
                  Icons.mic_none_rounded,
                  size: 14,
                  color: AppColors.textSecondary,
                ),
              ],
            ),
            const SizedBox(height: AppSpacing.xs),
            Container(
              width: double.infinity,
              padding: const EdgeInsets.all(AppSpacing.md),
              decoration: BoxDecoration(
                color: AppColors.background,
                borderRadius: BorderRadius.circular(AppSpacing.radiusMd),
              ),
              child: Text(
                rawInput,
                style: AppTypography.body.copyWith(
                  fontStyle: FontStyle.italic,
                  color: AppColors.textPrimary.withOpacity(0.8),
                ),
              ),
            ),
            const SizedBox(height: AppSpacing.md),
          ],

          // Answer / Log (Enhanced Text)
          Row(
            children: [
              Text(
                'Answer / Log',
                style: AppTypography.label.copyWith(
                  color: AppColors.textSecondary,
                ),
              ),
              const SizedBox(width: AppSpacing.xs),
              const Icon(
                Icons.auto_awesome_rounded,
                size: 14,
                color: AppColors.primary,
              ),
            ],
          ),
          const SizedBox(height: AppSpacing.xs),
          Container(
            decoration: BoxDecoration(
              color: _isEditing
                  ? AppColors.inputFill
                  : AppColors.backgroundSecondary,
              borderRadius: BorderRadius.circular(AppSpacing.radiusMd),
              border: _isEditing
                  ? Border.all(color: AppColors.primary, width: 2)
                  : Border.all(color: AppColors.borderLight),
            ),
            child: TextField(
              controller: _textController,
              enabled: _isEditing && !isProcessing,
              style: AppTypography.body,
              maxLines: null, // Allow multiline expansion
              minLines: 2,
              decoration: const InputDecoration(
                border: InputBorder.none,
                contentPadding: EdgeInsets.all(AppSpacing.md),
              ),
            ),
          ),
          const SizedBox(height: AppSpacing.md),

          // Category selector
          Row(
            children: [
              Text('Category:', style: AppTypography.caption),
              const SizedBox(width: AppSpacing.sm),
              CategoryChip(category: _selectedCategory ?? 'generic'),
              const Spacer(),
              if (!_isEditing)
                TextButton.icon(
                  onPressed: isProcessing ? null : _toggleEdit,
                  icon: const Icon(Icons.edit_rounded, size: 18),
                  label: const Text('Edit'),
                  style: TextButton.styleFrom(
                    foregroundColor: AppColors.primary,
                    padding: const EdgeInsets.symmetric(
                      horizontal: AppSpacing.sm,
                    ),
                  ),
                ),
            ],
          ),

          // Suggestions for very low confidence
          if (isLowConfidence &&
              suggestions != null &&
              suggestions.isNotEmpty) ...[
            const SizedBox(height: AppSpacing.md),
            Text('Did you mean:', style: AppTypography.caption),
            const SizedBox(height: AppSpacing.sm),
            Wrap(
              spacing: AppSpacing.sm,
              runSpacing: AppSpacing.sm,
              children: suggestions.map((suggestion) {
                return GestureDetector(
                  onTap: () {
                    setState(() {
                      _textController.text = suggestion;
                    });
                  },
                  child: Container(
                    padding: const EdgeInsets.symmetric(
                      horizontal: AppSpacing.md,
                      vertical: AppSpacing.sm,
                    ),
                    decoration: BoxDecoration(
                      color: AppColors.inputFill,
                      borderRadius: BorderRadius.circular(AppSpacing.radiusMd),
                      border: Border.all(color: AppColors.border),
                    ),
                    child: Text(suggestion, style: AppTypography.bodySmall),
                  ),
                );
              }).toList(),
            ),
          ],

          const SizedBox(height: AppSpacing.lg),

          // Action buttons
          Row(
            children: [
              // Cancel
              Expanded(
                child: OutlinedButton(
                  onPressed: isProcessing ? null : _dismiss,
                  child: const Text('Cancel'),
                ),
              ),
              const SizedBox(width: AppSpacing.md),

              // Confirm
              Expanded(
                flex: 2,
                child: ElevatedButton(
                  onPressed: isProcessing ? null : _confirm,
                  child: isProcessing
                      ? const SizedBox(
                          width: 20,
                          height: 20,
                          child: CircularProgressIndicator(
                            strokeWidth: 2,
                            valueColor: AlwaysStoppedAnimation<Color>(
                              AppColors.textOnPrimary,
                            ),
                          ),
                        )
                      : const Text('Confirm'),
                ),
              ),
            ],
          ),
        ],
      ),
    );
  }
}

/// Success toast shown after memory creation
class SuccessToast extends StatefulWidget {
  final String text;
  final VoidCallback? onUndo;
  final VoidCallback? onView;

  const SuccessToast({super.key, required this.text, this.onUndo, this.onView});

  @override
  State<SuccessToast> createState() => _SuccessToastState();
}

class _SuccessToastState extends State<SuccessToast>
    with SingleTickerProviderStateMixin {
  late AnimationController _controller;
  late Animation<Offset> _slideAnimation;

  @override
  void initState() {
    super.initState();
    _controller = AnimationController(
      duration: const Duration(milliseconds: 300),
      vsync: this,
    );
    _slideAnimation = Tween<Offset>(
      begin: const Offset(0, 1),
      end: Offset.zero,
    ).animate(CurvedAnimation(parent: _controller, curve: Curves.easeOut));
    _controller.forward();
  }

  @override
  void dispose() {
    _controller.dispose();
    super.dispose();
  }

  @override
  Widget build(BuildContext context) {
    return SlideTransition(
      position: _slideAnimation,
      child: Container(
        margin: const EdgeInsets.all(AppSpacing.md),
        padding: const EdgeInsets.symmetric(
          horizontal: AppSpacing.md,
          vertical: AppSpacing.sm,
        ),
        decoration: BoxDecoration(
          color: AppColors.success,
          borderRadius: BorderRadius.circular(AppSpacing.radiusMd),
          boxShadow: [
            BoxShadow(
              color: AppColors.success.withOpacity(0.3),
              blurRadius: 12,
              offset: const Offset(0, 4),
            ),
          ],
        ),
        child: Row(
          children: [
            const Icon(
              Icons.check_circle_rounded,
              color: AppColors.textOnPrimary,
              size: 20,
            ),
            const SizedBox(width: AppSpacing.sm),
            Expanded(
              child: Column(
                mainAxisSize: MainAxisSize.min,
                crossAxisAlignment: CrossAxisAlignment.start,
                children: [
                  Text(
                    'Logged!',
                    style: AppTypography.label.copyWith(
                      color: AppColors.textOnPrimary,
                    ),
                  ),
                  Text(
                    widget.text,
                    style: AppTypography.caption.copyWith(
                      color: AppColors.textOnPrimary.withOpacity(0.9),
                    ),
                    maxLines: 1,
                    overflow: TextOverflow.ellipsis,
                  ),
                ],
              ),
            ),
            if (widget.onUndo != null)
              TextButton(
                onPressed: widget.onUndo,
                style: TextButton.styleFrom(
                  foregroundColor: AppColors.textOnPrimary,
                  padding: const EdgeInsets.symmetric(
                    horizontal: AppSpacing.sm,
                  ),
                ),
                child: const Text('Undo'),
              ),
            if (widget.onView != null)
              TextButton(
                onPressed: widget.onView,
                style: TextButton.styleFrom(
                  foregroundColor: AppColors.textOnPrimary,
                  padding: const EdgeInsets.symmetric(
                    horizontal: AppSpacing.sm,
                  ),
                ),
                child: const Text('View'),
              ),
          ],
        ),
      ),
    );
  }
}
