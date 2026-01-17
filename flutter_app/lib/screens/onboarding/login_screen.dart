import 'package:flutter/material.dart';
import '../../config/app_colors.dart';
import '../../config/app_typography.dart';
import '../../config/app_spacing.dart';
import '../../services/auth_service.dart';
import 'phone_dialogs.dart';

class LoginScreen extends StatefulWidget {
  const LoginScreen({super.key});

  @override
  State<LoginScreen> createState() => _LoginScreenState();
}

class _LoginScreenState extends State<LoginScreen> {
  final AuthService _authService = AuthService();
  bool _isLoading = false;
  String? _error;

  Future<void> _handleGoogleSignIn() async {
    setState(() {
      _isLoading = true;
      _error = null;
    });

    try {
      final credential = await _authService.signInWithGoogle();
      if (credential == null) {
        // User cancelled
        setState(() => _isLoading = false);
      }
      // If success, the AuthWrapper will handle navigation via stream
    } catch (e) {
      if (mounted) {
        setState(() {
          _isLoading = false;
        });
        _showErrorDialog(e.toString());
      }
    }
  }

  Future<void> _handlePhoneSignIn() async {
    // Show phone input dialog
    final phoneNumber = await showDialog<String>(
      context: context,
      builder: (context) => PhoneInputDialog(),
    );

    if (phoneNumber == null || phoneNumber.isEmpty) return;

    setState(() {
      _isLoading = true;
      _error = null;
    });

    try {
      await _authService.verifyPhoneNumber(
        phoneNumber: phoneNumber,
        onCodeSent: (verificationId) {
          setState(() => _isLoading = false);
          // Show SMS code input dialog
          _showSmsCodeDialog(verificationId);
        },
        onError: (message) {
          if (mounted) {
            setState(() {
              _isLoading = false;
            });
            _showErrorDialog(message);
          }
        },
      );
    } catch (e) {
      if (mounted) {
        setState(() {
          _isLoading = false;
        });
        _showErrorDialog(e.toString());
      }
    }
  }

  Future<void> _showSmsCodeDialog(String verificationId) async {
    final smsCode = await showDialog<String>(
      context: context,
      builder: (context) => SmsCodeDialog(),
    );

    if (smsCode == null || smsCode.isEmpty) return;

    setState(() {
      _isLoading = true;
      _error = null;
    });

    try {
      await _authService.signInWithPhoneCode(
        verificationId: verificationId,
        smsCode: smsCode,
      );
      // AuthWrapper handles navigation
    } catch (e) {
      if (mounted) {
        setState(() {
          _isLoading = false;
        });
        _showErrorDialog(e.toString());
      }
    }
  }

  Future<void> _handleGuestSignIn() async {
    setState(() {
      _isLoading = true;
      _error = null;
    });

    try {
      await _authService.signInAnonymously();
      // AuthWrapper handles navigation
    } catch (e) {
      if (mounted) {
        setState(() {
          _isLoading = false;
        });
        _showErrorDialog(e.toString());
      }
    }
  }

  void _showErrorDialog(String message) {
    showDialog(
      context: context,
      builder: (context) => AlertDialog(
        title: const Text('Sign In Failed'),
        content: Text(message),
        actions: [
          TextButton(
            onPressed: () => Navigator.pop(context),
            child: const Text('OK'),
          ),
        ],
      ),
    );
  }

