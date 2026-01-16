import 'package:flutter/foundation.dart';
import '../services/services.dart';
import '../services/auth_service.dart';

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
    _isInitialized = true;
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
