import 'package:flutter/material.dart';
import '../models/kairo_models.dart';

/// RPG Micro Dashboard Header
/// Always-visible stats: Level, XP, Streak, Health
class RpgMicroDashboard extends StatelessWidget {
  final RpgStats stats;
  final VoidCallback? onTap;

  const RpgMicroDashboard({Key? key, required this.stats, this.onTap})
    : super(key: key);

  @override
  Widget build(BuildContext context) {
    return GestureDetector(
      onTap: onTap,
      child: Container(
        height: 70,
        padding: const EdgeInsets.symmetric(horizontal: 16, vertical: 8),
        decoration: const BoxDecoration(
          color: Color(0xFF0F172A), // Slate 900
          border: Border(bottom: BorderSide(color: Colors.white10, width: 1)),
        ),
        child: Row(
          mainAxisAlignment: MainAxisAlignment.spaceBetween,
          children: [
            // Left: Avatar + Level
            _buildAvatarSection(),

            // Right: Stats
            _buildStatsSection(),
          ],
        ),
      ),
    );
  }

  Widget _buildAvatarSection() {
    return Row(
      children: [
        // Avatar with class icon
        Container(
          width: 48,
          height: 48,
          decoration: BoxDecoration(
            shape: BoxShape.circle,
            gradient: LinearGradient(
              colors: [_getClassColor(), _getClassColor().withOpacity(0.6)],
            ),
            border: Border.all(color: Colors.white24, width: 2),
          ),
          child: Center(
            child: Text(stats.classIcon, style: const TextStyle(fontSize: 24)),
          ),
        ),

        const SizedBox(width: 12),

        // Level + XP Bar
        Column(
          mainAxisAlignment: MainAxisAlignment.center,
          crossAxisAlignment: CrossAxisAlignment.start,
          children: [
            Text(
              'Lvl ${stats.level}',
              style: const TextStyle(
                color: Colors.white,
                fontSize: 16,
                fontWeight: FontWeight.bold,
              ),
            ),
            const SizedBox(height: 4),
            // XP Progress Bar
            Container(
              width: 60,
              height: 6,
              decoration: BoxDecoration(
                color: Colors.white10,
                borderRadius: BorderRadius.circular(3),
              ),
              child: FractionallySizedBox(
                alignment: Alignment.centerLeft,
                widthFactor: stats.xpPercentage / 100,
                child: Container(
                  decoration: BoxDecoration(
                    gradient: const LinearGradient(
                      colors: [Color(0xFF06B6D4), Color(0xFF3BFFF4)], // Cyan
                    ),
                    borderRadius: BorderRadius.circular(3),
                  ),
                ),
              ),
            ),
          ],
        ),
      ],
    );
  }

  Widget _buildStatsSection() {
    return Row(
      children: [
        // Streak
        _buildStatChip(
          icon: Icons.local_fire_department,
          iconColor: _getStreakColor(),
          value: '${stats.streak}',
        ),

        const SizedBox(width: 16),

        // Health
        _buildStatChip(
          icon: Icons.shield,
          iconColor: _getHealthColor(),
          value: '${stats.health}%',
        ),
      ],
    );
  }

  Widget _buildStatChip({
    required IconData icon,
    required Color iconColor,
    required String value,
  }) {
    return Row(
      children: [
        Icon(icon, color: iconColor, size: 20),
        const SizedBox(width: 4),
        Text(
          value,
          style: const TextStyle(
            color: Colors.white,
            fontSize: 14,
            fontWeight: FontWeight.w600,
          ),
        ),
      ],
    );
  }

  Color _getClassColor() {
    switch (stats.characterClass) {
      case 'healer':
        return const Color(0xFF22C55E); // Green
      case 'warrior':
        return const Color(0xFFEF4444); // Red
      case 'mage':
        return const Color(0xFF8B5CF6); // Purple
      case 'merchant':
        return const Color(0xFFF59E0B); // Amber
      case 'monk':
        return const Color(0xFF06B6D4); // Cyan
      case 'guardian':
        return const Color(0xFF3B82F6); // Blue
      default:
        return const Color(0xFF6B7280); // Gray
    }
  }

  Color _getStreakColor() {
    if (stats.streak >= 30) return const Color(0xFFF59E0B); // Amber
    if (stats.streak >= 7) return const Color(0xFFEF4444); // Red
    if (stats.streak >= 3) return const Color(0xFFFB923C); // Orange
    return const Color(0xFF9CA3AF); // Gray
  }

  Color _getHealthColor() {
    if (stats.health >= 80) return const Color(0xFF22C55E); // Green
    if (stats.health >= 60) return const Color(0xFFFBBF24); // Yellow
    return const Color(0xFFEF4444); // Red
  }
}
