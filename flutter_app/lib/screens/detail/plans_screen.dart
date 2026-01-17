import 'package:flutter/material.dart';
import '../../models/plan_model.dart';
import '../../services/plans_service.dart';
import '../../services/api_client.dart';
import '../../services/input_service.dart';
import 'package:intl/intl.dart';

import '../../config/app_colors.dart';
import 'architect_dialog.dart';

class PlansScreen extends StatefulWidget {
  const PlansScreen({Key? key}) : super(key: key);

  @override
  _PlansScreenState createState() => _PlansScreenState();
}

class _PlansScreenState extends State<PlansScreen> {
  late PlansService _plansService;
  late InputService _inputService;
  List<ActionPlan> _plans = [];
  bool _isLoading = true;

  @override
  void initState() {
    super.initState();
    // Instantiate service locally for now
    final apiClient = ApiClient();
    _plansService = PlansService(apiClient);
    _inputService = InputService(apiClient);
    _loadPlans();
  }

  Future<void> _loadPlans() async {
    setState(() => _isLoading = true);
    final plans = await _plansService.getActivePlans();
    if (mounted) {
      setState(() {
        _plans = plans;
        _isLoading = false;
      });
    }
  }

  Future<void> _generatePlan() async {
    // Show modal bottom sheet for better keyboard handling
    final result = await showModalBottomSheet<Map<String, String>>(
      context: context,
      isScrollControlled: true,
      backgroundColor: AppColors.surface,
      shape: const RoundedRectangleBorder(
        borderRadius: BorderRadius.vertical(top: Radius.circular(24)),
      ),
      builder: (context) => _CreatePlanDialog(inputService: _inputService),
    );

    if (result != null) {
      setState(() => _isLoading = true);
      final newPlan = await _plansService.createPlan({
        'name': result['name'],
        'category': result['category'],
        'goal': result['goal'],
        'frequency':
            result['frequency'], // Logic inside createPlan/backend handles this
        'duration_weeks': int.parse(result['duration'] ?? '4'),
        'schedule_details': result['schedule'] ?? '',
      });

      if (newPlan != null && mounted) {
        // Refresh list
        _loadPlans();

        // Check for enhancement (Name differs from raw Goal)
        if (newPlan.title != result['goal']) {
          ScaffoldMessenger.of(context).showSnackBar(
            SnackBar(
              content: Text("✨ AI polished your plan: \"${newPlan.title}\""),
              backgroundColor: AppColors.primary,
              duration: const Duration(seconds: 4),
            ),
          );
        } else {
          ScaffoldMessenger.of(context).showSnackBar(
            const SnackBar(content: Text('Plan generated successfully! 🚀')),
          );
        }
        Navigator.pop(context); // Close dialog
      } else {
        setState(() => _isLoading = false);
        if (mounted) {
          ScaffoldMessenger.of(context).showSnackBar(
            const SnackBar(content: Text('Failed to generate plan')),
          );
        }
      }
    }
  }

  Future<void> _showCreateOptions() async {
    showModalBottomSheet(
      context: context,
      backgroundColor: AppColors.surface,
      shape: const RoundedRectangleBorder(
        borderRadius: BorderRadius.vertical(top: Radius.circular(24)),
      ),
      builder: (context) => SafeArea(
        child: Column(
          mainAxisSize: MainAxisSize.min,
          children: [
            const SizedBox(height: 16),
            const Text(
              "New Blueprint",
              style: TextStyle(fontSize: 18, fontWeight: FontWeight.bold),
            ),
            const SizedBox(height: 16),
            ListTile(
              leading: Container(
                padding: const EdgeInsets.all(8),
                decoration: BoxDecoration(
                  color: AppColors.primary.withOpacity(0.1),
                  shape: BoxShape.circle,
                ),
                child: const Icon(Icons.mic, color: AppColors.primary),
              ),
              title: const Text("Design with Kairo (AI)"),
              subtitle: const Text("Voice-guided creation"),
              onTap: () {
                Navigator.pop(context);
                _startArchitectSession();
              },
            ),
            ListTile(
              leading: Container(
                padding: const EdgeInsets.all(8),
                decoration: BoxDecoration(
                  color: Colors.grey[200],
                  shape: BoxShape.circle,
                ),
                child: const Icon(Icons.edit, color: Colors.grey),
              ),
              title: const Text("Draft Manually"),
              subtitle: const Text("Fill out the form yourself"),
              onTap: () {
                Navigator.pop(context);
                _generatePlan();
              },
            ),
            const SizedBox(height: 16),
          ],
        ),
      ),
    );
  }

  Future<void> _startArchitectSession() async {
    final result = await showModalBottomSheet<bool>(
      context: context,
      isScrollControlled: true,
      backgroundColor: Colors.transparent,
      builder: (context) => ArchitectSessionDialog(
        plansService: _plansService,
        inputService: _inputService,
      ),
    );

    if (result == true) {
      _loadPlans();
      if (mounted) {
        ScaffoldMessenger.of(context).showSnackBar(
          const SnackBar(content: Text('Blueprint created! 🚀')),
        );
      }
    }
  }

  Future<void> _editPlan(ActionPlan plan) async {
    final result = await showModalBottomSheet<Map<String, String>>(
      context: context,
      isScrollControlled: true,
      backgroundColor: AppColors.surface,
      shape: const RoundedRectangleBorder(
        borderRadius: BorderRadius.vertical(top: Radius.circular(24)),
      ),
      builder: (context) =>
          _CreatePlanDialog(existingPlan: plan, inputService: _inputService),
    );

    if (result != null) {
      setState(() => _isLoading = true);
      final updatedPlan = await _plansService.updatePlan(plan.id, {
        'category': result['category'],
        'goal': result['goal'],
        // Frequency changes might require more complex backend logic in future
        // For now we just send what we have, though backend currently only updates description/name/category
        'plan_name': result['name'], // Explicit name
        'duration_weeks': int.parse(result['duration'] ?? '4'),
        // We aren't updating schedule on edit yet, only creation for now
      });

      if (updatedPlan != null && mounted) {
        _loadPlans();
        ScaffoldMessenger.of(context).showSnackBar(
          const SnackBar(content: Text('Blueprint updated successfully! ✨')),
        );
      } else {
        setState(() => _isLoading = false);
        if (mounted) {
          ScaffoldMessenger.of(context).showSnackBar(
            const SnackBar(content: Text('Failed to update blueprint')),
          );
        }
      }
    }
  }

