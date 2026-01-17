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

  // Generate new plan (AI)
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

  // Create new plan (Manual)
  Future<ActionPlan?> createPlan(Map<String, dynamic> planData) async {
    try {
      final response = await _apiClient.post(
        '/plans',
        body: planData,
      );

      if (response.success && response.data != null) {
        return ActionPlan.fromJson(response.data);
      }
      return null;
    } catch (e) {
      debugPrint('Error creating plan: $e');
      return null;
    }
  }

  // Update plan details
  Future<ActionPlan?> updatePlan(
      String planId, Map<String, dynamic> updates) async {
    try {
      final response = await _apiClient.patch(
        '/plans/$planId',
        body: updates,
      );

      if (response.success && response.data != null) {
        return ActionPlan.fromJson(response.data);
      }
      return null;
    } catch (e) {
      debugPrint('Error updating plan: $e');
      return null;
    }
  }

  // Archive plan
  Future<bool> archivePlan(String planId) async {
    try {
      final response = await _apiClient.delete('/plans/$planId');
      return response.success;
    } catch (e) {
      debugPrint('Error archiving plan: $e');
      return false;
    }
  }

  // Start Architect Session
  Future<Map<String, dynamic>?> startArchitectSession() async {
    try {
      final response =
          await _apiClient.post('/plans/architect/start', body: {});
      if (response.success && response.data != null) {
        return response.data;
      }
      return null;
    } catch (e) {
      debugPrint('Error starting architect session: $e');
      return null;
    }
  }

  // Send Architect Message
  Future<Map<String, dynamic>?> sendArchitectMessage(
      String sessionId, String text) async {
    try {
      final response = await _apiClient.post(
        '/plans/architect/chat',
        body: {'sessionId': sessionId, 'text': text},
      );
      if (response.success && response.data != null) {
        return response.data;
      }
      return null;
    } catch (e) {
      debugPrint('Error sending architect message: $e');
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
