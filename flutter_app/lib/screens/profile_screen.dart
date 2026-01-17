import 'package:flutter/material.dart';
import 'package:provider/provider.dart';
import '../config/app_colors.dart';
import '../config/app_typography.dart';
import '../config/app_spacing.dart';
import '../providers/input_provider.dart';
import '../providers/app_provider.dart';
import '../widgets/common/base_card.dart';
import '../widgets/common/progress_ring.dart';
import 'detail/achievements_screen.dart';
import 'detail/engagement_screen.dart';
import 'detail/patterns_screen.dart';
import 'detail/memories_screen.dart';
import 'detail/entities_screen.dart';
import 'detail/plans_screen.dart';

/// Profile/Me screen - settings and subscription
class ProfileScreen extends StatefulWidget {
  const ProfileScreen({super.key});

  @override
  State<ProfileScreen> createState() => _ProfileScreenState();
}

class _ProfileScreenState extends State<ProfileScreen> {
  @override
  void initState() {
    super.initState();
    // Fetch voice quota when screen loads
    WidgetsBinding.instance.addPostFrameCallback((_) {
      context.read<InputProvider>().fetchVoiceQuota();
    });
  }

  @override
  Widget build(BuildContext context) {
    return Scaffold(
      backgroundColor: AppColors.background,
      body: SafeArea(
        child: SingleChildScrollView(
          padding: const EdgeInsets.all(AppSpacing.screenPadding),
          child: Column(
            crossAxisAlignment: CrossAxisAlignment.start,
            children: [
              const SizedBox(height: AppSpacing.md),

              // Header
              Text('Profile', style: AppTypography.h1),

              const SizedBox(height: AppSpacing.xl),

              // User card
              _buildUserCard(context),

              const SizedBox(height: AppSpacing.lg),

              // Voice quota section
              _buildVoiceQuotaCard(context),

              const SizedBox(height: AppSpacing.lg),

              // Quick access section
              _buildQuickAccessSection(context),

              const SizedBox(height: AppSpacing.lg),

              // Settings section
              _buildSettingsSection(context),

              const SizedBox(height: AppSpacing.lg),

              // Subscription section
              _buildSubscriptionSection(context),

              const SizedBox(height: AppSpacing.lg),

              // About section
              _buildAboutSection(context),

              const SizedBox(height: AppSpacing.xxl),
            ],
          ),
        ),
      ),
    );
  }

  Widget _buildUserCard(BuildContext context) {
    return BaseCard(
      child: Row(
        children: [
          // Avatar
          Container(
            width: 64,
            height: 64,
            decoration: BoxDecoration(
              gradient: AppColors.primaryGradient,
              shape: BoxShape.circle,
            ),
            child: const Center(
              child: Text(
                'U',
                style: TextStyle(
                  color: AppColors.textOnPrimary,
                  fontSize: 24,
                  fontWeight: FontWeight.bold,
                ),
              ),
            ),
          ),
          const SizedBox(width: AppSpacing.md),

          // User info
          Expanded(
            child: Column(
              crossAxisAlignment: CrossAxisAlignment.start,
              children: [
                Text('User', style: AppTypography.h3),
                const SizedBox(height: AppSpacing.xxs),
                Container(
                  padding: const EdgeInsets.symmetric(
                    horizontal: AppSpacing.sm,
                    vertical: AppSpacing.xxs,
                  ),
                  decoration: BoxDecoration(
                    color: AppColors.primaryLight.withOpacity(0.2),
                    borderRadius: BorderRadius.circular(AppSpacing.radiusFull),
                  ),
                  child: Text(
                    'Free Plan',
                    style: AppTypography.labelSmall.copyWith(
                      color: AppColors.primary,
                    ),
                  ),
                ),
              ],
            ),
          ),

          IconButton(
            onPressed: () {
              // TODO: Edit profile
            },
            icon: const Icon(Icons.edit_rounded),
            color: AppColors.textSecondary,
          ),
        ],
      ),
    );
  }

