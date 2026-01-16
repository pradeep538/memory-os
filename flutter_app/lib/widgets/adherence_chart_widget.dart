import 'package:flutter/material.dart';
import '../models/kairo_models.dart';

/// Adherence Chart Widget (Cyberpunk Style)
/// Shows 7-day completion pattern
class AdherenceChartWidget extends StatelessWidget {
  final Map<String, dynamic> chartData;

  const AdherenceChartWidget({Key? key, required this.chartData})
    : super(key: key);

  @override
  Widget build(BuildContext context) {
    final values = List<int>.from(chartData['values'] ?? [0, 0, 0, 0, 0, 0, 0]);
    final percentage = chartData['percentage'] ?? 0;

    return Container(
      padding: const EdgeInsets.all(16),
      decoration: BoxDecoration(
        color: const Color(0xFF1E293B), // Slate 800
        borderRadius: BorderRadius.circular(12),
        border: Border.all(
          color: const Color(0xFF06B6D4).withOpacity(0.3), // Cyan
          width: 1,
        ),
      ),
      child: Column(
        crossAxisAlignment: CrossAxisAlignment.start,
        mainAxisSize: MainAxisSize.min,
        children: [
          // Title
          const Text(
            'Weekly Pattern',
            style: TextStyle(
              color: Color(0xFF06B6D4),
              fontSize: 12,
              fontWeight: FontWeight.bold,
            ),
          ),

          const SizedBox(height: 12),

          // Day indicators
          Row(
            mainAxisAlignment: MainAxisAlignment.spaceEvenly,
            children: _buildDayIndicators(values),
          ),

          const SizedBox(height: 12),

          // Percentage
          Row(
            mainAxisAlignment: MainAxisAlignment.spaceBetween,
            children: [
              Text(
                '$percentage% Completion',
                style: const TextStyle(
                  color: Colors.white,
                  fontSize: 16,
                  fontWeight: FontWeight.bold,
                ),
              ),
              Icon(
                percentage >= 80 ? Icons.emoji_events : Icons.trending_up,
                color: percentage >= 80
                    ? const Color(0xFFFBBF24)
                    : const Color(0xFF3B82F6),
                size: 24,
              ),
            ],
          ),
        ],
      ),
    );
  }

  List<Widget> _buildDayIndicators(List<int> values) {
    final days = ['S', 'M', 'T', 'W', 'T', 'F', 'S'];

    return List.generate(7, (index) {
      final completed = index < values.length && values[index] == 1;

      return Column(
        children: [
          Text(
            days[index],
            style: const TextStyle(color: Colors.white54, fontSize: 10),
          ),
          const SizedBox(height: 4),
          Container(
            width: 32,
            height: 32,
            decoration: BoxDecoration(
              shape: BoxShape.circle,
              color: completed
                  ? const Color(0xFF06B6D4).withOpacity(0.2)
                  : Colors.transparent,
              border: Border.all(
                color: completed ? const Color(0xFF06B6D4) : Colors.white24,
                width: 2,
              ),
            ),
            child: completed
                ? const Icon(Icons.check, color: Color(0xFF06B6D4), size: 16)
                : null,
          ),
        ],
      );
    });
  }
}