  Future<void> _archivePlan(ActionPlan plan) async {
    final confirm = await showDialog<bool>(
      context: context,
      builder: (context) => AlertDialog(
        backgroundColor: AppColors.surface,
        title: const Text('Archive Blueprint?',
            style: TextStyle(color: AppColors.textPrimary)),
        content: const Text(
          'This will move the blueprint to your archives. You can still view it later (coming soon).',
          style: TextStyle(color: AppColors.textSecondary),
        ),
        actions: [
          TextButton(
            onPressed: () => Navigator.pop(context, false),
            child: const Text('Cancel'),
          ),
          TextButton(
            onPressed: () => Navigator.pop(context, true),
            child: const Text('Archive', style: TextStyle(color: Colors.red)),
          ),
        ],
      ),
    );

    if (confirm == true) {
      setState(() => _isLoading = true);
      final success = await _plansService.archivePlan(plan.id);

      if (success && mounted) {
        _loadPlans();
        ScaffoldMessenger.of(context).showSnackBar(
          const SnackBar(content: Text('Blueprint archived 📦')),
        );
      } else {
        setState(() => _isLoading = false);
        if (mounted) {
          ScaffoldMessenger.of(context).showSnackBar(
            const SnackBar(content: Text('Failed to archive blueprint')),
          );
        }
      }
    }
  }

  @override
  Widget build(BuildContext context) {
    return Scaffold(
      backgroundColor: AppColors.background,
      appBar: AppBar(
        title: const Text('My Blueprints'),
        backgroundColor: Colors.transparent,
        elevation: 0,
        foregroundColor: AppColors.textPrimary,
      ),
      floatingActionButton: FloatingActionButton.extended(
        onPressed: _showCreateOptions,
        label: const Text('New Blueprint'),
        icon: const Icon(Icons.add),
        backgroundColor: AppColors.primary,
        foregroundColor: Colors.white,
      ),
      body: _isLoading
          ? const Center(
              child: CircularProgressIndicator(color: AppColors.primary))
          : _plans.isEmpty
              ? _EmptyState(onGenerate: _generatePlan)
              : ListView.builder(
                  padding: const EdgeInsets.all(16),
                  itemCount: _plans.length,
                  itemBuilder: (context, index) {
                    return ActionPlanCard(
                      plan: _plans[index],
                      onEdit: () => _editPlan(_plans[index]),
                      onArchive: () => _archivePlan(_plans[index]),
                    );
                  },
                ),
    );
  }
}

class ActionPlanCard extends StatelessWidget {
  final ActionPlan plan;
  final VoidCallback onEdit;
  final VoidCallback onArchive;

  const ActionPlanCard({
    Key? key,
    required this.plan,
    required this.onEdit,
    required this.onArchive,
  }) : super(key: key);