  Widget _buildVoiceQuotaCard(BuildContext context) {
    return Consumer<InputProvider>(
      builder: (context, inputProvider, _) {
        final quota = inputProvider.voiceQuota;

        return BaseCard(
          child: Column(
            crossAxisAlignment: CrossAxisAlignment.start,
            children: [
              Row(
                children: [
                  Container(
                    padding: const EdgeInsets.all(AppSpacing.sm),
                    decoration: BoxDecoration(
                      color: AppColors.primary.withOpacity(0.15),
                      borderRadius: BorderRadius.circular(AppSpacing.radiusSm),
                    ),
                    child: const Icon(
                      Icons.mic_rounded,
                      color: AppColors.primary,
                      size: 20,
                    ),
                  ),
                  const SizedBox(width: AppSpacing.md),
                  Expanded(
                    child: Column(
                      crossAxisAlignment: CrossAxisAlignment.start,
                      children: [
                        Text(
                          'Voice Submissions',
                          style: AppTypography.widgetTitle,
                        ),
                        Text(
                          'Resets daily at midnight',
                          style: AppTypography.caption,
                        ),
                      ],
                    ),
                  ),
                  if (quota != null)
                    ProgressRing(
                      progress: 1 - quota.usagePercent,
                      size: 48,
                      strokeWidth: 4,
                      progressColor:
                          quota.hasQuota ? AppColors.primary : AppColors.error,
                      showPercentage: false,
                      child: Text(
                        '${quota.remaining}',
                        style: AppTypography.label.copyWith(
                          color: quota.hasQuota
                              ? AppColors.primary
                              : AppColors.error,
                        ),
                      ),
                    ),
                ],
              ),
              if (quota != null) ...[
                const SizedBox(height: AppSpacing.md),
                ClipRRect(
                  borderRadius: BorderRadius.circular(4),
                  child: LinearProgressIndicator(
                    value: quota.usagePercent,
                    backgroundColor: AppColors.borderLight,
                    valueColor: AlwaysStoppedAnimation<Color>(
                      quota.hasQuota ? AppColors.primary : AppColors.error,
                    ),
                    minHeight: 6,
                  ),
                ),
                const SizedBox(height: AppSpacing.sm),
                Row(
                  mainAxisAlignment: MainAxisAlignment.spaceBetween,
                  children: [
                    Text('${quota.used} used', style: AppTypography.caption),
                    Text(
                      '${quota.limit} limit (${quota.tier})',
                      style: AppTypography.caption,
                    ),
                  ],
                ),
              ],
              if (quota == null) ...[
                const SizedBox(height: AppSpacing.md),
                if (inputProvider.voiceQuotaError != null)
                  Center(
                    child: Column(
                      children: [
                        Text(
                          'Could not load quota',
                          style: AppTypography.caption
                              .copyWith(color: AppColors.error),
                        ),
                        TextButton(
                          onPressed: () => inputProvider.fetchVoiceQuota(),
                          child: const Text('Retry'),
                        ),
                      ],
                    ),
                  )
                else
                  const Center(
                      child: CircularProgressIndicator(strokeWidth: 2)),
              ],
            ],
          ),
        );
      },
    );
  }

  Widget _buildQuickAccessSection(BuildContext context) {
    return Column(
      crossAxisAlignment: CrossAxisAlignment.start,
      children: [
        Text(
          'Quick Access',
          style: AppTypography.h4.copyWith(color: AppColors.textSecondary),
        ),
        const SizedBox(height: AppSpacing.md),
        BaseCard(
          padding: EdgeInsets.zero,
          child: Column(
            children: [
              _SettingsRow(
                icon: Icons.rocket_launch_rounded,
                title: 'Action Plans',
                subtitle: 'Science-based coaching',
                onTap: () {
                  Navigator.push(
                    context,
                    MaterialPageRoute(
                      builder: (_) => const PlansScreen(),
                    ),
                  );
                },
              ),
              const Divider(height: 1, indent: 56),
              _SettingsRow(
                icon: Icons.emoji_events_rounded,
                title: 'Achievements',
                subtitle: 'View your badges',
                onTap: () {
                  Navigator.push(
                    context,
                    MaterialPageRoute(
                      builder: (_) => const AchievementsScreen(),
                    ),
                  );
                },
              ),
              const Divider(height: 1, indent: 56),
              _SettingsRow(
                icon: Icons.insights_rounded,
                title: 'Engagement',
                subtitle: 'Track your progress',
                onTap: () {
                  Navigator.push(
                    context,
                    MaterialPageRoute(builder: (_) => const EngagementScreen()),
                  );
                },
              ),
              const Divider(height: 1, indent: 56),
              _SettingsRow(
                icon: Icons.auto_awesome_rounded,
                title: 'Patterns & Insights',
                subtitle: 'AI-powered analysis',
                onTap: () {
                  Navigator.push(
                    context,
                    MaterialPageRoute(builder: (_) => const PatternsScreen()),
                  );
                },
              ),
              const Divider(height: 1, indent: 56),
              _SettingsRow(
                icon: Icons.hub_rounded,
                title: 'Knowledge Graph',
                subtitle: 'People & Topics',
                onTap: () {
                  Navigator.push(
                    context,
                    MaterialPageRoute(builder: (_) => const EntitiesScreen()),
                  );
                },
              ),
              const Divider(height: 1, indent: 56),
              _SettingsRow(
                icon: Icons.history_rounded,
                title: 'All Memories',
                subtitle: 'Browse your history',
                onTap: () {
                  Navigator.push(
                    context,
                    MaterialPageRoute(builder: (_) => const MemoriesScreen()),
                  );
                },
              ),
            ],
          ),
        ),
      ],
    );
  }

