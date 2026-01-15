/// Natural language query result
class QueryResult {
  final String question;
  final String intent;
  final String answer;
  final dynamic data;
  final String? category;
  final String? timeRange;

  QueryResult({
    required this.question,
    required this.intent,
    required this.answer,
    this.data,
    this.category,
    this.timeRange,
  });

  factory QueryResult.fromJson(Map<String, dynamic> json) {
    return QueryResult(
      question: json['question'] ?? '',
      intent: json['intent'] ?? 'unknown',
      answer: json['answer'] ?? '',
      data: json['data'],
      category: json['category'],
      timeRange: json['time_range'] ?? json['timeRange'],
    );
  }
}
