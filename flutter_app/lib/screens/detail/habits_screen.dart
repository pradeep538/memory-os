import 'package:flutter/material.dart';
import 'package:flutter/services.dart';
import 'package:provider/provider.dart';
import '../../config/app_colors.dart';
import '../../config/app_typography.dart';
import '../../config/app_spacing.dart';
import '../../models/habit_models.dart';
import '../../providers/app_provider.dart';
import '../../widgets/common/base_card.dart';
import '../../widgets/common/progress_ring.dart';

/// All Habits Screen - manage and view all habits
class HabitsScreen extends StatefulWidget {
  const HabitsScreen({super.key});

  @override
  State<HabitsScreen> createState() => _HabitsScreenState();
}

class _HabitsScreenState extends State<HabitsScreen>
    with SingleTickerProviderStateMixin {
  late TabController _tabController;
  List<Habit> _habits = [];
  bool _isLoading = true;
  String? _error;
  String _filter = 'active';

  @override
  void initState() {
    super.initState();
    _tabController = TabController(length: 3, vsync: this);
    _tabController.addListener(_onTabChanged);
    _loadHabits();
  }

  @override
  void dispose() {
    _tabController.dispose();
    super.dispose();
  }

  void _onTabChanged() {
    if (_tabController.indexIsChanging) return;
    final filters = ['active', 'paused', 'completed'];
    setState(() {
      _filter = filters[_tabController.index];
    });
    _loadHabits();
  }

  Future<void> _loadHabits() async {
    setState(() {
      _isLoading = true;
      _error = null;
    });

    final response = await context.read<AppProvider>().habitsService.getHabits(
          status: _filter,
        );

    if (mounted) {
      setState(() {
        _isLoading = false;
        if (response.success && response.data != null) {
          _habits = response.data!;
        } else {
          _error = response.error ?? 'Failed to load habits';
        }
      });
    }
  }

  Future<void> _toggleHabitCompletion(Habit habit) async {
    HapticFeedback.lightImpact();

    final response = await context
        .read<AppProvider>()
        .habitsService
        .completeHabit(habit.id, completed: true);

    if (response.success) {
      _loadHabits();
    }
  }

  @override
  Widget build(BuildContext context) {
    return Scaffold(
      backgroundColor: AppColors.background,
      appBar: AppBar(
        title: const Text('Habits'),
        actions: [
          IconButton(
            icon: const Icon(Icons.add_rounded),
            onPressed: () => _showCreateHabitSheet(),
          ),
        ],
        bottom: TabBar(
          controller: _tabController,
          labelColor: AppColors.primary,
          unselectedLabelColor: AppColors.textTertiary,
          indicatorColor: AppColors.primary,
          tabs: const [
            Tab(text: 'Active'),
            Tab(text: 'Paused'),
            Tab(text: 'Completed'),
          ],
        ),
      ),
      body: _isLoading
          ? const Center(child: CircularProgressIndicator())
          : _error != null
              ? _buildErrorState()
              : _habits.isEmpty
                  ? _buildEmptyState()
                  : _buildHabitsList(),
    );
  }

  Widget _buildHabitsList() {
    return RefreshIndicator(
      onRefresh: _loadHabits,
      child: ListView.builder(
        padding: const EdgeInsets.all(AppSpacing.screenPadding),
        itemCount: _habits.length,
        itemBuilder: (context, index) {
          final habit = _habits[index];
          return Padding(
            padding: const EdgeInsets.only(bottom: AppSpacing.md),
            child: _HabitCard(
              habit: habit,
              onTap: () => _showHabitDetail(habit),
              onComplete: () => _toggleHabitCompletion(habit),
            ),
          );
        },
      ),
    );
  }

  Widget _buildEmptyState() {
    return Center(
      child: Column(
        mainAxisAlignment: MainAxisAlignment.center,
        children: [
          Icon(Icons.task_alt_rounded, size: 64, color: AppColors.textTertiary),
          const SizedBox(height: AppSpacing.md),
          Text('No $_filter habits', style: AppTypography.h4),
          const SizedBox(height: AppSpacing.sm),
          Text(
            _filter == 'active'
                ? 'Create your first habit to get started'
                : 'No habits in this category',
            style: AppTypography.body.copyWith(color: AppColors.textSecondary),
          ),
          if (_filter == 'active') ...[
            const SizedBox(height: AppSpacing.lg),
            ElevatedButton.icon(
              onPressed: _showCreateHabitSheet,
              icon: const Icon(Icons.add_rounded),
              label: const Text('Create Habit'),
            ),
          ],
        ],
      ),
    );
  }

  Widget _buildErrorState() {
    return Center(
      child: Column(
        mainAxisAlignment: MainAxisAlignment.center,
        children: [
          Icon(Icons.error_outline_rounded, size: 48, color: AppColors.error),
          const SizedBox(height: AppSpacing.md),
          Text(_error!, style: AppTypography.body),
          const SizedBox(height: AppSpacing.md),
          ElevatedButton(onPressed: _loadHabits, child: const Text('Retry')),
        ],
      ),
    );
  }

  void _showHabitDetail(Habit habit) {
    Navigator.of(context).push(
      MaterialPageRoute(builder: (context) => HabitDetailScreen(habit: habit)),
    );
  }

  void _showCreateHabitSheet() {
    showModalBottomSheet(
      context: context,
      isScrollControlled: true,
      backgroundColor: Colors.transparent,
      builder: (context) => const _HabitFormSheet(),
    ).then((result) {
      if (result == true) {
        if (mounted) {
          ScaffoldMessenger.of(context).showSnackBar(
            const SnackBar(content: Text('Habit created successfully 🎉')),
          );
        }
      }
      _loadHabits();
    });
  }
}

