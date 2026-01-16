import 'api_client.dart';
import '../models/plan_model.dart';
import 'package:flutter/foundation.dart';

class PlansService extends ChangeNotifier {
  final ApiClient _apiClient;

  PlansService(this._apiClient);

  // Get active plans
  Future<List<ActionPlan>> getActivePlans() async {
    try {
      final response = await _apiClient.get('/plans/active');

      if (response.success && response.data != null) {
        final List<dynamic> plansJson = response.data;
        return plansJson.map((json) => ActionPlan.fromJson(json)).toList();
      }
      return [];
    } catch (e) {
      debugPrint('Error fetching plans: $e');
      return [];
    }
  }

  // Generate new plan
  Future<ActionPlan?> generatePlan(
      String category, String goal, String frequency) async {
    try {
      final response = await _apiClient.post(
        '/plans/generate',
        body: {
          'category': category,
          'goal': goal,
          'frequency': frequency,
        },
      );

      if (response.success && response.data != null) {
        return ActionPlan.fromJson(response.data);
      }
      return null;
    } catch (e) {
      debugPrint('Error generating plan: $e');
      return null;
    }
  }

  // Get available templates
  Future<Map<String, List<String>>> getTemplates() async {
    // Mock for now or implement APi call if needed
    return {
      'fitness': ['build_consistency', 'increase_intensity'],
      'finance': ['reduce_spending'],
      'routine': ['morning_routine', 'evening_rest']
    };
  }
}