  @override
  Widget build(BuildContext context) {
    // Determine current phase details
    // Current week is 1-based, phases list is 0-based
    final phaseIndex = plan.phases.isEmpty
        ? 0
        : (plan.currentWeek - 1).clamp(0, plan.phases.length - 1);
    final currentPhase =
        plan.phases.isNotEmpty ? plan.phases[phaseIndex] : null;

    // Parse target from string "3" or "3x/week" to int for progress calculation
    int targetCount = 1;
    if (currentPhase != null) {
      // dynamic parsing: if target contains digits, extract them
      final match = RegExp(r'\d+').firstMatch(currentPhase.target);
      if (match != null) {
        targetCount = int.parse(match.group(0)!);
      }
    }

    final double progressPercent =
        (plan.progress / (targetCount == 0 ? 1 : targetCount)).clamp(0.0, 1.0);

    return Card(
      color: AppColors.surface,
      shape: RoundedRectangleBorder(borderRadius: BorderRadius.circular(16)),
      margin: const EdgeInsets.only(bottom: 16),
      elevation: 2,
      child: Padding(
        padding: const EdgeInsets.all(16),
        child: Column(
          crossAxisAlignment: CrossAxisAlignment.start,
          children: [
            // Blueprint Label (Optional schematic look)
            Text("BLUEPRINT SCHEMATIC",
                style: TextStyle(
                    color: AppColors.textSecondary.withOpacity(0.5),
                    fontSize: 10,
                    letterSpacing: 1.5,
                    fontWeight: FontWeight.bold)),
            const SizedBox(height: 12),

            // Title & Options Row
            Row(
              crossAxisAlignment: CrossAxisAlignment.start,
              children: [
                Expanded(
                  child: Text(
                    plan.title,
                    style: TextStyle(
                      fontSize: 18,
                      fontWeight: FontWeight.bold,
                      color: AppColors.textPrimary,
                    ),
                  ),
                ),
                // Options Menu
                SizedBox(
                  height: 24,
                  width: 24,
                  child: PopupMenuButton<String>(
                    padding: EdgeInsets.zero,
                    icon:
                        Icon(Icons.more_horiz, color: AppColors.textSecondary),
                    color: AppColors.surface,
                    onSelected: (value) {
                      if (value == 'edit') onEdit();
                      if (value == 'archive') onArchive();
                    },
                    itemBuilder: (context) => [
                      const PopupMenuItem(
                        value: 'edit',
                        child: Text('Edit Blueprint'),
                      ),
                      const PopupMenuItem(
                        value: 'archive',
                        child: Text('Archive',
                            style: TextStyle(color: Colors.red)),
                      ),
                    ],
                  ),
                ),
              ],
            ),

            const SizedBox(height: 8),

            // Week Badge
            Container(
              padding: const EdgeInsets.symmetric(horizontal: 8, vertical: 4),
              decoration: BoxDecoration(
                color: AppColors.background,
                borderRadius: BorderRadius.circular(8),
              ),
              child: Text(
                plan.durationWeeks >= 52
                    ? 'Week ${plan.currentWeek} (Ongoing)'
                    : 'Week ${plan.currentWeek} of ${plan.durationWeeks}',
                style: TextStyle(
                  color: AppColors.primary,
                  fontSize: 12,
                  fontWeight: FontWeight.bold,
                ),
              ),
            ),
            const SizedBox(height: 16),

            // Phase Goal
            if (currentPhase != null) ...[
              Text(
                currentPhase.goal,
                style: TextStyle(color: AppColors.textSecondary, fontSize: 14),
              ),
              const SizedBox(height: 16),
            ],

            // Progress Bar (Segmented or Linear)
            _buildProgressIndicators(targetCount, plan.progress),
            const SizedBox(height: 8),

            // Status Text
            Row(
              mainAxisAlignment: MainAxisAlignment.spaceBetween,
              children: [
                Text(
                  '${plan.progress} / $targetCount sessions',
                  style: TextStyle(
                      color: AppColors.textSecondary,
                      fontWeight: FontWeight.bold),
                ),
                Text(
                  '${(progressPercent * 100).toInt()}%',
                  style: TextStyle(
                      color: AppColors.primary, fontWeight: FontWeight.bold),
                ),
              ],
            ),

            if (progressPercent >= 1.0)
              Padding(
                padding: const EdgeInsets.only(top: 12.0),
                child: Row(
                  children: const [
                    Icon(Icons.check_circle, color: Colors.green, size: 16),
                    SizedBox(width: 6),
                    Text("Weekly Goal Complete!",
                        style: TextStyle(color: Colors.green, fontSize: 12))
                  ],
                ),
              ),

            // Duration / End Date info
            if (plan.startDate != null && plan.durationWeeks < 52)
              Padding(
                padding: const EdgeInsets.only(top: 12.0),
                child: Row(
                  children: [
                    Icon(Icons.calendar_today,
                        size: 14, color: AppColors.textSecondary),
                    const SizedBox(width: 6),
                    Text(
                        "Ends: ${_formatDate(plan.startDate!.add(Duration(days: plan.durationWeeks * 7)))}",
                        style: TextStyle(
                            color: AppColors.textSecondary, fontSize: 12)),
                  ],
                ),
              )
          ],
        ),
      ),
    );
  }

  String _formatDate(DateTime date) {
    return "${date.day}/${date.month}/${date.year}";
  }

  Widget _buildProgressIndicators(int total, int current) {
    // If target is 1 (or 0 treated as 1) or very large, use linear bar
    // But for 1, a linear bar is basically a boolean block.
    // Let's use segmented for anything identifying as discrete counts up to 7
    // If total is 1, it just shows 1 block.

    if (total > 7) {
      // Use linear bar for large numbers (e.g. 30 minutes, 10k steps)
      // Unless we want strictly Session based. Assuming 'sessions' <= 7/day usually.
      return ClipRRect(
        borderRadius: BorderRadius.circular(8),
        child: LinearProgressIndicator(
          value: (current / (total == 0 ? 1 : total)).clamp(0.0, 1.0),
          minHeight: 12,
          backgroundColor: AppColors.background,
          color: AppColors.primary,
        ),
      );
    }

    // Segmented Display for counts 1..7
    // e.g. [==] [==] [==]
    return Row(
      children: List.generate(total, (index) {
        bool isCompleted = index < current;
        return Expanded(
          child: Container(
            margin: EdgeInsets.only(right: index == total - 1 ? 0 : 4),
            height: 12,
            decoration: BoxDecoration(
                color: isCompleted ? AppColors.primary : AppColors.background,
                borderRadius: BorderRadius.circular(4),
                border: Border.all(
                  color:
                      isCompleted ? Colors.transparent : AppColors.background,
                  // optional border
                )),
          ),
        );
      }),
    );
  }
}

class _CreatePlanDialog extends StatefulWidget {
  final ActionPlan? existingPlan;
  final InputService inputService; // Dependency injection

  const _CreatePlanDialog(
      {Key? key, this.existingPlan, required this.inputService})
      : super(key: key);

  @override
  __CreatePlanDialogState createState() => __CreatePlanDialogState();
}

class __CreatePlanDialogState extends State<_CreatePlanDialog> {
  final _formKey = GlobalKey<FormState>();
  String _selectedCategory = 'fitness';
  final TextEditingController _nameController = TextEditingController();
  final TextEditingController _goalController = TextEditingController();
  final TextEditingController _domainController = TextEditingController();
  List<TextEditingController> _scheduleControllers = [];

  // Universal Frequency State
  String _selectedPeriod = 'Daily';
  int _selectedCount = 1;
  int _selectedDuration = 4; // Default to 4 weeks

  bool _isEditing = false;
  bool _isPolishing = false; // Loading state for AI

  final Map<String, IconData> _categories = {
    'fitness': Icons.fitness_center,
    'finance': Icons.attach_money,
    'routine': Icons.schedule,
    'mindfulness': Icons.self_improvement,
    'health': Icons.favorite,
    'medication': Icons.medication,
    'custom': Icons.edit,
  };