class _HabitCard extends StatelessWidget {
  final Habit habit;
  final VoidCallback? onTap;
  final VoidCallback? onComplete;

  const _HabitCard({required this.habit, this.onTap, this.onComplete});

  @override
  Widget build(BuildContext context) {
    final categoryColor = AppColors.getCategoryColor(habit.category);

    return BaseCard(
      onTap: onTap,
      child: Column(
        crossAxisAlignment: CrossAxisAlignment.start,
        children: [
          Row(
            children: [
              // Complete button (active habits)
              if (habit.isActive)
                habit.isCompletedToday
                    ? Container(
                        width: 28,
                        height: 28,
                        decoration: BoxDecoration(
                          color: AppColors.success,
                          shape: BoxShape.circle,
                        ),
                        child: const Icon(
                          Icons.check_rounded,
                          size: 16,
                          color: AppColors.textOnPrimary,
                        ),
                      )
                    : GestureDetector(
                        onTap: onComplete,
                        child: Container(
                          width: 28,
                          height: 28,
                          decoration: BoxDecoration(
                            color: AppColors.primary.withAlpha(25),
                            shape: BoxShape.circle,
                            border:
                                Border.all(color: AppColors.primary, width: 2),
                          ),
                          child: const Icon(
                            Icons.check_rounded,
                            size: 16,
                            color: AppColors.primary,
                          ),
                        ),
                      ),
              const SizedBox(width: AppSpacing.md),

              // Category indicator
              Container(
                width: 4,
                height: 32,
                decoration: BoxDecoration(
                  color: categoryColor,
                  borderRadius: BorderRadius.circular(2),
                ),
              ),
              const SizedBox(width: AppSpacing.md),

              // Habit info
              Expanded(
                child: Column(
                  crossAxisAlignment: CrossAxisAlignment.start,
                  children: [
                    Text(habit.habitName, style: AppTypography.h4),
                    const SizedBox(height: AppSpacing.xxs),
                    Text(habit.frequencyText, style: AppTypography.caption),
                  ],
                ),
              ),

              // Streak
              if (habit.currentStreak > 0)
                Container(
                  padding: const EdgeInsets.symmetric(
                    horizontal: AppSpacing.sm,
                    vertical: AppSpacing.xs,
                  ),
                  decoration: BoxDecoration(
                    color: AppColors.warning.withAlpha(38),
                    borderRadius: BorderRadius.circular(AppSpacing.radiusFull),
                  ),
                  child: Row(
                    mainAxisSize: MainAxisSize.min,
                    children: [
                      const Text('🔥', style: TextStyle(fontSize: 14)),
                      const SizedBox(width: 4),
                      Text(
                        '${habit.currentStreak}',
                        style: AppTypography.label.copyWith(
                          color: AppColors.warning,
                        ),
                      ),
                    ],
                  ),
                ),
            ],
          ),

          const SizedBox(height: AppSpacing.md),

          // Progress bar
          Row(
            children: [
              Expanded(
                child: ClipRRect(
                  borderRadius: BorderRadius.circular(4),
                  child: LinearProgressIndicator(
                    value: habit.completionRate / 100,
                    backgroundColor: AppColors.borderLight,
                    valueColor: AlwaysStoppedAnimation<Color>(categoryColor),
                    minHeight: 6,
                  ),
                ),
              ),
              const SizedBox(width: AppSpacing.md),
              Text(
                '${habit.completionRate.toStringAsFixed(0)}%',
                style: AppTypography.labelSmall.copyWith(
                  color: AppColors.textSecondary,
                ),
              ),
            ],
          ),
        ],
      ),
    );
  }
}