  Widget _buildSettingsSection(BuildContext context) {
    return Column(
      crossAxisAlignment: CrossAxisAlignment.start,
      children: [
        Text(
          'Settings',
          style: AppTypography.h4.copyWith(color: AppColors.textSecondary),
        ),
        const SizedBox(height: AppSpacing.md),
        BaseCard(
          padding: EdgeInsets.zero,
          child: Column(
            children: [
              _SettingsRow(
                icon: Icons.timer_rounded,
                title: 'Recording Duration',
                subtitle: '6 seconds',
                onTap: () {
                  // TODO: Recording duration settings
                },
              ),
              const Divider(height: 1, indent: 56),
              _SettingsRow(
                icon: Icons.tune_rounded,
                title: 'Confirmation Mode',
                subtitle: 'Smart (< 80% confidence)',
                onTap: () {
                  // TODO: Confirmation mode settings
                },
              ),
              const Divider(height: 1, indent: 56),
              _SettingsRow(
                icon: Icons.vibration_rounded,
                title: 'Haptic Feedback',
                trailing: Switch(
                  value: true,
                  onChanged: (value) {
                    // TODO: Toggle haptic
                  },
                  activeThumbColor: AppColors.primary,
                ),
              ),
              const Divider(height: 1, indent: 56),
              _SettingsRow(
                icon: Icons.notifications_rounded,
                title: 'Notifications',
                subtitle: 'Enabled',
                onTap: () {
                  // TODO: Notification settings
                },
              ),
            ],
          ),
        ),
      ],
    );
  }

  Widget _buildSubscriptionSection(BuildContext context) {
    return Column(
      crossAxisAlignment: CrossAxisAlignment.start,
      children: [
        Text(
          'Subscription',
          style: AppTypography.h4.copyWith(color: AppColors.textSecondary),
        ),
        const SizedBox(height: AppSpacing.md),

        // Pro plan card
        BaseCard(
          backgroundColor: AppColors.primary.withOpacity(0.08),
          child: Column(
            crossAxisAlignment: CrossAxisAlignment.start,
            children: [
              Row(
                children: [
                  Container(
                    padding: const EdgeInsets.symmetric(
                      horizontal: AppSpacing.sm,
                      vertical: AppSpacing.xxs,
                    ),
                    decoration: BoxDecoration(
                      color: AppColors.primary,
                      borderRadius: BorderRadius.circular(
                        AppSpacing.radiusFull,
                      ),
                    ),
                    child: Text(
                      'PRO',
                      style: AppTypography.labelSmall.copyWith(
                        color: AppColors.textOnPrimary,
                      ),
                    ),
                  ),
                  const SizedBox(width: AppSpacing.sm),
                  Text('Upgrade for more', style: AppTypography.widgetTitle),
                ],
              ),
              const SizedBox(height: AppSpacing.md),
              _buildProFeature('30 voice submissions per day'),
              _buildProFeature('Unlimited memory history'),
              _buildProFeature('Advanced insights & patterns'),
              _buildProFeature('Priority support'),
              const SizedBox(height: AppSpacing.lg),
              SizedBox(
                width: double.infinity,
                child: ElevatedButton(
                  onPressed: () {
                    // TODO: Open subscription
                  },
                  child: const Text('Upgrade to Pro'),
                ),
              ),
            ],
          ),
        ),
      ],
    );
  }

