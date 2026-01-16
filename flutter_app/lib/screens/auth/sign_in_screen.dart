import 'package:flutter/material.dart';
import 'package:firebase_ui_auth/firebase_ui_auth.dart' as firebase_ui;
import '../../config/app_colors.dart';
import '../../config/app_typography.dart';
import '../../config/app_spacing.dart';
import '../../services/auth_service.dart';

/// Custom Sign-in screen wrapper for Kairo
class SignInScreen extends StatelessWidget {
  const SignInScreen({super.key});

  @override
  Widget build(BuildContext context) {
    return Scaffold(
      backgroundColor: AppColors.background,
      body: SafeArea(
        child: SingleChildScrollView(
          padding: AppSpacing.paddingScreen,
          child: Column(
            children: [
              // Custom Kairo Header
              _buildHeader(),
              const SizedBox(height: 48),

              // Google Sign-In Button
              _buildGoogleSignInButton(context),

              const SizedBox(height: 24),

              // Divider
              Row(
                children: [
                  const Expanded(child: Divider()),
                  Padding(
                    padding: const EdgeInsets.symmetric(horizontal: 16),
                    child: Text(
                      'or',
                      style: AppTypography.bodySmall.copyWith(
                        color: AppColors.textSecondary,
                      ),
                    ),
                  ),
                  const Expanded(child: Divider()),
                ],
              ),

              const SizedBox(height: 24),

              // Firebase UI Auth Screen for Email & Phone
              SizedBox(
                height: 400,
                child: firebase_ui.SignInScreen(
                  providers: [
                    firebase_ui.EmailAuthProvider(),
                    firebase_ui.PhoneAuthProvider(),
                  ],
                  subtitleBuilder: (context, action) {
                    return Padding(
                      padding: const EdgeInsets.only(bottom: 8),
                      child: Text(
                        action == firebase_ui.AuthAction.signIn
                            ? 'Sign in with email or phone'
                            : 'Create your account',
                        style: AppTypography.bodySmall.copyWith(
                          color: AppColors.textSecondary,
                        ),
                        textAlign: TextAlign.center,
                      ),
                    );
                  },
                  footerBuilder: (context, action) {
                    return Padding(
                      padding: const EdgeInsets.all(16.0),
                      child: Text(
                        'By continuing, you agree to our Terms & Privacy Policy',
                        style: AppTypography.caption.copyWith(
                          color: AppColors.textTertiary,
                        ),
                        textAlign: TextAlign.center,
                      ),
                    );
                  },
                ),
              ),
            ],
          ),
        ),
      ),
    );
  }

  Widget _buildGoogleSignInButton(BuildContext context) {
    return SizedBox(
      width: double.infinity,
      height: 56,
      child: OutlinedButton.icon(
        onPressed: () async {
          try {
            final authService = AuthService();
            final userCredential = await authService.signInWithGoogle();

            if (userCredential != null) {
              // Successfully signed in, Firebase auth state will handle navigation
              if (context.mounted) {
                ScaffoldMessenger.of(context).showSnackBar(
                  const SnackBar(content: Text('Signed in successfully!')),
                );
              }
            }
          } catch (e) {
            if (context.mounted) {
              ScaffoldMessenger.of(
                context,
              ).showSnackBar(SnackBar(content: Text('Sign in failed: $e')));
            }
          }
        },
        icon: Image.network(
          'https://www.google.com/favicon.ico',
          width: 24,
          height: 24,
          errorBuilder: (context, error, stackTrace) {
            return const Icon(Icons.account_circle, size: 24);
          },
        ),
        label: Text(
          'Continue with Google',
          style: AppTypography.body.copyWith(fontWeight: FontWeight.w500),
        ),
        style: OutlinedButton.styleFrom(
          backgroundColor: Colors.white,
          foregroundColor: Colors.black87,
          side: BorderSide(color: Colors.grey.shade300),
          shape: RoundedRectangleBorder(
            borderRadius: BorderRadius.circular(AppSpacing.radiusLg),
          ),
        ),
      ),
    );
  }

  Widget _buildHeader() {
    return Container(
      padding: const EdgeInsets.all(32.0),
      child: Column(
        children: [
          // Logo
          Container(
            width: 80,
            height: 80,
            decoration: BoxDecoration(
              gradient: const LinearGradient(
                colors: [Color(0xFF00D9A3), Color(0xFF1DE9B6)],
              ),
              borderRadius: BorderRadius.circular(20),
            ),
            child: const Icon(
              Icons.memory_rounded,
              color: Colors.white,
              size: 40,
            ),
          ),
          const SizedBox(height: 24),
          Text('Kairo', style: AppTypography.h2),
          const SizedBox(height: 8),
          Text(
            'Voice-first life tracking',
            style: AppTypography.bodySmall.copyWith(
              color: AppColors.textSecondary,
            ),
          ),
        ],
      ),
    );
  }
}