  @override
  void initState() {
    super.initState();
    if (widget.existingPlan != null) {
      _isEditing = true;
      _selectedCategory = widget.existingPlan!.category.toLowerCase();
      // Ensure category is valid or default to 'custom'
      if (!_categories.containsKey(_selectedCategory)) {
        if (_selectedCategory == 'medication' ||
            _selectedCategory == 'health') {
          // keep as is
        } else {
          _selectedCategory = 'custom';
          _domainController.text = widget.existingPlan!.category;
        }
      }

      _nameController.text = widget.existingPlan!.title;
      _goalController.text = widget.existingPlan!.phases.isNotEmpty
          ? widget.existingPlan!.phases.first.goal
          : widget.existingPlan!.title;

      // Parse frequency
      if (widget.existingPlan!.frequency.contains('Week')) {
        _selectedPeriod = 'Weekly';
      } else if (widget.existingPlan!.frequency.contains('Month')) {
        _selectedPeriod = 'Monthly';
      } else {
        _selectedPeriod = 'Daily';
      }

      // Try to parse count
      final match =
          RegExp(r'(\d+)x').firstMatch(widget.existingPlan!.frequency);
      if (match != null) {
        _selectedCount = int.parse(match.group(1)!);
      }

      _selectedDuration = widget.existingPlan!.durationWeeks;

      _updateScheduleControllers();

      // Populate schedule times if available
      if (widget.existingPlan!.phases.isNotEmpty) {
        final phase = widget.existingPlan!.phases.first;
        if (phase.schedule != null && phase.schedule!.isNotEmpty) {
          for (int i = 0;
              i < phase.schedule!.length && i < _scheduleControllers.length;
              i++) {
            _scheduleControllers[i].text = phase.schedule![i];
          }
        }
      }
    } else {
      // Default init
      _updateScheduleControllers();
    }
  }

  @override
  void dispose() {
    _goalController.dispose();
    _domainController.dispose();
    for (var c in _scheduleControllers) c.dispose();
    super.dispose();
  }

  void _updateScheduleControllers() {
    // Generate slots based on period and count
    int count = 0;
    if (_selectedPeriod == 'Daily' || _selectedPeriod == 'Weekly') {
      count = _selectedCount;
    }

    // Adjust controller list size
    if (_scheduleControllers.length < count) {
      for (int i = _scheduleControllers.length; i < count; i++) {
        _scheduleControllers.add(TextEditingController());
      }
    } else if (_scheduleControllers.length > count) {
      while (_scheduleControllers.length > count) {
        _scheduleControllers.last.dispose();
        _scheduleControllers.removeLast();
      }
    }
  }

  Future<void> _pickTime(
      BuildContext context, TextEditingController controller) async {
    final TimeOfDay? picked = await showTimePicker(
      context: context,
      initialTime: TimeOfDay.now(),
      builder: (context, child) {
        return MediaQuery(
          data: MediaQuery.of(context).copyWith(alwaysUse24HourFormat: true),
          child: child!,
        );
      },
    );

    if (picked != null) {
      final String hour = picked.hour.toString().padLeft(2, '0');
      final String minute = picked.minute.toString().padLeft(2, '0');
      controller.text = "$hour:$minute";
    }
  }

  Future<void> _pickDayTime(
      BuildContext context, TextEditingController controller) async {
    String selectedDay = 'Monday';
    TimeOfDay selectedTime = TimeOfDay.now();

    await showModalBottomSheet(
      context: context,
      backgroundColor: AppColors.surface,
      shape: const RoundedRectangleBorder(
        borderRadius: BorderRadius.vertical(top: Radius.circular(24)),
      ),
      builder: (BuildContext context) {
        return StatefulBuilder(
          builder: (context, setModalState) {
            return Padding(
              padding: const EdgeInsets.all(24.0),
              child: Column(
                mainAxisSize: MainAxisSize.min,
                crossAxisAlignment: CrossAxisAlignment.start,
                children: [
                  const Text("Select Day & Time",
                      style:
                          TextStyle(fontSize: 18, fontWeight: FontWeight.bold)),
                  const SizedBox(height: 16),
                  DropdownButtonFormField<String>(
                    value: selectedDay,
                    decoration: InputDecoration(
                      labelText: 'Day',
                      filled: true,
                      fillColor: AppColors.background,
                      border: OutlineInputBorder(
                          borderRadius: BorderRadius.circular(12),
                          borderSide: BorderSide.none),
                    ),
                    items: [
                      'Monday',
                      'Tuesday',
                      'Wednesday',
                      'Thursday',
                      'Friday',
                      'Saturday',
                      'Sunday'
                    ]
                        .map((day) =>
                            DropdownMenuItem(value: day, child: Text(day)))
                        .toList(),
                    onChanged: (val) {
                      setModalState(() => selectedDay = val!);
                    },
                  ),
                  const SizedBox(height: 16),
                  ListTile(
                    title: const Text("Time"),
                    trailing: Container(
                      padding: const EdgeInsets.symmetric(
                          horizontal: 12, vertical: 8),
                      decoration: BoxDecoration(
                        color: AppColors.background,
                        borderRadius: BorderRadius.circular(8),
                      ),
                      child: Text(
                        "${selectedTime.hour.toString().padLeft(2, '0')}:${selectedTime.minute.toString().padLeft(2, '0')}",
                        style: const TextStyle(fontWeight: FontWeight.bold),
                      ),
                    ),
                    onTap: () async {
                      final TimeOfDay? picked = await showTimePicker(
                        context: context,
                        initialTime: selectedTime,
                        builder: (context, child) {
                          return MediaQuery(
                            data: MediaQuery.of(context)
                                .copyWith(alwaysUse24HourFormat: true),
                            child: child!,
                          );
                        },
                      );
                      if (picked != null) {
                        setModalState(() => selectedTime = picked);
                      }
                    },
                  ),
                  const SizedBox(height: 24),
                  SizedBox(
                    width: double.infinity,
                    child: ElevatedButton(
                      onPressed: () {
                        controller.text =
                            "$selectedDay @ ${selectedTime.hour.toString().padLeft(2, '0')}:${selectedTime.minute.toString().padLeft(2, '0')}";
                        Navigator.pop(context);
                      },
                      style: ElevatedButton.styleFrom(
                        backgroundColor: AppColors.primary,
                        foregroundColor: Colors.white,
                        padding: const EdgeInsets.symmetric(vertical: 16),
                        shape: RoundedRectangleBorder(
                            borderRadius: BorderRadius.circular(12)),
                      ),
                      child: const Text("Confirm"),
                    ),
                  ),
                  const SizedBox(height: 16), // Padding for bottom
                ],
              ),
            );
          },
        );
      },
    );
  }

