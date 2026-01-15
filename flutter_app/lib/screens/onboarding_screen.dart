import 'package:flutter/material.dart';
import 'package:flutter/services.dart';
import '../config/app_colors.dart';
import '../config/app_typography.dart';
import '../config/app_spacing.dart';

/// Onboarding data model
class OnboardingPage {
  final String title;
  final String description;
  final IconData icon;
  final Color color;

  const OnboardingPage({
    required this.title,
    required this.description,
    required this.icon,
    required this.color,
  });
}

/// Onboarding Screen - 3-slide introduction for new users
class OnboardingScreen extends StatefulWidget {
  final VoidCallback onComplete;

  const OnboardingScreen({super.key, required this.onComplete});

  @override
  State<OnboardingScreen> createState() => _OnboardingScreenState();
}

class _OnboardingScreenState extends State<OnboardingScreen> {
  final PageController _pageController = PageController();
  int _currentPage = 0;

  final List<OnboardingPage> _pages = const [
    OnboardingPage(
      title: 'Voice-First Logging',
      description:
          'Simply speak your thoughts, activities, and memories. Our AI understands natural language and organizes everything for you.',
      icon: Icons.mic_rounded,
      color: AppColors.primary,
    ),
    OnboardingPage(
      title: 'Smart Organization',
      description:
          'Your memories are automatically categorized into fitness, finance, health, mindfulness, and more. No manual sorting needed.',
      icon: Icons.auto_awesome_rounded,
      color: AppColors.accent,
    ),
    OnboardingPage(
      title: 'Discover Patterns',
      description:
          'Get AI-powered insights about your habits and behaviors. Track progress, build streaks, and unlock achievements.',
      icon: Icons.insights_rounded,
      color: AppColors.success,
    ),
  ];

  @override
  void dispose() {
    _pageController.dispose();
    super.dispose();
  }

  void _nextPage() {
    if (_currentPage < _pages.length - 1) {
      _pageController.nextPage(
        duration: const Duration(milliseconds: 300),
        curve: Curves.easeInOut,
      );
    } else {
      widget.onComplete();
    }
  }

  void _skipOnboarding() {
    widget.onComplete();
  }

  @override
  Widget build(BuildContext context) {
    return Scaffold(
      backgroundColor: AppColors.background,
      body: SafeArea(
        child: Column(
          children: [
            // Skip button
            Align(
              alignment: Alignment.topRight,
              child: Padding(
                padding: const EdgeInsets.all(AppSpacing.md),
                child: TextButton(
                  onPressed: _skipOnboarding,
                  child: Text(
                    'Skip',
                    style: AppTypography.button.copyWith(
                      color: AppColors.textSecondary,
                    ),
                  ),
                ),
              ),
            ),

            // Page content
            Expanded(
              child: PageView.builder(
                controller: _pageController,
                onPageChanged: (index) {
                  setState(() => _currentPage = index);
                  HapticFeedback.selectionClick();
                },
                itemCount: _pages.length,
                itemBuilder: (context, index) {
                  return _OnboardingPageWidget(page: _pages[index]);
                },
              ),
            ),

            // Page indicators
            Padding(
              padding: const EdgeInsets.symmetric(vertical: AppSpacing.lg),
              child: Row(
                mainAxisAlignment: MainAxisAlignment.center,
                children: List.generate(_pages.length, (index) {
                  return AnimatedContainer(
                    duration: const Duration(milliseconds: 200),
                    margin: const EdgeInsets.symmetric(horizontal: 4),
                    width: _currentPage == index ? 24 : 8,
                    height: 8,
                    decoration: BoxDecoration(
                      color: _currentPage == index
                          ? _pages[_currentPage].color
                          : AppColors.borderLight,
                      borderRadius: BorderRadius.circular(4),
                    ),
                  );
                }),
              ),
            ),

            // Next/Get Started button
            Padding(
              padding: const EdgeInsets.all(AppSpacing.lg),
              child: SizedBox(
                width: double.infinity,
                child: ElevatedButton(
                  onPressed: _nextPage,
                  style: ElevatedButton.styleFrom(
                    backgroundColor: _pages[_currentPage].color,
                    padding: const EdgeInsets.symmetric(vertical: AppSpacing.md),
                  ),
                  child: Text(
                    _currentPage == _pages.length - 1 ? 'Get Started' : 'Next',
                  ),
                ),
              ),
            ),
          ],
        ),
      ),
    );
  }
}

/// Onboarding page widget
class _OnboardingPageWidget extends StatelessWidget {
  final OnboardingPage page;

  const _OnboardingPageWidget({required this.page});

