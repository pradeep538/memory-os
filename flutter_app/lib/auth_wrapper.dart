import 'package:flutter/material.dart';
import 'package:firebase_auth/firebase_auth.dart';
import 'package:provider/provider.dart';
import 'providers/app_provider.dart';
import 'screens/onboarding/intro_screen.dart'; // Renamed file
import 'screens/onboarding/login_screen.dart'; // Renamed file
import 'screens/main_shell.dart';

class AuthWrapper extends StatelessWidget {
  const AuthWrapper({super.key});

  @override
  Widget build(BuildContext context) {
    return Consumer<AppProvider>(
      builder: (context, appProvider, _) {
        // Wait for app initialization (including onboarding check)
        if (!appProvider.isInitialized) {
          return const Scaffold(
            body: Center(child: CircularProgressIndicator()),
          );
        }

        return StreamBuilder<User?>(
          stream: FirebaseAuth.instance.authStateChanges(),
          builder: (context, snapshot) {
            if (snapshot.connectionState == ConnectionState.waiting) {
              return const Scaffold(
                body: Center(child: CircularProgressIndicator()),
              );
            }

            if (snapshot.hasData) {
              // User is signed in -> Home
              return const MainShell();
            } else {
              // User NOT signed in checks onboarding state
              if (!appProvider.isOnboardingCompleted) {
                return IntroScreen(
                  onComplete: () {
                    appProvider.completeOnboarding();
                  },
                );
              }
              // Onboarding done -> Login
              return const LoginScreen();
            }
          },
        );
      },
    );
  }
}