/// Habit Detail Screen
class HabitDetailScreen extends StatefulWidget {
  final Habit habit;

  const HabitDetailScreen({super.key, required this.habit});

  @override
  State<HabitDetailScreen> createState() => _HabitDetailScreenState();
}

class _HabitDetailScreenState extends State<HabitDetailScreen> {
  HabitProgress? _progress;
  bool _isLoading = true;

  @override
  void initState() {
    super.initState();
    _loadProgress();
  }

  Future<void> _loadProgress() async {
    final response = await context
        .read<AppProvider>()
        .habitsService
        .getHabitProgress(widget.habit.id);

    if (mounted) {
      setState(() {
        _isLoading = false;
        if (response.success && response.data != null) {
          _progress = response.data;
        }
      });
    }
  }

  @override
  Widget build(BuildContext context) {
    final habit = widget.habit;
    final categoryColor = AppColors.getCategoryColor(habit.category);

    return Scaffold(
      backgroundColor: AppColors.background,
      appBar: AppBar(
        title: Text(habit.habitName),
        actions: [
          IconButton(
            icon: const Icon(Icons.edit_rounded),
            onPressed: () {
              showModalBottomSheet(
                context: context,
                isScrollControlled: true,
                backgroundColor: Colors.transparent,
                builder: (context) => _HabitFormSheet(habit: habit),
              ).then((result) {
                if (result == true) {
                  if (mounted) {
                    ScaffoldMessenger.of(context).showSnackBar(
                      const SnackBar(
                        content: Text('Habit updated successfully ✅'),
                      ),
                    );
                  }
                }
                // Reload progress/habit details if needed
                _loadProgress();
                setState(() {});
              });
            },
          ),
          IconButton(
            icon: const Icon(Icons.delete_outline_rounded),
            onPressed: () {
              // TODO: Delete habit
            },
          ),
        ],
      ),
      body: _isLoading
          ? const Center(child: CircularProgressIndicator())
          : SingleChildScrollView(
              padding: const EdgeInsets.all(AppSpacing.screenPadding),
              child: Column(
                crossAxisAlignment: CrossAxisAlignment.start,
                children: [
                  // Stats cards
                  Row(
                    children: [
                      Expanded(
                        child: _StatCard(
                          title: 'Current Streak',
                          value:
                              '${_progress?.currentStreak ?? habit.currentStreak}',
                          icon: '🔥',
                          color: AppColors.warning,
                        ),
                      ),
                      const SizedBox(width: AppSpacing.md),
                      Expanded(
                        child: _StatCard(
                          title: 'Longest Streak',
                          value:
                              '${_progress?.longestStreak ?? habit.longestStreak}',
                          icon: '🏆',
                          color: AppColors.success,
                        ),
                      ),
                    ],
                  ),
                  const SizedBox(height: AppSpacing.md),
                  Row(
                    children: [
                      Expanded(
                        child: _StatCard(
                          title: 'Completion Rate',
                          value:
                              '${(_progress?.completionRate ?? habit.completionRate).toStringAsFixed(0)}%',
                          icon: '📊',
                          color: categoryColor,
                        ),
                      ),
                      const SizedBox(width: AppSpacing.md),
                      Expanded(
                        child: _StatCard(
                          title: 'Total Completions',
                          value: '${_progress?.totalCompletions ?? 0}',
                          icon: '✅',
                          color: AppColors.info,
                        ),
                      ),
                    ],
                  ),

                  const SizedBox(height: AppSpacing.xl),

                  // Completion ring
                  Center(
                    child: ProgressRing(
                      progress: (habit.completionRate) / 100,
                      size: 160,
                      strokeWidth: 12,
                      progressColor: categoryColor,
                      child: Column(
                        mainAxisSize: MainAxisSize.min,
                        children: [
                          Text(
                            '${habit.completionRate.toStringAsFixed(0)}%',
                            style: AppTypography.numberLarge.copyWith(
                              color: categoryColor,
                            ),
                          ),
                          Text('Complete', style: AppTypography.caption),
                        ],
                      ),
                    ),
                  ),

                  const SizedBox(height: AppSpacing.xl),

                  // History
                  Text('History', style: AppTypography.h4),
                  const SizedBox(height: AppSpacing.md),

                  if (_progress?.history.isNotEmpty ?? false)
                    BaseCard(
                      padding: EdgeInsets.zero,
                      child: Column(
                        children: _progress!.history.take(10).map((item) {
                          return ListTile(
                            leading: Icon(
                              item.completed
                                  ? Icons.check_circle_rounded
                                  : Icons.cancel_rounded,
                              color: item.completed
                                  ? AppColors.success
                                  : AppColors.error,
                            ),
                            title: Text(
                              _formatDate(item.date),
                              style: AppTypography.body,
                            ),
                            subtitle: item.notes != null
                                ? Text(
                                    item.notes!,
                                    style: AppTypography.caption,
                                  )
                                : null,
                          );
                        }).toList(),
                      ),
                    )
                  else
                    Center(
                      child: Text(
                        'No history yet',
                        style: AppTypography.body.copyWith(
                          color: AppColors.textTertiary,
                        ),
                      ),
                    ),
                ],
              ),
            ),
    );
  }

