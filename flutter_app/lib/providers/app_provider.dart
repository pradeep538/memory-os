import 'package:flutter/foundation.dart';
import '../services/services.dart';
import '../services/auth_service.dart';
import '../services/fcm_service.dart';
import 'package:shared_preferences/shared_preferences.dart';

/// Main app provider - manages services and global state
class AppProvider extends ChangeNotifier {
  late final ApiClient _apiClient;
  late final InputService inputService;
  late final MemoryService memoryService;
  late final HabitsService habitsService;
  late final InsightsService insightsService;
  late final EngagementService engagementService;
  late final AnalyticsService analyticsService;
  late final NotificationsService notificationsService;
  late final FeatureFlagService featureFlagService;
  late final QueryService queryService;
  late final EntityService entityService;
  late final AuthService authService;

  bool _isInitialized = false;
  bool get isInitialized => _isInitialized;

  String? _error;
  String? get error => _error;

  AppProvider() {
    _initServices();
  }

  void _initServices() {
    _apiClient = ApiClient();
    authService = AuthService();
    featureFlagService = FeatureFlagService(_apiClient);
    featureFlagService.init(); // Start async init
    inputService = InputService(_apiClient);
    memoryService = MemoryService(_apiClient);
    habitsService = HabitsService(_apiClient);
    insightsService = InsightsService(_apiClient);
    engagementService = EngagementService(_apiClient);
    analyticsService = AnalyticsService(_apiClient);
    notificationsService = NotificationsService(_apiClient);
    queryService = QueryService(_apiClient);
    entityService = EntityService(_apiClient);

    // Listen to auth changes for FCM registration
    authService.authStateChanges.listen((user) {
      if (user != null) {
        FcmService.registerDeviceToken();
      }
    });

    // Check onboarding status
    _checkOnboardingStatus();

    _isInitialized = true;
    notifyListeners();
  }

  bool _isOnboardingCompleted = false;
  bool get isOnboardingCompleted => _isOnboardingCompleted;

  Future<void> _checkOnboardingStatus() async {
    final prefs = await SharedPreferences.getInstance();
    _isOnboardingCompleted = prefs.getBool('onboarding_completed') ?? false;
    notifyListeners();
  }

  Future<void> completeOnboarding() async {
    final prefs = await SharedPreferences.getInstance();
    await prefs.setBool('onboarding_completed', true);
    _isOnboardingCompleted = true;
    notifyListeners();
  }

  void setError(String? error) {
    _error = error;
    notifyListeners();
  }

  void clearError() {
    _error = null;
    notifyListeners();
  }

  @override
  void dispose() {
    _apiClient.dispose();
    super.dispose();
  }
}
