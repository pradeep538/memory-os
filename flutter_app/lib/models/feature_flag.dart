class FeatureFlag {
  final String id;
  final String featureKey;
  final bool isEnabled;
  final String
  visibilityType; // 'always', 'until_interaction', 'limited_duration'
  final int? paramDurationDays;

  FeatureFlag({
    required this.id,
    required this.featureKey,
    required this.isEnabled,
    this.visibilityType = 'always',
    this.paramDurationDays,
  });

  factory FeatureFlag.fromJson(Map<String, dynamic> json) {
    return FeatureFlag(
      id: json['id'],
      featureKey: json['feature_key'],
      isEnabled: json['is_enabled'] ?? true,
      visibilityType: json['visibility_type'] ?? 'always',
      paramDurationDays: json['param_duration_days'],
    );
  }
}