  @override
  Widget build(BuildContext context) {
    return Padding(
      padding: const EdgeInsets.symmetric(horizontal: AppSpacing.xl),
      child: Column(
        mainAxisAlignment: MainAxisAlignment.center,
        children: [
          // Animated icon container
          TweenAnimationBuilder<double>(
            tween: Tween(begin: 0.8, end: 1.0),
            duration: const Duration(milliseconds: 500),
            curve: Curves.easeOut,
            builder: (context, scale, child) {
              return Transform.scale(scale: scale, child: child);
            },
            child: Container(
              width: 160,
              height: 160,
              decoration: BoxDecoration(
                color: page.color.withAlpha(26),
                shape: BoxShape.circle,
              ),
              child: Center(
                child: Container(
                  width: 120,
                  height: 120,
                  decoration: BoxDecoration(
                    color: page.color.withAlpha(51),
                    shape: BoxShape.circle,
                  ),
                  child: Icon(
                    page.icon,
                    size: 56,
                    color: page.color,
                  ),
                ),
              ),
            ),
          ),

          const SizedBox(height: AppSpacing.xxl),

          // Title
          TweenAnimationBuilder<double>(
            tween: Tween(begin: 0.0, end: 1.0),
            duration: const Duration(milliseconds: 400),
            curve: Curves.easeOut,
            builder: (context, opacity, child) {
              return Opacity(opacity: opacity, child: child);
            },
            child: Text(
              page.title,
              style: AppTypography.h2,
              textAlign: TextAlign.center,
            ),
          ),

          const SizedBox(height: AppSpacing.lg),

          // Description
          TweenAnimationBuilder<double>(
            tween: Tween(begin: 0.0, end: 1.0),
            duration: const Duration(milliseconds: 500),
            curve: Curves.easeOut,
            builder: (context, opacity, child) {
              return Opacity(opacity: opacity, child: child);
            },
            child: Text(
              page.description,
              style: AppTypography.body.copyWith(
                color: AppColors.textSecondary,
                height: 1.6,
              ),
              textAlign: TextAlign.center,
            ),
          ),

          const SizedBox(height: AppSpacing.xl),

          // Feature highlights
          _buildFeatureHighlights(),
        ],
      ),
    );
  }

  Widget _buildFeatureHighlights() {
    List<String> highlights;

    switch (page.icon) {
      case Icons.mic_rounded:
        highlights = [
          'Natural language processing',
          '30-second voice memos',
          'Automatic transcription',
        ];
        break;
      case Icons.auto_awesome_rounded:
        highlights = [
          '6 smart categories',
          'AI-enhanced entries',
          'Searchable history',
        ];
        break;
      case Icons.insights_rounded:
        highlights = [
          'Weekly patterns',
          'Streak tracking',
          'Personal milestones',
        ];
        break;
      default:
        highlights = [];
    }

    return Column(
      children: highlights.map((highlight) {
        return Padding(
          padding: const EdgeInsets.only(bottom: AppSpacing.sm),
          child: Row(
            mainAxisAlignment: MainAxisAlignment.center,
            children: [
              Icon(
                Icons.check_circle_rounded,
                size: 18,
                color: page.color,
              ),
              const SizedBox(width: AppSpacing.sm),
              Text(
                highlight,
                style: AppTypography.body.copyWith(
                  color: AppColors.textSecondary,
                ),
              ),
            ],
          ),
        );
      }).toList(),
    );
  }
}

/// Welcome animation widget (optional splash after onboarding)
class WelcomeAnimation extends StatefulWidget {
  final VoidCallback onComplete;

  const WelcomeAnimation({super.key, required this.onComplete});

  @override
  State<WelcomeAnimation> createState() => _WelcomeAnimationState();
}

class _WelcomeAnimationState extends State<WelcomeAnimation>
    with SingleTickerProviderStateMixin {
  late AnimationController _controller;
  late Animation<double> _scaleAnimation;
  late Animation<double> _opacityAnimation;

  @override
  void initState() {
    super.initState();
    _controller = AnimationController(
      duration: const Duration(milliseconds: 1500),
      vsync: this,
    );

    _scaleAnimation = Tween<double>(begin: 0.5, end: 1.0).animate(
      CurvedAnimation(
        parent: _controller,
        curve: const Interval(0.0, 0.6, curve: Curves.elasticOut),
      ),
    );

    _opacityAnimation = Tween<double>(begin: 0.0, end: 1.0).animate(
      CurvedAnimation(
        parent: _controller,
        curve: const Interval(0.3, 0.8, curve: Curves.easeIn),
      ),
    );

    _controller.forward().then((_) {
      Future.delayed(const Duration(milliseconds: 500), widget.onComplete);
    });
  }

  @override
  void dispose() {
    _controller.dispose();
    super.dispose();
  }

  @override
  Widget build(BuildContext context) {
    return Scaffold(
      backgroundColor: AppColors.background,
      body: Center(
        child: AnimatedBuilder(
          animation: _controller,
          builder: (context, child) {
            return Column(
              mainAxisAlignment: MainAxisAlignment.center,
              children: [
                ScaleTransition(
                  scale: _scaleAnimation,
                  child: Container(
                    width: 100,
                    height: 100,
                    decoration: BoxDecoration(
                      gradient: const LinearGradient(
                        colors: [AppColors.primary, Color(0xFF1DE9B6)],
                      ),
                      borderRadius: BorderRadius.circular(24),
                      boxShadow: [
                        BoxShadow(
                          color: AppColors.primary.withAlpha(77),
                          blurRadius: 24,
                          offset: const Offset(0, 8),
                        ),
                      ],
                    ),
                    child: const Icon(
                      Icons.memory_rounded,
                      color: AppColors.textOnPrimary,
                      size: 48,
                    ),
                  ),
                ),
                const SizedBox(height: AppSpacing.xl),
                FadeTransition(
                  opacity: _opacityAnimation,
                  child: Column(
                    children: [
                      Text(
                        'Welcome to Memory OS',
                        style: AppTypography.h2,
                      ),
                      const SizedBox(height: AppSpacing.sm),
                      Text(
                        'Your personal life tracker',
                        style: AppTypography.body.copyWith(
                          color: AppColors.textSecondary,
                        ),
                      ),
                    ],
                  ),
                ),
              ],
            );
          },
        ),
      ),
    );
  }
}
