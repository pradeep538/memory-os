import 'package:flutter/material.dart';
import 'package:provider/provider.dart';
import '../../config/app_colors.dart';
import '../../config/app_typography.dart';
import '../../config/app_spacing.dart';
import '../../providers/app_provider.dart';
import '../../models/entity_models.dart';

class EntitiesScreen extends StatefulWidget {
  const EntitiesScreen({super.key});

  @override
  State<EntitiesScreen> createState() => _EntitiesScreenState();
}

class _EntitiesScreenState extends State<EntitiesScreen> {
  bool _isLoading = true;
  List<Entity> _entities = [];

  @override
  void initState() {
    super.initState();
    _loadEntities();
  }

  Future<void> _loadEntities() async {
    final service = context.read<AppProvider>().entityService;
    final response = await service.getTopEntities();

    if (mounted) {
      setState(() {
        _isLoading = false;
        if (response.success && response.data != null) {
          _entities = response.data!;
        }
      });
    }
  }

  @override
  Widget build(BuildContext context) {
    return Scaffold(
      backgroundColor: AppColors.background,
      appBar: AppBar(
        title: const Text('Entities'),
        backgroundColor: AppColors.surface,
        elevation: 0,
        iconTheme: const IconThemeData(color: AppColors.textPrimary),
        titleTextStyle: AppTypography.h4.copyWith(color: AppColors.textPrimary),
      ),
      body: _isLoading
          ? const Center(child: CircularProgressIndicator())
          : _entities.isEmpty
              ? _buildEmptyState()
              : _buildEntityList(),
    );
  }

  Widget _buildEmptyState() {
    return Center(
      child: Padding(
        padding: const EdgeInsets.all(AppSpacing.xl),
        child: Column(
          mainAxisAlignment: MainAxisAlignment.center,
          children: [
            const Icon(Icons.hub_rounded,
                size: 64, color: AppColors.textTertiary),
            const SizedBox(height: AppSpacing.md),
            Text('No entities found yet', style: AppTypography.h3),
            const SizedBox(height: AppSpacing.sm),
            Text(
              'Keep logging to build your knowledge graph.',
              style:
                  AppTypography.body.copyWith(color: AppColors.textSecondary),
              textAlign: TextAlign.center,
            ),
          ],
        ),
      ),
    );
  }

  Widget _buildEntityList() {
    // Group by type
    final people = _entities.where((e) => e.type == 'person').toList();
    final topics = _entities.where((e) => e.type != 'person').toList();

    return SingleChildScrollView(
      padding: const EdgeInsets.all(AppSpacing.md),
      child: Column(
        crossAxisAlignment: CrossAxisAlignment.start,
        children: [
          if (people.isNotEmpty) ...[
            Text('Top People', style: AppTypography.h4),
            const SizedBox(height: AppSpacing.md),
            _buildGrid(people),
            const SizedBox(height: AppSpacing.xl),
          ],
          if (topics.isNotEmpty) ...[
            Text('Top Topics', style: AppTypography.h4),
            const SizedBox(height: AppSpacing.md),
            _buildGrid(topics),
          ],
        ],
      ),
    );
  }

  Widget _buildGrid(List<Entity> entities) {
    return GridView.builder(
      shrinkWrap: true,
      physics: const NeverScrollableScrollPhysics(),
      gridDelegate: const SliverGridDelegateWithFixedCrossAxisCount(
        crossAxisCount: 2,
        crossAxisSpacing: AppSpacing.md,
        mainAxisSpacing: AppSpacing.md,
        childAspectRatio: 1.5,
      ),
      itemCount: entities.length,
      itemBuilder: (context, index) {
        return _buildEntityCard(entities[index]);
      },
    );
  }

  Widget _buildEntityCard(Entity entity) {
    return Container(
      padding: const EdgeInsets.all(AppSpacing.md),
      decoration: BoxDecoration(
        color: AppColors.surface,
        borderRadius: BorderRadius.circular(16),
        border: Border.all(color: AppColors.border),
      ),
      child: Column(
        crossAxisAlignment: CrossAxisAlignment.start,
        mainAxisAlignment: MainAxisAlignment.center,
        children: [
          Row(
            children: [
              Container(
                padding: const EdgeInsets.all(8),
                decoration: BoxDecoration(
                  color: AppColors.primaryLight.withOpacity(0.2),
                  shape: BoxShape.circle,
                ),
                child: Icon(
                  entity.type == 'person' ? Icons.person : Icons.tag,
                  size: 20,
                  color: AppColors.primary,
                ),
              ),
              const SizedBox(width: AppSpacing.sm),
              Expanded(
                child: Text(
                  entity.name,
                  style:
                      AppTypography.body.copyWith(fontWeight: FontWeight.bold),
                  maxLines: 1,
                  overflow: TextOverflow.ellipsis,
                ),
              ),
            ],
          ),
          const SizedBox(height: AppSpacing.sm),
          Text(
            '${entity.mentionCount} mentions',
            style: AppTypography.caption,
          ),
        ],
      ),
    );
  }
}