  String _formatDate(DateTime date) {
    final now = DateTime.now();
    final diff = now.difference(date);

    if (diff.inDays == 0) return 'Today';
    if (diff.inDays == 1) return 'Yesterday';
    if (diff.inDays < 7) return '${diff.inDays} days ago';
    return '${date.day}/${date.month}/${date.year}';
  }
}

class _StatCard extends StatelessWidget {
  final String title;
  final String value;
  final String icon;
  final Color color;

  const _StatCard({
    required this.title,
    required this.value,
    required this.icon,
    required this.color,
  });

  @override
  Widget build(BuildContext context) {
    return BaseCard(
      child: Column(
        crossAxisAlignment: CrossAxisAlignment.start,
        children: [
          Row(
            children: [
              Text(icon, style: const TextStyle(fontSize: 20)),
              const Spacer(),
            ],
          ),
          const SizedBox(height: AppSpacing.sm),
          Text(value, style: AppTypography.numberMedium.copyWith(color: color)),
          const SizedBox(height: AppSpacing.xxs),
          Text(title, style: AppTypography.caption),
        ],
      ),
    );
  }
}

/// Create/Edit Habit Bottom Sheet
class _HabitFormSheet extends StatefulWidget {
  final Habit? habit;

  const _HabitFormSheet({this.habit});

  @override
  State<_HabitFormSheet> createState() => _HabitFormSheetState();
}

class _HabitFormSheetState extends State<_HabitFormSheet> {
  late TextEditingController _nameController;
  late TextEditingController _frequencyController;
  late String _selectedCategory;
  late String _habitType;
  int _frequency = 1; // Default
  late String _frequencyUnit;
  late bool _isActive;
  bool _isLoading = false;

  final _categories = [
    'fitness',
    'finance',
    'health',
    'mindfulness',
    'routine',
  ];
  final _frequencyUnits = ['day', 'week', 'month'];

