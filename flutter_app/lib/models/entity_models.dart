/// Entity model (Person, Place, Topic)
class Entity {
  final String id;
  final String name;
  final String type; // person, place, topic, organization
  final String? description;
  final int mentionCount;
  final DateTime? lastMentioned;
  final double sentimentScore;
  final Map<String, dynamic>? metadata;

  Entity({
    required this.id,
    required this.name,
    required this.type,
    this.description,
    required this.mentionCount,
    this.lastMentioned,
    this.sentimentScore = 0.0,
    this.metadata,
  });

  factory Entity.fromJson(Map<String, dynamic> json) {
    return Entity(
      id: json['id'] ?? '',
      name: json['name'] ?? '',
      type: json['type'] ?? 'topic',
      description: json['description'],
      mentionCount: json['mention_count'] ?? json['mentionCount'] ?? 0,
      lastMentioned: json['last_mentioned'] != null
          ? DateTime.parse(json['last_mentioned'])
          : null,
      sentimentScore:
          (json['sentiment_score'] ?? json['sentimentScore'] ?? 0.0).toDouble(),
      metadata: json['metadata'],
    );
  }
}