  @override
  Widget build(BuildContext context) {
    return Scaffold(
      backgroundColor: AppColors.background,
      body: SafeArea(
        child: Padding(
          padding: const EdgeInsets.all(AppSpacing.xxl),
          child: Column(
            mainAxisAlignment: MainAxisAlignment.center,
            children: [
              const Spacer(),
              // Logo/Icon
              Container(
                width: 120,
                height: 120,
                decoration: BoxDecoration(
                  gradient: AppColors.primaryGradient,
                  shape: BoxShape.circle,
                  boxShadow: [
                    BoxShadow(
                      color: AppColors.primary.withOpacity(0.3),
                      blurRadius: 30,
                      offset: const Offset(0, 10),
                    ),
                  ],
                ),
                child: const Icon(
                  Icons.memory_rounded,
                  size: 64,
                  color: AppColors.textOnPrimary,
                ),
              ),
              const SizedBox(height: AppSpacing.xxl),

              // Title
              Text(
                'Kairo',
                style: AppTypography.h1.copyWith(fontSize: 48),
              ),
              const SizedBox(height: AppSpacing.md),
              Text(
                'Your External Brain',
                style: AppTypography.h3.copyWith(
                  color: AppColors.textSecondary,
                  fontWeight: FontWeight.normal,
                ),
              ),
              const SizedBox(height: AppSpacing.xl),
              Text(
                'Capture everything. Recall anything.\nUncover insights about yourself.',
                style: AppTypography.body.copyWith(
                  color: AppColors.textTertiary,
                  height: 1.5,
                ),
                textAlign: TextAlign.center,
              ),

              const Spacer(),

              if (_error != null) ...[
                Text(
                  _error!,
                  style: AppTypography.caption.copyWith(color: AppColors.error),
                ),
                const SizedBox(height: AppSpacing.md),
              ],

              // Sign In Button
              SizedBox(
                width: double.infinity,
                height: 56,
                child: ElevatedButton(
                  onPressed: _isLoading ? null : _handleGoogleSignIn,
                  style: ElevatedButton.styleFrom(
                    backgroundColor: AppColors.surface,
                    foregroundColor: AppColors.textPrimary,
                    elevation: 0,
                    side: const BorderSide(color: AppColors.border),
                    shape: RoundedRectangleBorder(
                      borderRadius: BorderRadius.circular(28),
                    ),
                  ),
                  child: _isLoading
                      ? const SizedBox(
                          width: 24,
                          height: 24,
                          child: CircularProgressIndicator(strokeWidth: 2),
                        )
                      : Row(
                          mainAxisAlignment: MainAxisAlignment.center,
                          children: [
                            const Icon(Icons.login_rounded,
                                color: AppColors.primary),
                            const SizedBox(width: AppSpacing.md),
                            Text(
                              'Continue with Google',
                              style: AppTypography.button.copyWith(
                                color: AppColors.textPrimary,
                              ),
                            ),
                          ],
                        ),
                ),
              ),
              const SizedBox(height: AppSpacing.md),

              // Phone Sign In Button
              SizedBox(
                width: double.infinity,
                height: 56,
                child: OutlinedButton(
                  onPressed: _isLoading ? null : _handlePhoneSignIn,
                  style: OutlinedButton.styleFrom(
                    foregroundColor: AppColors.textPrimary,
                    side: const BorderSide(color: AppColors.border),
                    shape: RoundedRectangleBorder(
                      borderRadius: BorderRadius.circular(28),
                    ),
                  ),
                  child: Row(
                    mainAxisAlignment: MainAxisAlignment.center,
                    children: [
                      const Icon(Icons.phone_rounded,
                          color: AppColors.textSecondary),
                      const SizedBox(width: AppSpacing.md),
                      Text(
                        'Continue with Phone',
                        style: AppTypography.button.copyWith(
                          color: AppColors.textPrimary,
                        ),
                      ),
                    ],
                  ),
                ),
              ),
              const SizedBox(height: AppSpacing.md),

              TextButton(
                onPressed: _isLoading ? null : _handleGuestSignIn,
                child: Text(
                  'Continue as Guest',
                  style: AppTypography.button.copyWith(
                    color: AppColors.textSecondary,
                  ),
                ),
              ),
              const SizedBox(height: AppSpacing.lg),

              // Terms
              Text(
                'By continuing you agree to our Terms & Privacy Policy',
                style: AppTypography.caption.copyWith(
                  color: AppColors.textTertiary,
                ),
                textAlign: TextAlign.center,
              ),
              const SizedBox(height: AppSpacing.md),
            ],
          ),
        ),
      ),
    );
  }
}