  @override
  void initState() {
    super.initState();
    final h = widget.habit;
    _nameController = TextEditingController(text: h?.habitName ?? '');
    _frequencyController =
        TextEditingController(text: '${h?.targetFrequency ?? 1}');
    _selectedCategory = h?.category ?? 'routine';
    _habitType = h?.habitType ?? 'build';
    _isActive = (h?.status ?? 'active') == 'active';
    // Map backend units (daily/weekly/monthly) to frontend units (day/week/month) if needed,
    // or assume they match now. Let's normalize:
    _frequencyUnit = (h?.targetFrequencyUnit ?? 'day')
        .replaceFirst('ly', '') // daily->dai (oops), daily->day
        .replaceAll('dai', 'day') // fix daily -> day
        .replaceAll('ily', 'y'); // daily -> day (simpler approach below)

    // Better normalization:
    if (_frequencyUnit.endsWith('ly')) {
      _frequencyUnit = _frequencyUnit.substring(0, _frequencyUnit.length - 2);
      if (_frequencyUnit == 'dai') _frequencyUnit = 'day';
    }
  }

  @override
  void dispose() {
    _nameController.dispose();
    _frequencyController.dispose();
    super.dispose();
  }

  Future<void> _submit() async {
    if (_nameController.text.trim().isEmpty) return;

    setState(() => _isLoading = true);

    final service = context.read<AppProvider>().habitsService;
    final name = _nameController.text.trim();

    // Check if creating or editing
    final response = widget.habit == null
        ? await service.createHabit(
            habitName: name,
            habitType: _habitType,
            category: _selectedCategory,
            targetFrequency: _frequency,
            targetFrequencyUnit: _frequencyUnit,
          )
        : await service.updateHabit(
            widget.habit!.id,
            habitName: name,
            status: _isActive ? 'active' : 'paused',
            targetFrequency: _frequency,
            targetFrequencyUnit: _frequencyUnit,
            // We aren't implementing all fields in this simple form yet
          );

    setState(() => _isLoading = false);

    if (response.success && mounted) {
      Navigator.of(context).pop(true);
    }
  }

