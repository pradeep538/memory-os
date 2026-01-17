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
  final String? shortResponse;

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
    this.shortResponse,
  });

  factory InputResult.fromJson(Map<String, dynamic> json) {
    return InputResult(
      needsConfirmation:
          json['needs_confirmation'] ?? json['needsConfirmation'] ?? false,
      rawInput: json['raw_input'] ?? json['rawInput'],
      enhancedText: json['enhanced_text'] ?? json['enhancedText'] ?? '',
      detectedCategory:
          json['detected_category'] ?? json['detectedCategory'] ?? 'generic',
      detectedEntities: Map<String, dynamic>.from(
        json['detected_entities'] ?? json['detectedEntities'] ?? {},
      ),
      confidenceScore:
          (json['confidence_score'] ?? json['confidenceScore'] ?? 0.0)
              .toDouble(),
      reasoning: json['reasoning'],
      suggestions: json['suggestions'] != null
          ? List<String>.from(json['suggestions'])
          : null,
      memory: json['memory'] != null ? Memory.fromJson(json['memory']) : null,
      shortResponse:
          json['confirmation_message'] ?? json['confirmationMessage'],
    );
  }

  InputResult copyWith({
    bool? needsConfirmation,
    String? rawInput,
    String? enhancedText,
    String? detectedCategory,
    Map<String, dynamic>? detectedEntities,
    double? confidenceScore,
    String? reasoning,
    List<String>? suggestions,
    Memory? memory,
    String? shortResponse,
  }) {
    return InputResult(
      needsConfirmation: needsConfirmation ?? this.needsConfirmation,
      rawInput: rawInput ?? this.rawInput,
      enhancedText: enhancedText ?? this.enhancedText,
      detectedCategory: detectedCategory ?? this.detectedCategory,
      detectedEntities: detectedEntities ?? this.detectedEntities,
      confidenceScore: confidenceScore ?? this.confidenceScore,
      reasoning: reasoning ?? this.reasoning,
      suggestions: suggestions ?? this.suggestions,
      memory: memory ?? this.memory,
      shortResponse: shortResponse ?? this.shortResponse,
    );
  }
}

/// Confirmation result after user confirms input
class ConfirmResult {
  final bool success;
  final Memory? memory;
  final String? message;

  ConfirmResult({required this.success, this.memory, this.message});

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
  final String? shortResponse;

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
    this.shortResponse,
  });

  factory AudioInputResult.fromJson(Map<String, dynamic> json) {
    return AudioInputResult(
      transcription: json['transcription'] ?? '',
      enhancedText: json['enhanced_text'] ?? json['enhancedText'] ?? '',
      detectedCategory:
          json['detected_category'] ?? json['detectedCategory'] ?? 'generic',
      detectedEntities: Map<String, dynamic>.from(
        json['detected_entities'] ?? json['detectedEntities'] ?? {},
      ),
      confidenceScore:
          (json['confidence_score'] ?? json['confidenceScore'] ?? 0.0)
              .toDouble(),
      needsConfirmation:
          json['needs_confirmation'] ?? json['needsConfirmation'] ?? false,
      audioQuality: json['audio_quality'] ?? json['audioQuality'],
      quota: json['quota'] != null ? VoiceQuota.fromJson(json['quota']) : null,
      memory: json['memory'] != null ? Memory.fromJson(json['memory']) : null,
      shortResponse:
          json['confirmation_message'] ?? json['confirmationMessage'],
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
    // Helper for safe int parsing
    int safeInt(dynamic val, [int def = 0]) {
      if (val == null) return def;
      if (val is int) return val;
      if (val is num) return val.toInt();
      if (val is String) {
        if (val == 'unlimited') return -1;
        return int.tryParse(val) ?? def;
      }
      return def;
    }

    return VoiceQuota(
      used: safeInt(json['used'] ?? json['used_count']),
      remaining: safeInt(json['remaining']),
      limit: safeInt(json['limit'], 3),
      tier: json['tier'] ?? 'free',
      resetsAt: json['resets_at'] != null
          ? DateTime.tryParse(json['resets_at'])
          : (json['resetsAt'] != null
              ? DateTime.tryParse(json['resetsAt'])
              : null),
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
      confidenceScore: json['confidence_score'] != null
          ? double.tryParse(json['confidence_score'].toString()) ?? 0.0
          : (json['confidenceScore'] != null
              ? double.tryParse(json['confidenceScore'].toString()) ?? 0.0
              : 0.0),
      status: json['status'] ?? 'validated',
      createdAt: json['created_at'] != null
          ? DateTime.tryParse(json['created_at']) ?? DateTime.now()
          : DateTime.now(),
      updatedAt: json['updated_at'] != null
          ? DateTime.tryParse(json['updated_at'])
          : null,
    );
  }

  String get displayText => enhancedText ?? rawInput;

  /// Alias for createdAt for convenience
  DateTime get timestamp => createdAt;

  /// Alias for rawInput for convenience
  String get originalText => rawInput;

  /// Alias for normalizedData for convenience
  Map<String, dynamic>? get metadata =>
      normalizedData.isNotEmpty ? normalizedData : null;

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

/// Result of async audio upload
class AsyncUploadResult {
  final bool autoProcessed;
  final String message;
  final String memoryId;
  final VoiceQuota? quota;

  AsyncUploadResult({
    required this.autoProcessed,
    required this.message,
    required this.memoryId,
    this.quota,
  });

  factory AsyncUploadResult.fromJson(Map<String, dynamic> json) {
    return AsyncUploadResult(
      autoProcessed: json['auto_processed'] ?? false,
      message: json['message'] ?? '',
      memoryId: json['memory_id'] ?? '',
    );
  }
}

/// Result of audio transcription
class TranscriptionResult {
  final String text;

  TranscriptionResult({required this.text});

  factory TranscriptionResult.fromJson(Map<String, dynamic> json) {
    return TranscriptionResult(
      text: json['text'] ?? '',
    );
  }
}
