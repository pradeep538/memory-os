import 'dart:convert';

class ActionPlan {
  final String id;
  final String title;
  final String description;
  final String category;
  final String status;
  final int currentWeek;
  final int durationWeeks;
  final List<PlanPhase> phases;
  final int progress;
  final DateTime? startDate;

  ActionPlan({
    required this.id,
    required this.title,
    required this.description,
    required this.category,
    required this.status,
    required this.currentWeek,
    required this.durationWeeks,
    required this.phases,
    required this.progress,
    this.startDate,
  });

  factory ActionPlan.fromJson(Map<String, dynamic> json) {
    // Extract plan_data if available
    Map<String, dynamic> planData = {};
    if (json['plan_data'] != null) {
      if (json['plan_data'] is String) {
        try {
          planData = jsonDecode(json['plan_data']) as Map<String, dynamic>;
        } catch (e) {
          print('Error parsing plan_data string: $e');
        }
      } else if (json['plan_data'] is Map) {
        planData = json['plan_data'] as Map<String, dynamic>;
      }
    }

    // Determine current week based on start date if not explicitly set
    int calcCurrentWeek = 1;
    if (json['created_at'] != null) {
      // Use created_at as fallback for start_date
      final start = DateTime.parse(json['start_date'] ?? json['created_at']);
      final diff = DateTime.now().difference(start).inDays;
      calcCurrentWeek = (diff / 7).floor() + 1;
    }

    var phasesList = <PlanPhase>[];
    // Check plan_data phases first (primary), then root phases (fallback)
    var phasesSource = planData['phases'] ?? json['phases'];

    if (phasesSource != null) {
      print('PlanData Phases: $phasesSource');
      if (phasesSource is List) {
        phasesList = phasesSource.map((i) => PlanPhase.fromJson(i)).toList();
      }
    } else {
      print('Warning: No phases found in plan data');
    }

    return ActionPlan(
      id: json['id'] ?? '',
      title: json['plan_name'] ?? planData['name'] ?? 'Untitled Plan',
      description: json['description'] ?? planData['description'] ?? '',
      category: json['category'] ?? 'general',
      status: json['status'] ?? 'active',
      currentWeek: json['current_week'] ?? calcCurrentWeek,
      durationWeeks: json['duration_weeks'] ?? planData['duration_weeks'] ?? 4,
      phases: phasesList,
      progress: json['progress'] ?? 0,
      startDate: json['start_date'] != null
          ? DateTime.parse(json['start_date'])
          : (json['created_at'] != null
              ? DateTime.parse(json['created_at'])
              : null),
    );
  }

  // Helper to interpret frequency from phases
  String get frequency => phases.isNotEmpty ? phases.first.target : 'Daily';
}

class PlanPhase {
  final int week;
  final String goal;
  final String target; // e.g. "3x/week"
  final List<String>? schedule; // e.g. ["08:00", "20:00"]

  PlanPhase({
    required this.week,
    required this.goal,
    required this.target,
    this.schedule,
  });

  factory PlanPhase.fromJson(Map<String, dynamic> json) {
    List<String>? parsedSchedule;
    if (json['schedule'] != null) {
      parsedSchedule = List<String>.from(json['schedule']);
    }

    return PlanPhase(
      week: json['week'] ?? 1,
      goal: json['goal'] ?? '',
      target: json['target']?.toString() ?? '',
      schedule: parsedSchedule,
    );
  }
}