  @override
  Widget build(BuildContext context) {
    bool isCustom = _selectedCategory == 'custom';
    final keyboardPadding = MediaQuery.of(context).viewInsets.bottom;

    return Padding(
      padding: EdgeInsets.only(bottom: keyboardPadding),
      child: Container(
        padding: const EdgeInsets.all(24.0),
        child: SingleChildScrollView(
          child: Form(
            key: _formKey,
            child: Column(
              mainAxisSize: MainAxisSize.min,
              crossAxisAlignment: CrossAxisAlignment.start,
              children: [
                // Handle bar
                Center(
                  child: Container(
                    width: 40,
                    height: 4,
                    decoration: BoxDecoration(
                      color: Colors.grey[300],
                      borderRadius: BorderRadius.circular(2),
                    ),
                  ),
                ),
                const SizedBox(height: 20),

                Text(
                  _isEditing ? 'Edit Blueprint' : 'Draft New Blueprint',
                  style: TextStyle(
                    color: AppColors.textPrimary,
                    fontSize: 20,
                    fontWeight: FontWeight.bold,
                    fontFamily: 'Inter',
                  ),
                ),
                const SizedBox(height: 24),

                // Category Label
                const Text(
                  'DOMAIN',
                  style: TextStyle(
                    color: Colors.grey,
                    fontSize: 12,
                    fontWeight: FontWeight.bold,
                    letterSpacing: 1.0,
                  ),
                ),
                const SizedBox(height: 12),

                // Category Selector
                Wrap(
                  spacing: 8,
                  runSpacing: 8,
                  children: _categories.entries.map((e) {
                    final isSelected = _selectedCategory == e.key;
                    return FilterChip(
                      label: Text(
                          e.key == 'custom' ? 'CUSTOM' : e.key.toUpperCase()),
                      selected: isSelected,
                      onSelected: (selected) {
                        setState(() {
                          _selectedCategory = e.key;
                          // Reset frequency to defaults
                          _selectedPeriod = 'Daily';
                          _selectedCount = 1;
                          if (_selectedCategory == 'fitness')
                            _selectedCount = 3;
                          _updateScheduleControllers();
                        });
                      },
                      checkmarkColor: Colors.white,
                      selectedColor: AppColors.primary,
                      backgroundColor: AppColors.background,
                      labelStyle: TextStyle(
                        color:
                            isSelected ? Colors.white : AppColors.textSecondary,
                        fontWeight:
                            isSelected ? FontWeight.bold : FontWeight.normal,
                        fontSize: 12,
                      ),
                      padding: const EdgeInsets.symmetric(
                          horizontal: 4, vertical: 0),
                      shape: RoundedRectangleBorder(
                          borderRadius: BorderRadius.circular(8),
                          side: BorderSide(
                              color: isSelected
                                  ? Colors.transparent
                                  : Colors.grey.withOpacity(0.2))),
                    );
                  }).toList(),
                ),

                // Custom Domain Input
                if (isCustom) ...[
                  const SizedBox(height: 16),
                  TextFormField(
                    controller: _domainController,
                    style: TextStyle(color: AppColors.textPrimary),
                    validator: (value) {
                      if (isCustom &&
                          (value == null || value.trim().length < 2)) {
                        return 'Please enter a domain';
                      }
                      return null;
                    },
                    decoration: InputDecoration(
                      labelText: 'Custom Domain',
                      labelStyle: TextStyle(color: AppColors.textSecondary),
                      hintText: 'e.g. Music, Art, Career',
                      hintStyle: TextStyle(
                          color: AppColors.textSecondary.withOpacity(0.5)),
                      filled: true,
                      fillColor: AppColors.background,
                      border: OutlineInputBorder(
                        borderRadius: BorderRadius.circular(12),
                        borderSide: BorderSide.none,
                      ),
                      focusedBorder: OutlineInputBorder(
                        borderRadius: BorderRadius.circular(12),
                        borderSide: BorderSide(color: AppColors.primary),
                      ),
                      contentPadding: const EdgeInsets.symmetric(
                          horizontal: 16, vertical: 16),
                    ),
                  ),
                ],

                const SizedBox(height: 24),

                // Plan Name Input (Hidden for simpliciy - Auto-derived)
                /*
                const Text(
                  'PLAN NAME',
                  style: TextStyle(
                    color: Colors.grey,
                    fontSize: 12,
                    fontWeight: FontWeight.bold,
                    letterSpacing: 1.0,
                  ),
                ),
                const SizedBox(height: 8),
                TextFormField(
                  controller: _nameController,
                  style: const TextStyle(
                      color: AppColors.textPrimary, fontWeight: FontWeight.w600),
                  decoration: InputDecoration(
                    hintText: 'e.g. My Morning Routine',
                    hintStyle: TextStyle(
                        color: AppColors.textSecondary.withOpacity(0.5)),
                    filled: true,
                    fillColor: AppColors.background,
                    border: OutlineInputBorder(
                      borderRadius: BorderRadius.circular(12),
                      borderSide: BorderSide.none,
                    ),
                    contentPadding: const EdgeInsets.symmetric(
                        horizontal: 16, vertical: 16),
                  ),
                  validator: (value) {
                    if (value == null || value.isEmpty) {
                      return 'Please enter a name';
                    }
                    return null;
                  },
                ),
                const SizedBox(height: 24),
                */

                // Duration Dropdown (New)
                const Text(
                  'DURATION',
                  style: TextStyle(
                    color: Colors.grey,
                    fontSize: 12,
                    fontWeight: FontWeight.bold,
                    letterSpacing: 1.0,
                  ),
                ),
                const SizedBox(height: 8),
                DropdownButtonFormField<int>(
                  value: _selectedDuration,
                  style: const TextStyle(
                      color: AppColors.textPrimary,
                      fontWeight: FontWeight.w600,
                      fontSize: 16),
                  dropdownColor: AppColors.surface,
                  decoration: InputDecoration(
                    filled: true,
                    fillColor: AppColors.background,
                    border: OutlineInputBorder(
                      borderRadius: BorderRadius.circular(12),
                      borderSide: BorderSide.none,
                    ),
                    contentPadding: const EdgeInsets.symmetric(
                        horizontal: 16, vertical: 16),
                  ),
                  items: [
                    DropdownMenuItem(
                        value: 1,
                        child: Text("1 Week (Short)",
                            style: TextStyle(color: AppColors.textPrimary))),
                    DropdownMenuItem(
                        value: 2,
                        child: Text("2 Weeks",
                            style: TextStyle(color: AppColors.textPrimary))),
                    DropdownMenuItem(
                        value: 4,
                        child: Text("4 Weeks",
                            style: TextStyle(color: AppColors.textPrimary))),
                    DropdownMenuItem(
                        value: 8,
                        child: Text("8 Weeks",
                            style: TextStyle(color: AppColors.textPrimary))),
                    DropdownMenuItem(
                        value: 12,
                        child: Text("12 Weeks",
                            style: TextStyle(color: AppColors.textPrimary))),
                    DropdownMenuItem(
                        value: 52,
                        child: Text("Ongoing (1 Year)",
                            style: TextStyle(color: AppColors.textPrimary))),
                  ],
                  onChanged: (val) {
                    setState(() {
                      _selectedDuration = val!;
                    });
                  },
                ),
                const SizedBox(height: 8),
                Padding(
                  padding: const EdgeInsets.only(left: 4.0),
                  child: Text(
                    () {
                      final now = DateTime.now();
                      final end =
                          now.add(Duration(days: _selectedDuration * 7));
                      final dateFormat = DateFormat('MMM d, y');
                      return "Schedule: ${dateFormat.format(now)} - ${dateFormat.format(end)}";
                    }(),
                    style: TextStyle(
                      color: AppColors.primary,
                      fontSize: 12,
                      fontWeight: FontWeight.bold,
                    ),
                  ),
                ),
                const SizedBox(height: 24),

                // 1. Period Selection
                Row(
                  children: [
                    Expanded(
                      flex: 2,
                      child: Column(
                        crossAxisAlignment: CrossAxisAlignment.start,
                        children: [
                          const Text('PERIOD',
                              style: TextStyle(
                                  color: Colors.grey,
                                  fontSize: 10,
                                  fontWeight: FontWeight.bold)),
                          const SizedBox(height: 4),
                          DropdownButtonFormField<String>(
                            value: _selectedPeriod,
                            style: const TextStyle(
                                color: AppColors.textPrimary,
                                fontWeight: FontWeight.w600,
                                fontSize: 14),
                            dropdownColor: AppColors.surface,
                            decoration: InputDecoration(
                              filled: true,
                              fillColor: AppColors.background,
                              border: OutlineInputBorder(
                                  borderRadius: BorderRadius.circular(12),
                                  borderSide: BorderSide.none),
                              contentPadding: const EdgeInsets.symmetric(
                                  horizontal: 12, vertical: 12),
                            ),
                            items: ['Daily', 'Weekly', 'Monthly']
                                .map((p) => DropdownMenuItem(
                                    value: p,
                                    child: Text(p,
                                        style: TextStyle(fontSize: 14))))
                                .toList(),
                            onChanged: (val) {
                              setState(() {
                                _selectedPeriod = val!;
                                _updateScheduleControllers();
                              });
                            },
                          ),
                        ],
                      ),
                    ),
                    const SizedBox(width: 12),
                    Expanded(
                      flex: 1,
                      child: Column(
                        crossAxisAlignment: CrossAxisAlignment.start,
                        children: [
                          const Text('FREQUENCY',
                              style: TextStyle(
                                  color: Colors.grey,
                                  fontSize: 10,
                                  fontWeight: FontWeight.bold)),
                          const SizedBox(height: 4),
                          DropdownButtonFormField<int>(
                            value: _selectedCount,
                            style: const TextStyle(
                                color: AppColors.textPrimary,
                                fontWeight: FontWeight.w600,
                                fontSize: 14),
                            dropdownColor: AppColors.surface,
                            decoration: InputDecoration(
                              filled: true,
                              fillColor: AppColors.background,
                              border: OutlineInputBorder(
                                  borderRadius: BorderRadius.circular(12),
                                  borderSide: BorderSide.none),
                              contentPadding: const EdgeInsets.symmetric(
                                  horizontal: 12, vertical: 12),
                            ),
                            items: [1, 2, 3, 4, 5, 6]
                                .map((c) => DropdownMenuItem(
                                    value: c,
                                    child: Text("${c}x",
                                        style: TextStyle(
                                            fontSize: 14,
                                            color: AppColors.textPrimary))))
                                .toList(),
                            onChanged: (val) {
                              setState(() {
                                _selectedCount = val!;
                                _updateScheduleControllers();
                              });
                            },
                          ),
                        ],
                      ),
                    ),
                  ],
                ),

                // Dynamic Schedule Time Slots
                if (_scheduleControllers.isNotEmpty) ...[
                  const SizedBox(height: 16),
                  Text("SCHEDULE DETAILS",
                      style: TextStyle(
                          color: Colors.grey,
                          fontSize: 12,
                          fontWeight: FontWeight.bold,
                          letterSpacing: 1.0)),
                  const SizedBox(height: 8),
                  ...List.generate(_scheduleControllers.length, (index) {
                    return Padding(
                      padding: const EdgeInsets.only(bottom: 8.0),
                      child: TextFormField(
                        controller: _scheduleControllers[index],
                        style: const TextStyle(
                            color: AppColors.textPrimary,
                            fontWeight: FontWeight.w600),
                        readOnly: true, // Make read-only to force picker usage
                        onTap: () async {
                          if (_selectedPeriod == 'Daily') {
                            await _pickTime(
                                context, _scheduleControllers[index]);
                          } else if (_selectedPeriod == 'Weekly') {
                            await _pickDayTime(
                                context, _scheduleControllers[index]);
                          } else {
                            // Monthly or others can remain manual or add date picker later
                          }
                        },
                        decoration: InputDecoration(
                          labelText: _selectedPeriod == 'Weekly'
                              ? 'Day & Time ${index + 1}'
                              : 'Time ${index + 1}',
                          hintText: _selectedPeriod == 'Weekly'
                              ? 'Tap to select Day & Time'
                              : 'Tap to select Time',
                          prefixIcon: Icon(Icons.access_time,
                              size: 18, color: AppColors.primary),
                          filled: true,
                          fillColor: AppColors.background,
                          border: OutlineInputBorder(
                            borderRadius: BorderRadius.circular(12),
                            borderSide: BorderSide.none,
                          ),
                          contentPadding: const EdgeInsets.symmetric(
                              horizontal: 16, vertical: 0),
                        ),
                        validator: (value) {
                          if (value == null || value.isEmpty) {
                            return 'Time is required';
                          }
                          return null;
                        },
                      ),
                    );
                  }),
                ],

                // Fallback Generic Schedule Details
                if (_scheduleControllers.isEmpty &&
                    (_selectedPeriod == 'Daily' || _selectedCount >= 1)) ...[
                  const SizedBox(height: 16),
                  TextFormField(
                    style: const TextStyle(
                        color: AppColors.textPrimary,
                        fontWeight: FontWeight.w600),
                    decoration: InputDecoration(
                      labelText: 'Schedule Details (Optional)',
                      hintText: 'e.g. 8 AM pre-breakfast, After dinner',
                      hintStyle: TextStyle(
                          color: AppColors.textSecondary.withOpacity(0.5)),
                      filled: true,
                      fillColor: AppColors.background,
                      border: OutlineInputBorder(
                        borderRadius: BorderRadius.circular(12),
                        borderSide: BorderSide.none,
                      ),
                      contentPadding: const EdgeInsets.symmetric(
                          horizontal: 16, vertical: 16),
                    ),
                    onChanged: (val) {
                      // Store temporarily, we'll append on submit
                      _domainController.text =
                          val; // Reusing domain controller as temp storage for schedule notes
                    },
                  ),
                ],

                const SizedBox(height: 24),

                // Goal Input
                const Text(
                  'WHAT IS YOUR GOAL?',
                  style: TextStyle(
                    color: Colors.grey,
                    fontSize: 12,
                    fontWeight: FontWeight.bold,
                    letterSpacing: 1.0,
                  ),
                ),
                const SizedBox(height: 8),
                TextFormField(
                  controller: _goalController,
                  autofocus:
                      !isCustom, // Autofocus only if not custom (avoids jumping)
                  style: const TextStyle(
                      color: AppColors.textPrimary,
                      fontWeight: FontWeight.w600),
                  validator: (value) {
                    if (value == null || value.trim().length < 3) {
                      return 'Please enter a specific goal';
                    }
                    return null;
                  },
                  maxLines: 2,
                  decoration: InputDecoration(
                    hintText: 'e.g. Run 5km without stopping',
                    hintStyle: TextStyle(
                        color: AppColors.textSecondary.withOpacity(0.5)),
                    filled: true,
                    fillColor: AppColors.background,
                    border: OutlineInputBorder(
                      borderRadius: BorderRadius.circular(12),
                      borderSide: BorderSide.none,
                    ),
                    focusedBorder: OutlineInputBorder(
                      borderRadius: BorderRadius.circular(12),
                      borderSide: BorderSide(color: AppColors.primary),
                    ),
                  ),
                ),
                const SizedBox(height: 8),

                // AI Polish Action
                if (_goalController.text.isNotEmpty && !_isPolishing)
                  Align(
                    alignment: Alignment.centerRight,
                    child: TextButton.icon(
                      onPressed: () async {
                        setState(() => _isPolishing = true);
                        try {
                          // Call API
                          final response = await widget.inputService
                              .enhanceGoal(_goalController.text);

                          if (response.success && response.data != null) {
                            setState(() {
                              _goalController.text = response.data!.refinedGoal;
                              // Also update hidden name state if needed, though hidden
                              _nameController.text = response.data!.shortName;
                            });
                            ScaffoldMessenger.of(context).showSnackBar(
                              const SnackBar(
                                content: Text("✨ Goal polished by AI!"),
                                backgroundColor: AppColors.primary,
                              ),
                            );
                          }
                        } catch (e) {
                          // Fail silently or show toast
                          print("Enhance failed: $e");
                        } finally {
                          if (mounted) setState(() => _isPolishing = false);
                        }
                      },
                      icon: const Icon(Icons.auto_awesome, size: 16),
                      label: const Text("Polish with AI"),
                      style: TextButton.styleFrom(
                        foregroundColor: AppColors.primary,
                      ),
                    ),
                  ),
                if (_isPolishing)
                  const Align(
                    alignment: Alignment.centerRight,
                    child: Padding(
                      padding: EdgeInsets.all(8.0),
                      child: SizedBox(
                        width: 16,
                        height: 16,
                        child: CircularProgressIndicator(strokeWidth: 2),
                      ),
                    ),
                  ),

                const SizedBox(height: 24),

                // Actions
                Row(
                  children: [
                    Expanded(
                        child: TextButton(
                      onPressed: () => Navigator.pop(context),
                      style: TextButton.styleFrom(
                        foregroundColor: AppColors.textSecondary,
                      ),
                      child: const Text('Cancel'),
                    )),
                    const SizedBox(width: 8),
                    Expanded(
                        child: ElevatedButton(
                      onPressed: () {
                        if (_formKey.currentState!.validate()) {
                          // Use domain controller if custom, else use selected category
                          final category = isCustom
                              ? _domainController.text.trim()
                              : _selectedCategory;

                          // Build final frequency string
                          String frequency =
                              "${_selectedCount}x / $_selectedPeriod";
                          if (_selectedCount == 1) {
                            if (_selectedPeriod == 'Daily') frequency = 'Daily';
                            if (_selectedPeriod == 'Weekly')
                              frequency = 'Weekly';
                            if (_selectedPeriod == 'Monthly')
                              frequency = 'Monthly';
                          }

                          // Append schedule details
                          String goal = _goalController.text;

                          // 1. Structured Multi-Time
                          if (_scheduleControllers.isNotEmpty) {
                            List<String> times = _scheduleControllers
                                .map((c) => c.text.trim())
                                .where((t) => t.isNotEmpty)
                                .toList();
                            if (times.isNotEmpty) {
                              goal += " (${times.join(', ')})";
                            }
                          }
                          // 2. Generic Single Note (Fallback)
                          else if (_domainController.text.isNotEmpty &&
                              !isCustom) {
                            goal += " (${_domainController.text})";
                          }

                          // Validate Time Slots
                          Set<String> uniqueTimes = {};
                          for (int i = 0;
                              i < _scheduleControllers.length;
                              i++) {
                            String time = _scheduleControllers[i].text.trim();
                            if (time.isEmpty) {
                              ScaffoldMessenger.of(context).showSnackBar(
                                SnackBar(
                                  content: Text(
                                      "Please set a time for slot ${i + 1}"),
                                  backgroundColor: Colors.red,
                                ),
                              );
                              return;
                            }
                            if (uniqueTimes.contains(time)) {
                              ScaffoldMessenger.of(context).showSnackBar(
                                const SnackBar(
                                  content: Text(
                                      "Duplicate time slots are not allowed. Please select distinct times."),
                                  backgroundColor: Colors.red,
                                ),
                              );
                              return;
                            }
                            uniqueTimes.add(time);
                          }

                          // Capture schedule details
                          List<String> scheduleTimes =
                              _scheduleControllers.map((c) => c.text).toList();

                          // If using fallback schedule box
                          String scheduleDetails = '';
                          if (_scheduleControllers.isEmpty &&
                              _domainController.text.isNotEmpty &&
                              !isCustom) {
                            // _domainController here is temporarily used for generic schedule details if not custom category
                            // This is a bit hacky, but consistent with existing logic.
                            // Ideally we should have a dedicated _scheduleNoteController.
                            // But for now, let's just use what we have.
                            scheduleDetails = _domainController.text;
                          } else if (scheduleTimes.isNotEmpty) {
                            scheduleDetails = scheduleTimes.join(
                                '|'); // Send as pipe-separated string for simplicity
                          }

                          Navigator.pop(context, {
                            'category': category,
                            'name': _nameController.text.isNotEmpty
                                ? _nameController.text
                                : goal, // Fallback to goal if name hidden/empty
                            'goal': goal,
                            'frequency': frequency,
                            'duration': _selectedDuration.toString(),
                            'schedule': scheduleDetails,
                          });
                        }
                      },
                      style: ElevatedButton.styleFrom(
                        backgroundColor: AppColors.primary,
                        foregroundColor: Colors.white,
                        elevation: 0,
                        shape: RoundedRectangleBorder(
                            borderRadius: BorderRadius.circular(12)),
                        padding: const EdgeInsets.symmetric(vertical: 16),
                      ),
                      child: Text(
                          _isEditing ? 'Update Blueprint' : 'Create Blueprint'),
                    )),
                  ],
                )
              ],
            ),
          ),
        ),
      ),
    );
  }
}

class _EmptyState extends StatelessWidget {
  final VoidCallback onGenerate;
  const _EmptyState({required this.onGenerate});

  @override
  Widget build(BuildContext context) {
    return Center(
      child: Column(
        mainAxisAlignment: MainAxisAlignment.center,
        children: [
          Icon(Icons.rocket_launch,
              size: 64, color: AppColors.textSecondary.withOpacity(0.3)),
          const SizedBox(height: 16),
          Text(
            'No Active Blueprints',
            style: TextStyle(
                color: AppColors.textPrimary,
                fontSize: 20,
                fontWeight: FontWeight.bold),
          ),
          const SizedBox(height: 8),
          Text(
            'Design a blueprint to start building\nyour better self scientifically.',
            textAlign: TextAlign.center,
            style: TextStyle(color: AppColors.textSecondary),
          ),
          const SizedBox(height: 24),
          ElevatedButton(
            onPressed: onGenerate,
            style: ElevatedButton.styleFrom(
              backgroundColor: AppColors.primary,
              foregroundColor: Colors.white,
              padding: const EdgeInsets.symmetric(horizontal: 32, vertical: 16),
            ),
            child: const Text("Design First Blueprint"),
          )
        ],
      ),
    );
  }
}
