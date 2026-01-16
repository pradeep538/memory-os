import 'package:flutter/material.dart';
import '../models/kairo_models.dart';

/// Clarification Widget
/// Shows options when input is ambiguous
class ClarificationWidget extends StatelessWidget {
  final Clarification clarification;
  final Function(int) onSelect;

  const ClarificationWidget({
    Key? key,
    required this.clarification,
    required this.onSelect,
  }) : super(key: key);

  @override
  Widget build(BuildContext context) {
    return Container(
      margin: const EdgeInsets.symmetric(horizontal: 16, vertical: 8),
      padding: const EdgeInsets.all(16),
      decoration: BoxDecoration(
        color: const Color(0xFF1E293B), // Slate 800
        borderRadius: BorderRadius.circular(16),
        border: Border.all(
          color: const Color(0xFFF59E0B).withOpacity(0.5), // Amber
          width: 2,
        ),
      ),
      child: Column(
        crossAxisAlignment: CrossAxisAlignment.start,
        mainAxisSize: MainAxisSize.min,
        children: [
          // Question
          Row(
            children: [
              const Icon(
                Icons.help_outline,
                color: Color(0xFFF59E0B),
                size: 20,
              ),
              const SizedBox(width: 8),
              Expanded(
                child: Text(
                  clarification.question,
                  style: const TextStyle(
                    color: Colors.white,
                    fontSize: 14,
                    fontWeight: FontWeight.w600,
                  ),
                ),
              ),
            ],
          ),

          const SizedBox(height: 12),

          // Options
          Wrap(
            spacing: 8,
            runSpacing: 8,
            children: clarification.options.map((option) {
              return _buildOptionButton(option);
            }).toList(),
          ),
        ],
      ),
    );
  }

  Widget _buildOptionButton(ClarificationOption option) {
    return Material(
      color: Colors.transparent,
      child: InkWell(
        borderRadius: BorderRadius.circular(20),
        onTap: () => onSelect(option.id),
        child: Container(
          padding: const EdgeInsets.symmetric(
            horizontal: 16,
            vertical: 10,
          ),
          decoration: BoxDecoration(
            color: const Color(0xFF334155), // Slate 700
            borderRadius: BorderRadius.circular(20),
            border: Border.all(
              color: const Color(0xFF06B6D4).withOpacity(0.3),
              width: 1,
            ),
          ),
          child: Row(
            mainAxisSize: MainAxisSize.min,
            children: [
              if (option.emoji != null) ...[
                Text(
                  option.emoji!,
                  style: const TextStyle(fontSize: 16),
                ),
                const SizedBox(width: 6),
              ],
              Text(
                option.label,
                style: const TextStyle(
                  color: Colors.white,
                  fontSize: 13,
                ),
              ),
            ],
          ),
        ),
      ),
    );
  }
}
