import 'package:flutter/foundation.dart';
import 'package:shared_preferences/shared_preferences.dart';
import '../models/models.dart';
import 'api_client.dart';

class FeatureFlagService extends ChangeNotifier {
  final ApiClient _client;
  List<FeatureFlag> _flags = [];
  SharedPreferences? _prefs;
  bool _isInitialized = false;

  FeatureFlagService(this._client);

  bool get isInitialized => _isInitialized;

  // Keys for local storage
  String _seenKey(String key) => 'feature_${key}_seen_at';
  String _interactedKey(String key) => 'feature_${key}_interacted';

  Future<void> init() async {
    if (_isInitialized) return;

    try {
      // Load Prefs and Flags in parallel
      await Future.wait([
        SharedPreferences.getInstance().then((prefs) => _prefs = prefs),
        _loadFlagsFromApi(),
      ]);
      _isInitialized = true;
      notifyListeners();
    } catch (e) {
      debugPrint('FeatureFlagService init error: $e');
    }
  }

  Future<void> _loadFlagsFromApi() async {
    try {
      final response = await _client.get<List<dynamic>>(
        '/config/features',
        // Generic parsing because ApiClient might not handle List<FeatureFlag> automagically depending on implementation
      );

      if (response.success && response.data != null) {
        _flags = (response.data as List)
            .map((e) => FeatureFlag.fromJson(e as Map<String, dynamic>))
            .toList();
      }
    } catch (e) {
      debugPrint('Failed to fetch flags: $e');
    }
  }

  /// Check if a feature should be visible based on rules
  bool isFeatureVisible(String key) {
    if (!_isInitialized) return false; // Fail safe

    final flag = _flags.firstWhere(
      (f) => f.featureKey == key,
      orElse: () => FeatureFlag(
        id: 'temp',
        featureKey: key,
        isEnabled: false,
      ), // Default hidden if not found
    );

    if (!flag.isEnabled) return false;

    // Apply visibility rules
    switch (flag.visibilityType) {
      case 'always':
        return true;

      case 'until_interaction':
        return !hasInteracted(key);

      case 'limited_duration':
        if (flag.paramDurationDays == null) return true;

        final firstSeen = _getFirstSeen(key);
        if (firstSeen == null) {
          _markFirstSeen(key);
          return true;
        }

        final daysSince = DateTime.now().difference(firstSeen).inDays;
        return daysSince < flag.paramDurationDays!;

      default:
        return true;
    }
  }

  /// User Action: Mark a feature as interacted with
  Future<void> markInteraction(String key) async {
    if (_prefs == null) return;
    await _prefs!.setBool(_interactedKey(key), true);
    notifyListeners(); // Rebuild UI to reflect change (e.g. hide widget)
  }

  // Helpers
  bool hasInteracted(String key) {
    return _prefs?.getBool(_interactedKey(key)) ?? false;
  }

  DateTime? _getFirstSeen(String key) {
    final timestamp = _prefs?.getString(_seenKey(key));
    if (timestamp == null) return null;
    return DateTime.tryParse(timestamp);
  }

  Future<void> _markFirstSeen(String key) async {
    if (_prefs == null) return;
    // Only mark if not set
    if (!_prefs!.containsKey(_seenKey(key))) {
      await _prefs!.setString(_seenKey(key), DateTime.now().toIso8601String());
    }
  }
}
