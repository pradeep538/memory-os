/// RPG Stats Model
class RpgStats {
  final int level;
  final int xpCurrent;
  final int xpNext;
  final double xpPercentage;
  final int streak;
  final int health;
  final String characterClass;
  final String classIcon;

  RpgStats({
    required this.level,
    required this.xpCurrent,
    required this.xpNext,
    required this.xpPercentage,
    required this.streak,
    required this.health,
    required this.characterClass,
    required this.classIcon,
  });

  factory RpgStats.fromJson(Map<String, dynamic> json) {
    return RpgStats(
      level: json['level'] ?? 1,
      xpCurrent: json['xp']?['current'] ?? 0,
      xpNext: json['xp']?['next'] ?? 1000,
      xpPercentage: (json['xp']?['percentage'] ?? 0).toDouble(),
      streak: json['streak'] ?? 0,
      health: json['health'] ?? 100,
      characterClass: json['class'] ?? 'wanderer',
      classIcon: json['classIcon'] ?? '🌟',
    );
  }

  factory RpgStats.initial() {
    return RpgStats(
      level: 1,
      xpCurrent: 0,
      xpNext: 1000,
      xpPercentage: 0,
      streak: 0,
      health: 100,
      characterClass: 'wanderer',
      classIcon: '🌟',
    );
  }
}

/// Chat Message Model
class ChatMessage {
  final String id;
  final String text;
  final DateTime timestamp;
  final bool isUser;
  final String? messageType;
  final Map<String, dynamic>? chartData;
  final String? replyTo;

  ChatMessage({
    required this.id,
    required this.text,
    required this.timestamp,
    required this.isUser,
    this.messageType,
    this.chartData,
    this.replyTo,
  });

  factory ChatMessage.fromJson(
    Map<String, dynamic> json, {
    bool isUser = false,
  }) {
    return ChatMessage(
      id: json['messageId'] ?? json['id'] ?? '',
      text: json['text'] ?? json['message'] ?? '',
      timestamp: DateTime.parse(
        json['timestamp'] ?? DateTime.now().toIso8601String(),
      ),
      isUser: isUser,
      messageType: json['messageType'],
      chartData: json['chartData'],
      replyTo: json['replyTo'],
    );
  }
}

/// Clarification Model
class Clarification {
  final String sessionId;
  final String question;
  final List<ClarificationOption> options;

  Clarification({
    required this.sessionId,
    required this.question,
    required this.options,
  });

  factory Clarification.fromJson(Map<String, dynamic> json) {
    return Clarification(
      sessionId: json['sessionId'],
      question: json['question'],
      options: (json['options'] as List)
          .map((o) => ClarificationOption.fromJson(o))
          .toList(),
    );
  }
}

/// Clarification Option Model
class ClarificationOption {
  final int id;
  final String label;
  final String? emoji;

  ClarificationOption({required this.id, required this.label, this.emoji});

  factory ClarificationOption.fromJson(Map<String, dynamic> json) {
    return ClarificationOption(
      id: json['id'],
      label: json['label'],
      emoji: json['emoji'],
    );
  }
}
