import 'package:flutter/material.dart';
import 'package:flutter/services.dart';
import 'package:provider/provider.dart';
import 'package:firebase_core/firebase_core.dart';
import 'providers/providers.dart';
import 'providers/kairo_state.dart'; // Import KairoState
import 'services/services.dart';
import 'auth_wrapper.dart';
import 'firebase_options.dart';

import 'services/fcm_service.dart';
import 'package:firebase_messaging/firebase_messaging.dart';

@pragma('vm:entry-point')
Future<void> _firebaseMessagingBackgroundHandler(RemoteMessage message) async {
  // If you're going to use other Firebase services in the background, such as Firestore,
  // make sure you call `Firebase.initializeApp()` before using other Firebase services.
  await Firebase.initializeApp(options: DefaultFirebaseOptions.currentPlatform);
  print("Handling a background message: ${message.messageId}");
}

void main() async {
  WidgetsFlutterBinding.ensureInitialized();
  SystemChrome.setSystemUIOverlayStyle(const SystemUiOverlayStyle(
    statusBarColor: Colors.transparent,
    statusBarIconBrightness: Brightness.dark, // Dark icons for light background
    statusBarBrightness: Brightness.light, // For iOS (light = dark icons)
  ));

  await Firebase.initializeApp(
    options: DefaultFirebaseOptions.currentPlatform,
  );

  // Set the background handler before any other FCM initialization
  FirebaseMessaging.onBackgroundMessage(_firebaseMessagingBackgroundHandler);

  // Initialize FCM service (permissions, foreground listeners, token registration)
  await FcmService.initialize();

  runApp(const KairoApp());
}

class KairoApp extends StatelessWidget {
  const KairoApp({Key? key}) : super(key: key);

  @override
  Widget build(BuildContext context) {
    return MultiProvider(
      providers: [
        ChangeNotifierProvider(create: (_) => AppProvider()),
        ChangeNotifierProvider(
            create: (_) => KairoState()), // NEW: Add KairoState
        ChangeNotifierProxyProvider<AppProvider, FeedProvider>(
          create: (_) {
            final apiClient = ApiClient();
            return FeedProvider(
              memoryService: MemoryService(apiClient),
              habitsService: HabitsService(apiClient),
              insightsService: InsightsService(apiClient),
              engagementService: EngagementService(apiClient),
              analyticsService: AnalyticsService(apiClient),
              notificationsService: NotificationsService(apiClient),
              featureFlagService: FeatureFlagService(apiClient),
            );
          },
          update: (_, appProvider, previous) {
            if (!appProvider.isInitialized) {
              final apiClient = ApiClient();
              return previous ??
                  FeedProvider(
                    memoryService: MemoryService(apiClient),
                    habitsService: HabitsService(apiClient),
                    insightsService: InsightsService(apiClient),
                    engagementService: EngagementService(apiClient),
                    analyticsService: AnalyticsService(apiClient),
                    notificationsService: NotificationsService(apiClient),
                    featureFlagService: FeatureFlagService(apiClient),
                  );
            }
            return FeedProvider(
              memoryService: appProvider.memoryService,
              habitsService: appProvider.habitsService,
              insightsService: appProvider.insightsService,
              engagementService: appProvider.engagementService,
              analyticsService: appProvider.analyticsService,
              notificationsService: appProvider.notificationsService,
              featureFlagService: appProvider.featureFlagService,
            );
          },
        ),
        ChangeNotifierProxyProvider<AppProvider, InputProvider>(
          create: (_) {
            final client = ApiClient();
            return InputProvider(InputService(client), MemoryService(client));
          },
          update: (_, appProvider, previous) {
            if (!appProvider.isInitialized) {
              final client = ApiClient();
              return previous ??
                  InputProvider(InputService(client), MemoryService(client));
            }
            return InputProvider(
                appProvider.inputService, appProvider.memoryService);
          },
        ),
      ],
      child: MaterialApp(
        title: 'Kairo',
        debugShowCheckedModeBanner: false,
        theme: ThemeData(
          brightness: Brightness.dark,
          primaryColor: const Color(0xFF06B6D4), // Cyan
          scaffoldBackgroundColor: const Color(0xFF0F172A), // Slate 900
          fontFamily: 'Inter', // Add Inter font for clean look
        ),
        home: const AuthWrapper(),
      ),
    );
  }
}
