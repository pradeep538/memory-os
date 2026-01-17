import 'package:flutter/material.dart';
import '../../models/plan_model.dart';
import '../../services/plans_service.dart';
import '../../services/api_client.dart';
import '../../config/app_colors.dart';

class PlansScreen extends StatefulWidget {
  const PlansScreen({Key? key}) : super(key: key);

  @override
  _PlansScreenState createState() => _PlansScreenState();
}

class _PlansScreenState extends State<PlansScreen> {
  late PlansService _plansService;
  List<ActionPlan> _plans = [];
  bool _isLoading = true;

  @override
  void initState() {
    super.initState();
    // Instantiate service locally for now
    _plansService = PlansService(ApiClient());
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
      builder: (context) => _CreatePlanDialog(),
    );

    if (result != null) {
      setState(() => _isLoading = true);
      final newPlan = await _plansService.generatePlan(
        result['category']!,
        result['goal']!,
        result['frequency']!,
      );

      if (newPlan != null && mounted) {
        // Refresh list
        _loadPlans();
        ScaffoldMessenger.of(context).showSnackBar(
          const SnackBar(content: Text('Plan generated successfully! 🚀')),
        );
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

  @override
  Widget build(BuildContext context) {
    return Scaffold(
      backgroundColor: AppColors.background,
      appBar: AppBar(
        title: const Text('Action Plans'),
        backgroundColor: Colors.transparent,
        elevation: 0,
        foregroundColor: AppColors.textPrimary,
      ),
      floatingActionButton: FloatingActionButton.extended(
        onPressed: _generatePlan,
        label: const Text('New Plan'),
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
                    return ActionPlanCard(plan: _plans[index]);
                  },
                ),
    );
  }
}

class ActionPlanCard extends StatelessWidget {
  final ActionPlan plan;

  const ActionPlanCard({Key? key, required this.plan}) : super(key: key);

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
            // Header
            Row(
              mainAxisAlignment: MainAxisAlignment.spaceBetween,
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
                Container(
                  padding:
                      const EdgeInsets.symmetric(horizontal: 8, vertical: 4),
                  decoration: BoxDecoration(
                    color: AppColors.background,
                    borderRadius: BorderRadius.circular(8),
                  ),
                  child: Text(
                    'Week ${plan.currentWeek}',
                    style: TextStyle(
                      color: AppColors.primary,
                      fontSize: 12,
                      fontWeight: FontWeight.bold,
                    ),
                  ),
                ),
              ],
            ),
            const SizedBox(height: 8),

            // Phase Goal
            if (currentPhase != null) ...[
              Text(
                currentPhase.goal,
                style: TextStyle(color: AppColors.textSecondary, fontSize: 14),
              ),
              const SizedBox(height: 16),
            ],

            // Progress Bar
            ClipRRect(
              borderRadius: BorderRadius.circular(8),
              child: LinearProgressIndicator(
                value: progressPercent,
                minHeight: 12,
                backgroundColor: AppColors.background,
                color: AppColors.primary,
              ),
            ),
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
              )
          ],
        ),
      ),
    );
  }
}

class _CreatePlanDialog extends StatefulWidget {
  @override
  __CreatePlanDialogState createState() => __CreatePlanDialogState();
}

class __CreatePlanDialogState extends State<_CreatePlanDialog> {
  final _formKey = GlobalKey<FormState>();
  String _selectedCategory = 'fitness';
  final TextEditingController _goalController = TextEditingController();
  final TextEditingController _domainController = TextEditingController();
  String _selectedFrequency = '3x / Week'; // Default frequency

  final Map<String, IconData> _categories = {
    'fitness': Icons.fitness_center,
    'finance': Icons.attach_money,
    'routine': Icons.schedule,
    'mindfulness': Icons.self_improvement,
    'custom': Icons.edit,
  };

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
                  'New Action Plan',
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
                        setState(() => _selectedCategory = e.key);
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
                      labelText: 'Specify Domain',
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

                // Frequency Dropdown
                const Text(
                  'FREQUENCY',
                  style: TextStyle(
                    color: Colors.grey,
                    fontSize: 12,
                    fontWeight: FontWeight.bold,
                    letterSpacing: 1.0,
                  ),
                ),
                const SizedBox(height: 8),
                DropdownButtonFormField<String>(
                  value: _selectedFrequency,
                  dropdownColor: AppColors.surface,
                  style: TextStyle(color: AppColors.textPrimary),
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
                  items:
                      ['Daily', '3x / Week', 'Weekly', 'Bi-weekly', 'Monthly']
                          .map((freq) => DropdownMenuItem(
                                value: freq,
                                child: Text(freq),
                              ))
                          .toList(),
                  onChanged: (val) => setState(() => _selectedFrequency = val!),
                ),

                const SizedBox(height: 24),

                // Goal Input
                const Text(
                  'GOAL',
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
                  style: TextStyle(color: AppColors.textPrimary),
                  validator: (value) {
                    if (value == null || value.trim().length < 3) {
                      return 'Please enter a specific goal';
                    }
                    return null;
                  },
                  maxLines: 2,
                  minLines: 1,
                  decoration: InputDecoration(
                    hintText: 'e.g., Run 5k, Save \$500',
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
                const SizedBox(height: 32),

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

                          Navigator.pop(context, {
                            'category': category,
                            'goal': _goalController.text,
                            'frequency': _selectedFrequency // Include Frequency
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
                      child: const Text('Generate Plan'),
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
            'No Active Plans',
            style: TextStyle(
                color: AppColors.textPrimary,
                fontSize: 20,
                fontWeight: FontWeight.bold),
          ),
          const SizedBox(height: 8),
          Text(
            'Create a plan to start tracking\nyour goals scientifically.',
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
            child: const Text("Create First Plan"),
          )
        ],
      ),
    );
  }
}
