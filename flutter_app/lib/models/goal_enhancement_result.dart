/// Result of blueprint goal enhancement
class GoalEnhancementResult {
  final String refinedGoal;
  final String shortName;

  GoalEnhancementResult({required this.refinedGoal, required this.shortName});

  factory GoalEnhancementResult.fromJson(Map<String, dynamic> json) {
    return GoalEnhancementResult(
      refinedGoal: json['refined_goal'] ?? '',
      shortName: json['short_name'] ?? '',
    );
  }
}
