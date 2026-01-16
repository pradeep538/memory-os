import 'package:flutter/material.dart';
import 'package:provider/provider.dart';
import 'providers/providers.dart';
import 'services/services.dart';
import 'screens/main_shell.dart';

import 'package:firebase_core/firebase_core.dart';
import 'firebase_options.dart';

void main() async {
  WidgetsFlutterBinding.ensureInitialized();
  await Firebase.initializeApp(
    options: DefaultFirebaseOptions.currentPlatform,
  );
  runApp(const KairoApp());
}

class KairoApp extends StatelessWidget {
  const KairoApp({Key? key}) : super(key: key);

  @override
  Widget build(BuildContext context) {
    return MultiProvider(
      providers: [
        ChangeNotifierProvider(create: (_) => AppProvider()),
        ChangeNotifierProxyProvider<AppProvider, FeedProvider>(
          create: (_) {
            final apiClient = ApiClient();
            return FeedProvider(
              memoryService: MemoryService(apiClient),
              habitsService: HabitsService(apiClient),
              insightsService: InsightsService(apiClient),
              engagementService: EngagementService(),
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
                    engagementService: EngagementService(),
                    notificationsService: NotificationsService(apiClient),
                    featureFlagService: FeatureFlagService(apiClient),
                  );
            }
            return FeedProvider(
              memoryService: appProvider.memoryService,
              habitsService: appProvider.habitsService,
              insightsService: appProvider.insightsService,
              engagementService: appProvider.engagementService,
              notificationsService: appProvider.notificationsService,
              featureFlagService: appProvider.featureFlagService,
            );
          },
        ),
        ChangeNotifierProxyProvider<AppProvider, InputProvider>(
          create: (_) => InputProvider(InputService(ApiClient())),
          update: (_, appProvider, previous) {
            if (!appProvider.isInitialized)
              return previous ?? InputProvider(InputService(ApiClient()));
            return InputProvider(appProvider.inputService);
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
        home: const MainShell(),
      ),
    );
  }
}
