/// Input processing result from backend
class InputResult {
  final bool needsConfirmation;
  final String? rawInput;
  final String enhancedText;
  final String detectedCategory;
  final Map<String, dynamic> detectedEntities;
  final double confidenceScore;
  final String? reasoning;
  final List<String>? suggestions;
  final Memory? memory;

  InputResult({
    required this.needsConfirmation,
    this.rawInput,
    required this.enhancedText,
    required this.detectedCategory,
    required this.detectedEntities,
    required this.confidenceScore,
    this.reasoning,
    this.suggestions,
    this.memory,
  });

  factory InputResult.fromJson(Map<String, dynamic> json) {
    return InputResult(
      needsConfirmation: json['needs_confirmation'] ?? json['needsConfirmation'] ?? false,
      rawInput: json['raw_input'] ?? json['rawInput'],
      enhancedText: json['enhanced_text'] ?? json['enhancedText'] ?? '',
      detectedCategory: json['detected_category'] ?? json['detectedCategory'] ?? 'generic',
      detectedEntities: Map<String, dynamic>.from(
        json['detected_entities'] ?? json['detectedEntities'] ?? {},
      ),
      confidenceScore: (json['confidence_score'] ?? json['confidenceScore'] ?? 0.0).toDouble(),
      reasoning: json['reasoning'],
      suggestions: json['suggestions'] != null
          ? List<String>.from(json['suggestions'])
          : null,
      memory: json['memory'] != null ? Memory.fromJson(json['memory']) : null,
    );
  }
}

/// Confirmation result after user confirms input
class ConfirmResult {
  final bool success;
  final Memory? memory;
  final String? message;

  ConfirmResult({
    required this.success,
    this.memory,
    this.message,
  });

  factory ConfirmResult.fromJson(Map<String, dynamic> json) {
    return ConfirmResult(
      success: json['success'] ?? false,
      memory: json['memory'] != null ? Memory.fromJson(json['memory']) : null,
      message: json['message'],
    );
  }
}

/// Audio input result including transcription
class AudioInputResult {
  final String transcription;
  final String enhancedText;
  final String detectedCategory;
  final Map<String, dynamic> detectedEntities;
  final double confidenceScore;
  final bool needsConfirmation;
  final String? audioQuality;
  final VoiceQuota? quota;
  final Memory? memory;

  AudioInputResult({
    required this.transcription,
    required this.enhancedText,
    required this.detectedCategory,
    required this.detectedEntities,
    required this.confidenceScore,
    required this.needsConfirmation,
    this.audioQuality,
    this.quota,
    this.memory,
  });

  factory AudioInputResult.fromJson(Map<String, dynamic> json) {
    return AudioInputResult(
      transcription: json['transcription'] ?? '',
      enhancedText: json['enhanced_text'] ?? json['enhancedText'] ?? '',
      detectedCategory: json['detected_category'] ?? json['detectedCategory'] ?? 'generic',
      detectedEntities: Map<String, dynamic>.from(
        json['detected_entities'] ?? json['detectedEntities'] ?? {},
      ),
      confidenceScore: (json['confidence_score'] ?? json['confidenceScore'] ?? 0.0).toDouble(),
      needsConfirmation: json['needs_confirmation'] ?? json['needsConfirmation'] ?? false,
      audioQuality: json['audio_quality'] ?? json['audioQuality'],
      quota: json['quota'] != null ? VoiceQuota.fromJson(json['quota']) : null,
      memory: json['memory'] != null ? Memory.fromJson(json['memory']) : null,
    );
  }
}

/// Voice quota information
class VoiceQuota {
  final int used;
  final int remaining;
  final int limit;
  final String tier;
  final DateTime? resetsAt;

  VoiceQuota({
    required this.used,
    required this.remaining,
    required this.limit,
    required this.tier,
    this.resetsAt,
  });

  factory VoiceQuota.fromJson(Map<String, dynamic> json) {
    return VoiceQuota(
      used: json['used'] ?? 0,
      remaining: json['remaining'] ?? 0,
      limit: json['limit'] ?? 3,
      tier: json['tier'] ?? 'free',
      resetsAt: json['resets_at'] != null
          ? DateTime.parse(json['resets_at'])
          : null,
    );
  }

  bool get hasQuota => remaining > 0;
  double get usagePercent => limit > 0 ? used / limit : 0;
}

/// Memory unit (referenced in input results)
class Memory {
  final String id;
  final String rawInput;
  final String? enhancedText;
  final String source;
  final String eventType;
  final String category;
  final Map<String, dynamic> normalizedData;
  final double confidenceScore;
  final String status;
  final DateTime createdAt;
  final DateTime? updatedAt;

  Memory({
    required this.id,
    required this.rawInput,
    this.enhancedText,
    required this.source,
    required this.eventType,
    required this.category,
    required this.normalizedData,
    required this.confidenceScore,
    required this.status,
    required this.createdAt,
    this.updatedAt,
  });

  factory Memory.fromJson(Map<String, dynamic> json) {
    return Memory(
      id: json['id'] ?? '',
      rawInput: json['raw_input'] ?? json['rawInput'] ?? '',
      enhancedText: json['enhanced_text'] ?? json['enhancedText'],
      source: json['source'] ?? 'text',
      eventType: json['event_type'] ?? json['eventType'] ?? 'note',
      category: json['category'] ?? 'generic',
      normalizedData: Map<String, dynamic>.from(
        json['normalized_data'] ?? json['normalizedData'] ?? {},
      ),
      confidenceScore: (json['confidence_score'] ?? json['confidenceScore'] ?? 0.0).toDouble(),
      status: json['status'] ?? 'validated',
      createdAt: json['created_at'] != null
          ? DateTime.parse(json['created_at'])
          : DateTime.now(),
      updatedAt: json['updated_at'] != null
          ? DateTime.parse(json['updated_at'])
          : null,
    );
  }

  String get displayText => enhancedText ?? rawInput;

  /// Alias for createdAt for convenience
  DateTime get timestamp => createdAt;

  /// Alias for rawInput for convenience
  String get originalText => rawInput;

  /// Alias for normalizedData for convenience
  Map<String, dynamic>? get metadata => normalizedData.isNotEmpty ? normalizedData : null;

  /// Get human-readable time ago string
  String get timeAgo {
    final now = DateTime.now();
    final diff = now.difference(createdAt);

    if (diff.inSeconds < 60) {
      return 'Just now';
    } else if (diff.inMinutes < 60) {
      return '${diff.inMinutes}m ago';
    } else if (diff.inHours < 24) {
      return '${diff.inHours}h ago';
    } else if (diff.inDays < 7) {
      return '${diff.inDays}d ago';
    } else if (diff.inDays < 30) {
      return '${(diff.inDays / 7).floor()}w ago';
    } else {
      return '${(diff.inDays / 30).floor()}mo ago';
    }
  }
}
