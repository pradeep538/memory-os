import 'package:flutter/material.dart';
import '../services/engagement_service.dart';

class FeedbackToast extends StatelessWidget {
  final UserFeedback feedback;
  final VoidCallback onDismiss;

  const FeedbackToast({
    Key? key,
    required this.feedback,
    required this.onDismiss,
  }) : super(key: key);

  @override
  Widget build(BuildContext context) {
    return Positioned(
      bottom: 100,
      left: 16,
      right: 16,
      child: Material(
        color: Colors.transparent,
        child: TweenAnimationBuilder<double>(
          tween: Tween(begin: 0.0, end: 1.0),
          duration: const Duration(milliseconds: 300),
          builder: (context, value, child) {
            return Transform.translate(
              offset: Offset(0, 20 * (1 - value)),
              child: Opacity(opacity: value, child: child),
            );
          },
          child: Container(
            padding: const EdgeInsets.symmetric(horizontal: 16, vertical: 12),
            decoration: BoxDecoration(
              color: Colors.black.withOpacity(0.85),
              borderRadius: BorderRadius.circular(12),
              boxShadow: [
                BoxShadow(
                  color: Colors.black.withOpacity(0.2),
                  blurRadius: 10,
                  offset: const Offset(0, 4),
                ),
              ],
            ),
            child: Row(
              children: [
                _getIcon(),
                const SizedBox(width: 12),
                Expanded(
                  child: Text(
                    feedback.message,
                    style: const TextStyle(
                      color: Colors.white,
                      fontSize: 14,
                      fontWeight: FontWeight.bold,
                    ),
                  ),
                ),
                IconButton(
                  icon: const Icon(
                    Icons.close,
                    color: Colors.white70,
                    size: 16,
                  ),
                  onPressed: onDismiss,
                ),
              ],
            ),
          ),
        ),
      ),
    );
  }

  Widget _getIcon() {
    if (feedback.context == 'streak') {
      return const Icon(
        Icons.local_fire_department,
        color: Colors.orangeAccent,
      );
    } else if (feedback.context == 'recovery') {
      return const Icon(Icons.refresh, color: Colors.blueAccent);
    }
    return const Icon(Icons.check_circle, color: Colors.greenAccent);
  }
}