  Widget _buildProFeature(String text) {
    return Padding(
      padding: const EdgeInsets.only(bottom: AppSpacing.sm),
      child: Row(
        children: [
          const Icon(
            Icons.check_circle_rounded,
            color: AppColors.primary,
            size: 18,
          ),
          const SizedBox(width: AppSpacing.sm),
          Expanded(child: Text(text, style: AppTypography.body)),
        ],
      ),
    );
  }

  Widget _buildAboutSection(BuildContext context) {
    return Column(
      crossAxisAlignment: CrossAxisAlignment.start,
      children: [
        Text(
          'About',
          style: AppTypography.h4.copyWith(color: AppColors.textSecondary),
        ),
        const SizedBox(height: AppSpacing.md),

        BaseCard(
          padding: EdgeInsets.zero,
          child: Column(
            children: [
              _SettingsRow(
                icon: Icons.help_outline_rounded,
                title: 'Help & Support',
                onTap: () {},
              ),
              const Divider(height: 1, indent: 56),
              _SettingsRow(
                icon: Icons.privacy_tip_outlined,
                title: 'Privacy Policy',
                onTap: () {},
              ),
              const Divider(height: 1, indent: 56),
              _SettingsRow(
                icon: Icons.description_outlined,
                title: 'Terms of Service',
                onTap: () {},
              ),
              const Divider(height: 1, indent: 56),
              _SettingsRow(
                icon: Icons.info_outline_rounded,
                title: 'Version',
                subtitle: '1.0.0',
              ),
            ],
          ),
        ),

        const SizedBox(height: AppSpacing.lg),

        // Logout button
        SizedBox(
          width: double.infinity,
          child: OutlinedButton.icon(
            onPressed: () async {
              try {
                final auth = context.read<AppProvider>().authService;
                debugPrint('Attempting to sign out...');
                await auth.signOut();
                debugPrint('Sign out successful');
                if (context.mounted) {
                  ScaffoldMessenger.of(context).showSnackBar(
                    const SnackBar(content: Text('Signed out successfully')),
                  );
                }
              } catch (e) {
                debugPrint('Sign out failed: $e');
                if (context.mounted) {
                  ScaffoldMessenger.of(context).showSnackBar(
                    SnackBar(
                      content: Text('Sign out failed: $e'),
                      backgroundColor: AppColors.error,
                    ),
                  );
                }
              }
            },
            icon: const Icon(Icons.logout_rounded),
            label: const Text('Sign Out'),
            style: OutlinedButton.styleFrom(
              foregroundColor: AppColors.error,
              side: const BorderSide(color: AppColors.error),
            ),
          ),
        ),
      ],
    );
  }
}

class _SettingsRow extends StatelessWidget {
  final IconData icon;
  final String title;
  final String? subtitle;
  final Widget? trailing;
  final VoidCallback? onTap;

  const _SettingsRow({
    required this.icon,
    required this.title,
    this.subtitle,
    this.trailing,
    this.onTap,
  });

  @override
  Widget build(BuildContext context) {
    return InkWell(
      onTap: onTap,
      child: Padding(
        padding: const EdgeInsets.symmetric(
          horizontal: AppSpacing.md,
          vertical: AppSpacing.md,
        ),
        child: Row(
          children: [
            Icon(icon, color: AppColors.textSecondary, size: 24),
            const SizedBox(width: AppSpacing.md),
            Expanded(
              child: Column(
                crossAxisAlignment: CrossAxisAlignment.start,
                children: [
                  Text(title, style: AppTypography.body),
                  if (subtitle != null)
                    Text(subtitle!, style: AppTypography.caption),
                ],
              ),
            ),
            trailing ??
                (onTap != null
                    ? const Icon(
                        Icons.chevron_right_rounded,
                        color: AppColors.textTertiary,
                      )
                    : const SizedBox.shrink()),
          ],
        ),
      ),
    );
  }
}
