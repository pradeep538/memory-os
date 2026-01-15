/// Insight/Pattern model
class Insight {
  final String id;
  final String type; // frequency, correlation, trend, anomaly, warning, gap, achievement, milestone, recommendation
  final String category;
  final String headline;
  final String? description;
  final double confidenceScore;
  final bool isNew;
  final bool isActionable;
  final Map<String, dynamic>? metadata;
  final DateTime? lastUpdated;
  final String? suggestion;

  Insight({
    required this.id,
    required this.type,
    required this.category,
    required this.headline,
    this.description,
    required this.confidenceScore,
    required this.isNew,
    required this.isActionable,
    this.metadata,
    this.lastUpdated,
    this.suggestion,
  });

  factory Insight.fromJson(Map<String, dynamic> json) {
    return Insight(
      id: json['id'] ?? '',
      type: json['type'] ?? json['pattern_type'] ?? 'trend',
      category: json['category'] ?? 'generic',
      headline: json['headline'] ?? json['title'] ?? json['insight'] ?? '',
      description: json['description'] ?? json['detail'],
      confidenceScore: (json['confidence_score'] ?? json['confidenceScore'] ?? 0.0).toDouble(),
      isNew: json['is_new'] ?? json['isNew'] ?? false,
      isActionable: json['is_actionable'] ?? json['isActionable'] ?? false,
      metadata: json['metadata'] as Map<String, dynamic>?,
      lastUpdated: json['last_updated'] != null
          ? DateTime.parse(json['last_updated'])
          : null,
      suggestion: json['suggestion'] ?? json['action'],
    );
  }

  /// Alias for headline
  String get title => headline;

  /// Alias for isActionable
  bool? get actionable => isActionable;
}

/// Pattern detected by analytics
class Pattern {
  final String id;
  final String patternType;
  final String? category;
  final String description;
  final double confidenceScore;
  final bool isActionable;
  final Map<String, dynamic>? examples;
  final DateTime createdAt;
  final String? frequency;
  final String? trend;

  Pattern({
    required this.id,
    required this.patternType,
    this.category,
    required this.description,
    required this.confidenceScore,
    required this.isActionable,
    this.examples,
    required this.createdAt,
    this.frequency,
    this.trend,
  });

  factory Pattern.fromJson(Map<String, dynamic> json) {
    return Pattern(
      id: json['id'] ?? '',
      patternType: json['pattern_type'] ?? json['patternType'] ?? 'frequency',
      category: json['category'],
      description: json['description'] ?? '',
      confidenceScore: (json['confidence_score'] ?? json['confidenceScore'] ?? 0.0).toDouble(),
      isActionable: json['is_actionable'] ?? json['isActionable'] ?? false,
      examples: json['examples'] as Map<String, dynamic>?,
      createdAt: json['created_at'] != null
          ? DateTime.parse(json['created_at'])
          : DateTime.now(),
      frequency: json['frequency'],
      trend: json['trend'],
    );
  }

  /// Alias for patternType
  String get type => patternType;

  /// Alias for description
  String get title => description;

  /// Alias for confidenceScore
  double get confidence => confidenceScore;
}