  @override
  Widget build(BuildContext context) {
    return Container(
      decoration: const BoxDecoration(
        color: AppColors.surface,
        borderRadius: BorderRadius.vertical(
          top: Radius.circular(AppSpacing.radiusXl),
        ),
      ),
      padding: EdgeInsets.only(
        left: AppSpacing.lg,
        right: AppSpacing.lg,
        top: AppSpacing.lg,
        bottom: MediaQuery.of(context).viewInsets.bottom + AppSpacing.lg,
      ),
      child: SingleChildScrollView(
        child: Column(
          mainAxisSize: MainAxisSize.min,
          crossAxisAlignment: CrossAxisAlignment.start,
          children: [
            // Handle
            Center(
              child: Container(
                width: 40,
                height: 4,
                decoration: BoxDecoration(
                  color: AppColors.border,
                  borderRadius: BorderRadius.circular(2),
                ),
              ),
            ),
            const SizedBox(height: AppSpacing.lg),

            Text(
              widget.habit == null ? 'Create Habit' : 'Edit Habit',
              style: AppTypography.h3,
            ),
            const SizedBox(height: AppSpacing.lg),

            // Name input
            TextField(
              controller: _nameController,
              decoration: const InputDecoration(
                labelText: 'Habit name',
                hintText: 'e.g., Morning meditation',
              ),
              textCapitalization: TextCapitalization.sentences,
            ),
            const SizedBox(height: AppSpacing.lg),

            // Habit type
            Text('Type', style: AppTypography.label),
            const SizedBox(height: AppSpacing.sm),
            Row(
              children: [
                Expanded(
                  child: _SelectableChip(
                    label: 'Build',
                    isSelected: _habitType == 'build',
                    onTap: () => setState(() => _habitType = 'build'),
                  ),
                ),
                const SizedBox(width: AppSpacing.sm),
                Expanded(
                  child: _SelectableChip(
                    label: 'Quit',
                    isSelected: _habitType == 'quit',
                    onTap: () => setState(() => _habitType = 'quit'),
                  ),
                ),
              ],
            ),
            const SizedBox(height: AppSpacing.lg),

            // Category
            Text('Category', style: AppTypography.label),
            const SizedBox(height: AppSpacing.sm),
            Wrap(
              spacing: AppSpacing.sm,
              runSpacing: AppSpacing.sm,
              children: _categories.map((cat) {
                return _SelectableChip(
                  label: cat[0].toUpperCase() + cat.substring(1),
                  isSelected: _selectedCategory == cat,
                  color: AppColors.getCategoryColor(cat),
                  onTap: () => setState(() => _selectedCategory = cat),
                );
              }).toList(),
            ),
            const SizedBox(height: AppSpacing.lg),

            // Frequency
            Text('Frequency', style: AppTypography.label),
            const SizedBox(height: AppSpacing.sm),
            Row(
              children: [
                SizedBox(
                  width: 80,
                  child: TextField(
                    keyboardType: TextInputType.number,
                    textAlign: TextAlign.center,
                    decoration: const InputDecoration(
                      contentPadding: EdgeInsets.symmetric(
                        horizontal: AppSpacing.sm,
                        vertical: AppSpacing.sm,
                      ),
                    ),
                    controller: _frequencyController,
                    onChanged: (v) {
                      final val = int.tryParse(v);
                      if (val != null && val > 0) {
                        _frequency = val;
                        // No setState needed unless UI depends on _frequency value elsewhere
                      }
                    },
                  ),
                ),
                const SizedBox(width: AppSpacing.md),
                const Text('times per'),
                const SizedBox(width: AppSpacing.md),
                DropdownButton<String>(
                  value: _frequencyUnit,
                  items: _frequencyUnits
                      .map((u) => DropdownMenuItem(value: u, child: Text(u)))
                      .toList(),
                  onChanged: (v) {
                    if (v != null) setState(() => _frequencyUnit = v);
                  },
                ),
              ],
            ),
            const SizedBox(height: AppSpacing.xl),

            // Active/Paused Toggle
            SwitchListTile(
              title: const Text('Active Habit'),
              subtitle: Text(
                _isActive
                    ? 'Habit will appear in your feed'
                    : 'Habit is paused',
              ),
              value: _isActive,
              onChanged: (bool value) {
                setState(() {
                  _isActive = value;
                });
              },
              contentPadding: EdgeInsets.zero,
            ),
            const SizedBox(height: AppSpacing.lg),

            // Create button
            SizedBox(
              width: double.infinity,
              child: ElevatedButton(
                onPressed: _isLoading ? null : _submit,
                child: _isLoading
                    ? const SizedBox(
                        width: 20,
                        height: 20,
                        child: CircularProgressIndicator(strokeWidth: 2),
                      )
                    : Text(
                        widget.habit == null ? 'Create Habit' : 'Save Changes',
                      ),
              ),
            ),
          ],
        ),
      ),
    );
  }
}

class _SelectableChip extends StatelessWidget {
  final String label;
  final bool isSelected;
  final Color? color;
  final VoidCallback onTap;

  const _SelectableChip({
    required this.label,
    required this.isSelected,
    this.color,
    required this.onTap,
  });

  @override
  Widget build(BuildContext context) {
    final effectiveColor = color ?? AppColors.primary;

    return GestureDetector(
      onTap: onTap,
      child: Container(
        padding: const EdgeInsets.symmetric(
          horizontal: AppSpacing.md,
          vertical: AppSpacing.sm,
        ),
        decoration: BoxDecoration(
          color:
              isSelected ? effectiveColor.withAlpha(25) : AppColors.inputFill,
          borderRadius: BorderRadius.circular(AppSpacing.radiusFull),
          border: Border.all(
            color: isSelected ? effectiveColor : AppColors.border,
            width: isSelected ? 2 : 1,
          ),
        ),
        child: Text(
          label,
          style: AppTypography.label.copyWith(
            color: isSelected ? effectiveColor : AppColors.textSecondary,
          ),
          textAlign: TextAlign.center,
        ),
      ),
    );
  }
}
