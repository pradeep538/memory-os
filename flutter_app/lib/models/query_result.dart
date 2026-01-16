class QueryResult {
  final String question;
  final String answer;
  final String subject;
  final String queryType;
  final ConsistencyData consistency;
  final Map<String, dynamic>? evidence;

  QueryResult({
    required this.question,
    required this.answer,
    required this.subject,
    required this.queryType,
    required this.consistency,
    this.evidence,
  });

  factory QueryResult.fromJson(Map<String, dynamic> json) {
    return QueryResult(
      question: json['question'] as String,
      answer: json['answer'] as String,
      subject: json['subject'] as String,
      queryType: json['query_type'] as String,
      consistency: ConsistencyData.fromJson(
        json['consistency'] as Map<String, dynamic>,
      ),
      evidence: json['evidence'] as Map<String, dynamic>?,
    );
  }
}

class ConsistencyData {
  final List<int> pattern;
  final int adherencePercentage;
  final int currentStreak;
  final int totalLogged;
  final int daysTracked;

  ConsistencyData({
    required this.pattern,
    required this.adherencePercentage,
    required this.currentStreak,
    required this.totalLogged,
    required this.daysTracked,
  });

  factory ConsistencyData.fromJson(Map<String, dynamic> json) {
    return ConsistencyData(
      pattern: List<int>.from(json['pattern'] as List),
      adherencePercentage: json['adherence_percentage'] as int,
      currentStreak: json['current_streak'] as int,
      totalLogged: json['total_logged'] as int,
      daysTracked: json['days_tracked'] as int? ?? 7,
    );
  }
}
